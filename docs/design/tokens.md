# 设计 Token 与 DTCG

> 性质：**项目规范 + 可执行工具说明**。DTCG 仍是演进中的规范；本仓库只实现项目需要的子集，不声称完整兼容。
>
> 工具：`shared/design-tokens.mjs`；示例：`shared/tokens/example.tokens.json`；测试：`test/design-tokens.test.mjs`。

## 1. 分层与命名

```text
primitive/color/blue/500      原始值，不直接被页面引用
semantic/color/text/primary   页面引用
component/button/primary/bg   组件内部
```

规则：

- 路径段用 `.` 分隔；落到 CSS 变量用 `-`，例如 `color.text.primary` → `--color-text-primary`。
- 语义名表达用途，不表达色相；不要用 `blue` 作为正文语义。
- 颜色、间距、圆角、字号、行高、阴影都可 token 化；不要只做颜色。
- 页面不直接引用 primitive；组件不跨层引用其他组件的私有 token。
- Penpot 图层/组件名仍遵守“不含 `/`”的规则；token 路径与 Penpot 名称是两套表示。

## 2. DTCG 子集

支持的写法：

```json
{
  "color": {
    "$type": "color",
    "text": {
      "primary": { "$value": "#111827" },
      "secondary": { "$value": "{color.text.primary}" }
    }
  },
  "space": {
    "$type": "dimension",
    "16": { "$value": { "value": 16, "unit": "px" } }
  }
}
```

- `$type` 可被组继承；
- `$value` 标记 token；
- `{color.text.primary}` 是别名；
- `$description`、`$extensions` 等元数据不进入 CSS；
- 循环别名、未知别名、重复路径会抛错，不静默跳过。

暂不承诺：

- 完整 DTCG 复合类型（shadow、gradient、border 等）的 CSS 展开；
- 主题/模式（light/dark）的自动切换；
- 与所有设计工具的导入导出兼容。

## 3. Penpot 映射边界

| token | Penpot 能力 | 边界 |
|---|---|---|
| 颜色 | `library.local.createColor()`；fill 三字段绑定 | `generateStyle` 仍输出裸色，需后处理 |
| 间距/圆角 | 可写入形状/flex 属性 | 没有“间距 token”对象；值需按规范映射 |
| 排版 | `createTypography()`；逐字段复制 | 不能整体赋给 `text.typography` |
| 阴影 | `shadows` 数组 | 阴影透明度在 `color.opacity` |
| 组件 | 可创建/实例化 | 变体 API 在 2.18.7 不可用，按独立组件模拟 |

不要在文档里写“Penpot 会自动 token 化”。2.18.7 实测是：即使 fill 带 `fillColorRefId`/`fillColorRefFile`，CSS 仍是 `#3366ffFF`。

## 4. 生成流程

```text
tokens.json
  → flattenDtcg()
  → 校验别名/重复/类型
  → toCssVars()           生成 :root 变量
  → Penpot 颜色库         绑定 fillColorRefId / fillColorRefFile
  → generateStyle()       导出 CSS
  → tokenizeCssDetailed() 颜色后处理
  → auditCss()            报告剩余裸值，人工补语义
```

示例：

```js
import fs from "node:fs";
import {
  flattenDtcg,
  toCssVars,
  tokenizeCssDetailed,
} from "../../shared/design-tokens.mjs";

const tokens = flattenDtcg(
  JSON.parse(fs.readFileSync("shared/tokens/example.tokens.json", "utf8")),
);

const rootCss = toCssVars(tokens);
const generated = ".home { color: #3366ffFF; background: #FFFFFF; }";
const result = tokenizeCssDetailed(generated, tokens);

if (result.unmapped.length) {
  throw new Error(`未映射颜色: ${result.unmapped.join(", ")}`);
}
console.log(rootCss);
console.log(result.css);
```

输出：

```css
:root {
  --color-brand-primary: #3366ff;
  --color-text-primary: #111827;
}

.home { color: var(--color-brand-primary); background: var(--color-surface-default); }
```

## 5. 颜色后处理的限制

`tokenizeCss` 只替换**十六进制颜色**，并且只按精确值匹配：

- `#3366ffFF` 会归一化为 `#3366ff` 后匹配；
- `rgb()`、`hsl()`、命名色、渐变中的插值不自动替换；
- 透明度和混合模式要单独检查；
- 间距/字号/圆角不做按值猜测，必须给出语义映射；
- 同值不同语义（如 `#FFFFFF` 既是 surface 又是 on-primary）不能靠值唯一决定，必须人工指定。

因此后处理只能保证“没有已知裸色”，不能保证“语义正确”。验收时要看 token 名是否表达了用途。

## 6. 验收与审计

```bash
npm test -- test/design-tokens.test.mjs
node verification/probes/07-css-tokenize.mjs
```

`auditCss()` 返回：

```json
{
  "rawColors": ["#ABCDEF"],
  "rawPx": ["13px", "8px"],
  "variables": ["var(--color-brand-primary)"]
}
```

验收规则：

- `unmappedColors` 必须为空，或逐条登记为例外；
- `rawPx` 必须能解释：0、1px 边框、设计稿明确值；其余回到 token；
- 变量名必须是 semantic token，不能是 `--blue-500` 这类 primitive；
- 生成 CSS 中的 `var()` 必须在 `:root` 或主题作用域有定义；
- 不把“有变量”当成“可访问性通过”；对比度仍按 `accessibility.md` 检查。

## 7. 迁移策略

1. 先盘点现有颜色/间距/字号，按使用频率分组。
2. 建立 primitive，不直接改页面。
3. 建立 semantic，把页面硬编码替换为 semantic。
4. 组件私有 token 最后抽取；不要先造一堆只用一次的组件 token。
5. 每次迁移只改一个维度（先颜色，再间距，再排版），并保留回滚点。
6. 旧文件允许暂时保留裸值，但新文件不得新增。

## 8. 验收清单

- [ ] token 路径分层清晰，页面只引用 semantic
- [ ] 别名可解析，无循环/重复/未知引用
- [ ] CSS 变量名与 token 路径一一对应
- [ ] Penpot 颜色绑定三字段齐全
- [ ] `generateStyle` 输出经过 `tokenizeCssDetailed`
- [ ] `unmappedColors` 为空或已登记例外
- [ ] `rawPx` 有解释，没有新魔数
- [ ] 复合 token 的限制已标注，没有写成完整 DTCG 支持
- [ ] 迁移有回滚点，没有一次性全量替换

## 9. 依据

- Design Tokens Community Group, *Design Tokens Format Module*（草案，随版本变化）。
- Penpot 2.18.7 实测：颜色/排版 token、`generateStyle` 裸值行为。
- 现有 `docs/design/visual-spec.md`、`conventions.md`、`docs/penpot-mcp/cases/04-design-to-code.md`。
