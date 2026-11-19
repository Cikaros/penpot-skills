---
name: penpot-mcp
description: 通过 Penpot MCP server 与 Penpot 插件操作设计文件（execute_code，以及部署允许时的 high_level_overview、penpot_api_info、export_shape、import_image），用于检查或修改 Penpot 页面、搭建与修复布局、搭建多屏原型与导航接线、导出图形做视觉验收、导入图片，以及排查插件未连接、401/匿名会话、上传后图片空白等问题。Use when working with Penpot through MCP, editing Penpot designs programmatically, building multi-screen prototypes, or debugging Penpot MCP plugin connection and authentication failures.
---

# Penpot MCP 操作规范

目标：用尽量少的调用产出**可验收**的改动，不把错误数据静默写进设计文件。

核心原则：**先探测，再分支**。Penpot 的布局顺序、`atob`、查找范围在不同版本间变过，凭记忆写死必然踩坑。

## 0. 探测环境（一次调用）

```js
const t = v => typeof v;
const probe = fn => { try { return fn(); } catch (e) { return "ERR " + e; } };
return {
  version: penpot.version,
  naturalOrder: penpot.flags?.naturalChildOrdering,
  globals: { location: t(location), atob: t(atob), TextDecoder: t(TextDecoder) },
  layoutWait: t(penpot.waitForLayoutUpdate),
  utils: Object.getOwnPropertyNames(penpotUtils).filter(n => !["length","name","prototype"].includes(n)),
  user: probe(() => penpot.currentUser ? penpot.currentUser.id : null),
  pages: probe(() => penpotUtils.getPages().map(p => ({ id: p.id, name: p.name }))),
  selection: probe(() => penpot.selection.map(s => ({ id: s.id, name: s.name, type: s.type })))
};
```

- `user` 以 `ERR ... user:read` 开头 → 插件无用户权限，**不是未登录**；不要因此让用户重新登录。
- `location === "undefined"` → 不要写 `location.origin`，也不要碰 DOM。
- `naturalOrder === true` → 子元素数组顺序 = 视觉顺序（2.18.7 实测）。
- `layoutWait === "undefined"` → 当前版本没有官方等待函数；先插一个测试块、短轮询读 `y` 验证，再决定是否批量操作。
- `utils` 里没有 `atob` 但有 `base64ToByteArray` → 用后者解码。

## 1. 工具契约（随部署变化）

| 工具 | 关键点 |
|---|---|
| `execute_code(code)` | 必有。插件上下文执行 JS，单次 **30 秒硬超时** |
| `high_level_overview` | 可选。官方总览，一个会话读一次即可 |
| `penpot_api_info(type, member?)` | 可选。长文档只返回概述，需按 `member` 再查 |
| `export_shape(shapeId, format, mode, filePath?)` | 可选。`"selection"` = 当前选中第一个；`mode:"fill"` 仅 PNG |
| `import_image(filePath, x?, y?, width?, height?)` | 可选。仅本地模式，绝对路径 |

**工具清单以当前会话为准。** 只有 `execute_code` 时：导出用 `await shape.export({type:"png"})` 并返回字节长度/字节头自证；导入用 `base64 → bytes → uploadMediaData`。不要因为工具缺失就判定环境坏了。

`execute_code` 细节：

- 代码即函数体，用 `return` 返回；不返回就是 `undefined`。
- 可用全局：`penpot`、`penpotUtils`、`storage`、`console`、`fetch`、`atob`（版本相关）。
- `location`/`window`/`document`/`TextDecoder`/`Blob` 在 2.18.7 均不存在。
- 返回值 JSON 序列化；只返回 id/name/数值，不返回 shape 对象。
- `storage` 跨调用持久；普通变量不保留。

## 2. 铁律

