# 避坑目录

> 性质：**硬规则**。每一条都对应真实的静默失败，违反后通常不报错，但产出是错的。

## 严重度说明

- **P0**：直接产出错误设计或坏数据，必须无条件遵守。
- **P1**：特定场景下出错，容易误判为"工具坏了"。
- **P2**：效率与可维护性问题。

## P0

### P0-1 用 `appendChild` 追加子元素

```js
// ❌ 位置不可预测
parent.appendChild(shape);
board.flex.appendChild(shape);

// ✅ 普通容器
parent.insertChild(parent.children.length, shape);
// ✅ flex board（按视觉顺序调用）
board.appendChild(shape);
```

flex 布局的 `appendChild` 与普通容器的语义不同，混用会出现"元素跑到最前面/最后面"。

### P0-2 flex 子元素顺序是反的

`dir` 为 `row` 或 `column` 时，`children` 数组顺序与视觉顺序相反。插入前先算清索引；用 `board.appendChild` 时按视觉顺序调用即可。

### P0-3 用 `resize` 改文字，导致 `growType` 被重置

```js
text.resize(200, 40);          // growType 变成 "fixed"
text.growType = "auto-height"; // 必须改回来
```

不改回来，文本会溢出且包围盒失去意义。自动尺寸异步生效，读之前等约 100ms。

### P0-4 把宽高当可写属性

`width`/`height`/`bounds` 只读，改尺寸只能 `resize(w, h)`。

### P0-5 把错误页当图片上传

上传前必须校验魔数。以 `<html`、`<!doc`、`{` 开头的字节一律拒绝：

```js
const b = Array.from(bytes.slice(0, 4));
const ok = (b[0]===0x89 && b[1]===0x50) || (b[0]===0xff && b[1]===0xd8)
        || String.fromCharCode(...b).startsWith("GIF")
        || String.fromCharCode(...b) === "RIFF";
if (!ok) throw new Error("not an image: " + String.fromCharCode(...bytes.slice(0,5)));
```

### P0-6 单次 `execute_code` 超过 30 秒

超时即失败，不会"稍后完成"。分片、去掉全树遍历、加边界条件。批量改 50 个以上对象时，先按 id 排序再按批处理。

## P1

### P1-1 `findShapes` 默认只搜当前页

```js
penpotUtils.findShapes(pred)              // 只在 penpot.root
penpotUtils.findShape(pred)               // 默认跨所有页面
penpotUtils.findShapes(pred, page.root)   // 显式指定
```

两者默认范围不对称，跨页查找必须显式传根。

### P1-2 `analyzeDescendants` 不含 root 自身

它从 `root.children` 开始遍历。要校验根容器本身，单独判断。

### P1-3 插件环境没有 `atob`

```js
const bytes = penpotUtils.atob(base64); // 不要用 atob
```

### P1-4 元素被裁掉，误判为"没渲染"

父 board 的 `clipContent` 会裁掉越界子元素。典型症状：结构里存在、坐标却在画板外。

```js
penpotUtils.setParentXY(shape, 0, 0); // 先把相对坐标归零
```

不要第一反应去放大父容器。

### P1-5 返回 shape 对象

返回值会 JSON 序列化，shape 是代理对象，序列化后基本没用。返回 `{ id, name, x, y, width, height }`。

### P1-6 依赖 `penpot.selection` 的稳定性

用户随时会改选区。拿到后立刻把 id 与关键属性复制到 `storage`。

### P1-7 `generateCss` 有副作用

它内部会 `penpot.openPage(page)`，会切换用户当前页面。生成样式前告知用户，或先记录当前页。

## P2

### P2-1 官方总览里 grid 的创建写法是笔误

总览写的是 `board.addFlexLayout()` 后访问 `board.grid`，与实际 API 不符。用 `penpot_api_info("Board", "addGridLayout")` 核对，不要照抄。

### P2-2 `import_image` 在远程模式不存在

远程/多用户部署下改用 `execute_code` + `penpot.uploadMediaData`。见 `auth.md`。

### P2-3 重复日志

`return` 的数据再用 `console.log` 打一遍，模型会收到两份，浪费上下文，也容易误读。

### P2-4 `generateStyle` 的选项名两处不一致

官方总览的示例写 `withChildren`，`PenpotUtils.generateCss` 内部用 `includeChildren`。传错不会报错，只会静默丢掉子元素。用 `penpot_api_info("Penpot", "generateStyle")` 核对当前版本再写。

## 改完必查

- [ ] 所有子元素在父容器内（含 `clipContent` 的 board）
- [ ] 没有 0 宽/0 高、没有负尺寸
- [ ] 文本 `growType` 为 auto 且未溢出
- [ ] 遮挡顺序符合预期
- [ ] 颜色/字号来自 token 或现有样式
- [ ] 图片 `fillImage` 存在且字节头正常
- [ ] 每个改动过的画板都导出过 PNG 目视确认