# 案例 04：设计转代码

**目标**：从选中形状生成可落地的 CSS/结构，且不带魔数。

## 步骤 1：确认当前选区

```js
if (penpot.selection.length === 0) {
  return { error: "请先在 Penpot 中选中一个画板或组件实例" };
}
storage.selectionIds = penpot.selection.map(s => s.id);
return penpot.selection.map(s => ({ id: s.id, name: s.name, type: s.type, w: s.width, h: s.height }));
```

选区随时会变，先存 id，后续按 id 重新取。

## 步骤 2：生成样式

```js
const shape = penpotUtils.findShapeById(storage.selectionIds[0]);

// 2.18.7 实测：只认 includeChildren；withChildren 被静默忽略
const css = penpot.generateStyle([shape], { type: "css", includeChildren: true });
return css;
```

> **已核实（2.18.7）**：`includeChildren: true` 输出 1230 字符，`false` 输出 158 字符；`withChildren: false` 仍是 1230——说明 `withChildren` 不被读取。统一用 `includeChildren`。

CSS 类名与 HTML 类名共用同一基类（如 `e2ehome-<hash>`），可直接配对；HTML 额外带 `frame`/`shape`/`rect`/`text` 语义类。从 CSS 提取类名时过滤纯数字，避免把 `.2em` 当成类名。

## 步骤 3：把值映射回 token

生成结果里允许出现：

- token 名（优先）
- 明确的 CSS 变量引用，如 `var(--color-text-primary)`

不允许出现：

- 裸色值 `#3b82f6`、`rgb(...)`
- 裸间距 `13px`、`18px`
- 裸字号 `15px`

映射示例：

| 生成值 | 映射 |
|---|---|
| `color: #111827` | `var(--color-text-primary)` |
| `gap: 16px` | `var(--space-16)` |
| `font-size: 24px` | `var(--font-h2-size)` |
| `border-radius: 8px` | `var(--radius-8)` |

映射表应来自项目的 token 导出，不要凭色值猜语义。

## 步骤 4：产出结构

```text
<ComponentName>/
  index.tsx          结构（无语义样式）
  styles.css         变量化样式
  README.md          与设计稿的对应关系（board id / 节点名）
```

规则：

- 结构用组件名，不用 `div1/div2`。
- 不发明断点；断点来自设计稿里已有的 board 宽度。
- 图片走 `src` 引用，不内联 base64（除非明确要求单文件）。

## 步骤 5：验收

- [ ] 代码中每个颜色都能在 token 表找到
- [ ] 每个间距都是 4 的倍数且在 scale 内
- [ ] 字号层级与设计稿一致
- [ ] 在 390 / 1440 两个宽度下结构不塌

## 常见失败

| 现象 | 原因 | 处理 |
|---|---|---|
| 只导出了外层，子元素缺失 | 选项名用错（见步骤 2） | 查 API 后重导 |
| 颜色全是裸值 | 设计里用的是本地色而非 token | 先在 Penpot 里把颜色挂到库 |
| 结构层级过深 | 用 group 层层包裹 | 扁平化，group 不作为 DOM 层级 |
| 字体对不上 | 设计用了未加载字体 | 先在文件里补齐字体资源 |

## 现场需核对

- `generateStyle` 的选项名与返回格式（字符串 / 对象）。
- `generateMarkup` 是否在当前版本可用；不可用就只导样式，结构由 AI 按 shape 树生成。