1. **认证**：`userToken` 只属于 MCP 传输层；Penpot 后端只认 cookie `auth-token` 或 `Authorization` 头，不认 URL 查询参数。不要在 `execute_code` 里 `fetch('/api/rpc/...')` 或 `fetch('/assets/...')`，那条路拿不到会话。插件内读写一律走 `penpot.*`。
2. **插入**：统一 `parent.insertChild(index, shape)`；索引 0-based，2.18.7 下即视觉位置。不确定版本顺序时，先插一个测试块，`await penpot.waitForLayoutUpdate()` 后读 `y` 验证，再批量插入。
3. **等布局**：任何改子元素/改尺寸后，读坐标前先 `await penpot.waitForLayoutUpdate()`。未等待时新插入元素的 `y` 可能全是 0（实测）。
4. **几何**：`width/height` 只读 → `resize(w,h)`；`parentX/parentY` 只读 → `penpotUtils.setParentXY(shape,x,y)`；`bounds` 只读。
5. **文本**：`createText` 默认 `auto-width`，但**宽度只有 1px**；必须先 `resize(目标宽度, 10)` 再设 `growType="auto-height"`，否则文本按 1px 宽逐字换行（实测 14px 短句可测出 152px 高）。`resize()` 会把 `growType` 重置为 `"fixed"`，所以顺序不能反。
6. **z 序**：由 `children` 顺序决定，先背景后前景；调整用 `bringToFront/sendToBack/setParentIndex`。
7. **不发明样式**：只用已有 token / library / 组件；缺信息就问或留空，禁止自创颜色、字体、断点。
8. **不重复日志**：`return` 的数据不要再用 `console.log` 打一遍。
9. **图片验字节**：上传前查魔数（PNG/JPEG/GIF/WEBP），以 `<html`/`<!doc`/`{` 开头一律中止；上传后再查 `media.width/height` 非 0。
10. **命名归一化**：名称里的 `/` 会被写成 `" / "`（实测），精确匹配前 `name.replace(/\s*\/\s*/g, "/")`，或改用 `-`/`__`。
11. **改完必验**：有 `export_shape` 时落盘 PNG/SVG 目视确认；只有 `execute_code` 时返回尺寸/字节头并明确声明“未做视觉确认”，不能把头部校验写成目视通过。包含性检查按直接父容器逐层做（见第 3 节）。

## 3. 标准工作流

**第 0 步 预检**：用第 0 节代码一次拿全版本、权限、页面、选区。

**第 1 步 读结构**：`penpotUtils.shapeStructure(page.root, 2~3)`，不要全树 dump。需要 API 细节时再查 `penpot_api_info`；没有该工具就按 `references/api-pitfalls.md` 的实测基线写。

**第 2 步 定位**：`findShapeById` 最稳；按名称查找时显式传 `page.root`：

```js
penpotUtils.findShapes(s => s.name === target, penpot.currentPage.root)
```

2.18.7 的 `findShapes` 不带根会跨所有页面（实测），不要依赖"默认当前页"。

**第 3 步 小步执行**：每步只做一类改动（建容器 / 填内容 / 调布局 / 修溢出），新建对象 id 存 `storage`，保证可重入。

**第 4 步 验收**：

```js
// 越界巡检：按直接父容器逐层检查，parentX/parentY 不能和顶层 board 混用
const bad = [];
(function walk(parent) {
  for (const child of parent.children || []) {
    const px = child.parentX, py = child.parentY;
    if (px < 0 || py < 0 ||
        px + child.width > parent.width ||
        py + child.height > parent.height) {
      bad.push({ id: child.id, name: child.name, parent: parent.name, px, py });
    }
    if (child.children?.length) walk(child);
  }
})(board);

// 视觉验收（有 export_shape 时优先落盘）
const png = await board.export({ type: "png" });
return { outside: bad.slice(0, 10), count: bad.length,
         bytes: png.length, head: Array.from(png.slice(0, 4)) };
```

有 `export_shape` 且允许 `filePath` 时，优先落盘后目视确认；只有 `execute_code` 时用 `shape.export()` 取字节，校验非空、PNG 头和宽高，并在汇报里注明“字节校验通过，未做视觉确认”。包含性检查要按直接父容器逐层判断，不能只比顶层 board。

**第 5 步 汇报**：只报改了哪些对象（id/name）、关键数值、验收证据、未完成项。不要复述代码。

### 3.1 多屏与原型接线

多屏/可点击原型先看 [`references/screen-kit.md`](references/screen-kit.md)；它只约束方法，不限定主题、风格或布局。

- **先定屏幕图**：一屏一条记录，写清入口、出口、主路径/次级页/状态页；只保留一条主流程。
- **次级页必须可返回**；当前 tab 不接“跳到自己”，保留 no-op。
- **坐标基准只能有一个**：子元素 `x/y` 是页面绝对坐标，用 `board.x + localX` 或 `setParentXY(shape, localX, localY)`；不要混用后再平移一次。
- **贴底区域从底部反推**：`bar.y + bar.height === board.y + board.height`；不要把底栏放在内容结束位置，留下无法解释的悬空。
- **等分项用精确除法**：`unit = board.width / n`，`x = i * unit`；文本宽度不能超过 item，否则会出现 1px 裁切。
- **可点击暗示必须兑现**：有箭头/按钮态的卡片要么接行为，要么降级为展示；不要把多张带具体标题的卡都接到同一个标题的详情页。
- **交互挂在 shape 上**，不是挂在 board 上；命中层用极低透明度矩形覆盖，接线函数先查 `shape.interactions.length` 保证可重入。
- **flow 要复读**：不可达 board 首次加 interaction 可能自动新建 flow；接线完成后删除多余 flow，保留预期的主流程，并复读交互数确认没有误删。

## 4. 失败速查

| 症状 | 真实原因 | 处理 |
|---|---|---|
| `No Penpot plugin instances are currently connected` | 插件没开或没点 Connect | 让用户打开插件并连接，别改代码 |
| `Multiple (N) ... instances are connected` | 多个标签页/插件实例 | 只保留一个 |
| `Task ... timed out after 30 seconds` | 单次代码太重/死循环 | 分片、去掉全树遍历、加边界 |
| `Cannot read properties of undefined (reading 'origin')` | 执行上下文没有 `location` | 删掉 `location.*`，只用 `penpot.*` |
| `Permission user:read is not granted` | 插件缺少用户信息权限 | 不是未登录；跳过用户信息，继续操作文件 |
| `fetch` 返回 401 / `Anonymous User` | 手写 fetch 没有会话凭据 | 改用 `penpot.*`，这是预期行为 |
| 上传成功但图片空白、读回 `<html>` | 把错误页当图片存了 | 上传前魔数守卫，重新取源，别重复上传 |
| 新插入元素 `y` 全是 0 | 布局尚未结算，或等待事件未触发 | `await penpot.waitForLayoutUpdate()` 后复读；等待加超时上限，超时先清理临时对象再重试 |
| 按名称找不到（名称含 `/`） | 名称被归一化为 `" / "` | 归一化后比较，或改用 `-` |
| 元素被裁掉 | 父级 `clipContent` + 子元素越界 | `setParentXY` 归零相对坐标，别放大父级 |
| `message could not be cloned` | 返回值含函数或 shape/page 代理 | 只返回 id/name/数值；`getPages()` 若返回代理，先 map 成 `{id,name}` |
| 验收通过但嵌套元素仍被裁 | 只检查了顶层 board | 按直接父容器逐层检查 |

## 5. 交付前检查清单

- [ ] 所有子元素都在直接父容器内（含 `clipContent` 的 board；逐层检查，不只比顶层）
- [ ] 没有 0 宽/0 高、没有负尺寸
- [ ] 文本 `growType` 为 auto，且布局后复读过尺寸
- [ ] 层级顺序符合遮挡关系
- [ ] 颜色/字号来自 token 或现有样式
- [ ] 若导出 CSS：已按 token 表替换裸色（`generateStyle` 不会自动变量化）
- [ ] 每个改动过的画板都导出图片并目视确认
- [ ] 图片填充非空（`fillImage` 存在、字节头正常、宽高非 0）
- [ ] 多屏：屏幕图、入口/出口和主流程已写清；次级页有返回；当前 tab 不自跳
- [ ] 多屏：所有 board 同尺寸、同 `y`，子元素使用统一坐标基准
- [ ] 贴底栏底边等于 board 底边；等分项无 1px 越界
- [ ] 可点击外观都有行为，或已明确降级为展示；示例数据跨屏一致
- [ ] 交互数、flow 数、重复接线和自跳已读回；多余 flow 已清理
- [ ] view mode 未实际点击时，明确写“数据层通过”，不写“流程可用”

## 参考

- 版本差异与实测细节：`references/api-pitfalls.md`
- 认证、`userToken`、远程模式排查：`references/auth-and-transport.md`
- 设计简报、设计转代码、图片流水线：`references/design-workflow.md`
- 多屏屏幕图、坐标、贴底栏与原型接线：`references/screen-kit.md`
- 常用调用骨架：`references/recipes.md`
