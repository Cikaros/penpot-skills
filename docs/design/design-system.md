# 设计系统治理

> 性质：**项目规范基线**。目标不是“组件多”，而是让新页面能用已有组件和 token 拼出来，且改一处能安全传播。
>
> 与 `components.md` 的分工：本文管**体系、流程、版本和治理**；组件分层、变体、命名和验收仍在 `components.md`。

## 1. 设计系统不是组件库

组件库只回答“有哪些控件”。设计系统还要回答：

- 哪些值可以硬编码，哪些必须来自 token；
- 组件的 API 是什么，哪些可覆盖，哪些禁止；
- 新组件凭什么进入系统，旧组件怎么废弃；
- 设计与代码如何保持同一语义；
- 可访问性由谁负责、在哪一步验收。

没有治理的组件库会变成“另一个更大的组件库”。

## 2. Token 分层

| 层 | 作用 | 例子 | 允许被页面直接引用 |
|---|---|---|---|
| Primitive | 原始值，不含语义 | `color.blue.500`、`space.16` | 否 |
| Semantic | 表达用途 | `color.text.primary`、`color.action.primary` | 是 |
| Component | 组件私有决策 | `button.primary.bg` | 仅组件内部 |

规则：

- 页面只引用 semantic token；primitive 只在 token 文件内被 semantic 引用。
- semantic token 的命名表达“用途”，不表达“颜色”。不要用 `color.blue` 当正文色。
- 组件 token 是组件 API 的一部分；改它要按组件版本处理。
- 颜色、间距、圆角、字号、行高、阴影都应有 token；不要只 token 化颜色。
- token 的单一源与 DTCG 结构见 [`tokens.md`](tokens.md)。

## 3. 组件 API

每个组件交付时写清：

```text
名称：cmp-base-Button
用途：主要/次要/危险动作
Anatomy：container / icon / label / focus-ring
Props：variant, size, tone, disabled, loading
内容规则：标签 1–3 个词；不使用句子
状态：default / hover / pressed / focus / disabled / loading
可访问性：角色、名称、焦点顺序、最小目标尺寸
Token：背景、文字、边框、圆角、间距
禁止：结构覆盖、任意颜色、负间距、嵌套自身
```

规则：

- API 维度不超过 3 个；超过 24 个组合先拆组件。
- 允许覆盖文本、图标、显隐；不允许覆盖结构、圆角、间距和语义颜色。
- `loading` 必须防重复提交；`disabled` 必须说明原因或提供替代路径。
- 组件状态与屏幕状态分开：屏幕级空态/错误/离线见 [`states.md`](states.md)。
- 组件必须能通过键盘操作，焦点可见；标注见 [`accessibility.md`](accessibility.md)。

## 4. 组件清单与去重

维护一张可检索的清单，至少包含：

| 字段 | 说明 |
|---|---|
| 名称 | `cmp-<domain>-<Component>`，不用 `/` |
| 层级 | Primitive / Pattern / Screen |
| 所有者 | 设计 + 代码负责人 |
| 使用页面 | 反查入口 |
| 状态 | draft / stable / deprecated |
| 替代品 | 废弃时指向新组件 |
| 可访问性 | 已验收的键盘/读屏项 |
| 版本 | 与代码包或设计库版本对应 |

每月做一次轻量审计：

- 找出 0 使用的组件；
- 找出重复的视觉实现（同形态不同名）；
- 找出 detach 的实例和硬编码颜色；
- 找出没有 owner 的 stable 组件。

## 5. 贡献流程

新组件进入系统前回答：

1. 现有组件能否通过组合或新增变体解决？
2. 这是 Pattern 还是 Primitive？会不会把业务逻辑塞进基础组件？
3. 是否有至少两个真实页面需要它？
4. 可访问性、状态、响应式是否齐全？
5. 谁维护？废弃时怎么迁移？

流程：

```text
提案（问题/证据/现有替代）
→ 设计评审（API/状态/token）
→ 可访问性评审
→ 实现/文档
→ 2 个真实页面试用
→ stable
→ 定期审计/废弃
```

只有一次需求、没有复用证据的组件，先留在页面层，不进入系统库。

## 6. 版本与废弃

- 设计库和代码包使用可对应的版本号；不要求完全同步，但必须能查到对应关系。
- 破坏性变更：改名、删 prop、改结构、改语义 token。给迁移说明和至少一个发布周期的弃用期。
- 非破坏性变更：新增可选 prop、新增 token、修正文档。
- 废弃组件标记 `deprecated`，写替代品和最后支持日期；不要直接删除导致旧文件无法打开。
- 历史页面允许保留旧组件，但新页面不得使用 deprecated 组件。

## 7. Penpot 落地边界

- Penpot 2.18.7 的插件 API 没有稳定的“变体容器”创建路径；`createVariantFromComponents` 实测不可用。当前用独立组件 + 命名约定模拟，不要写成已支持变体。
- 颜色 token 可绑定 `fillColorRefId` / `fillColorRefFile`；排版 token 只能逐字段复制，不能整体赋值。
- `generateStyle` 不会自动把库颜色输出为 CSS 变量；设计转代码必须做 token 后处理。
- 组件实例允许覆盖文本/图标/显隐；结构覆盖会破坏可维护性。
- 这些是工具边界，不是设计系统可以省略治理的理由。

## 8. 治理指标

不要用“组件数量”当成功指标。优先看：

| 指标 | 说明 |
|---|---|
| Token 覆盖率 | 页面颜色/间距/字号中来自 token 的比例 |
| 组件复用率 | 使用实例的页面数 / 组件数 |
| Detach 率 | detach 实例 / 总实例 |
| 重复实现数 | 同形态不同名的组件对数 |
| 可访问性缺口 | 未通过键盘/对比度/焦点验收的 stable 组件数 |
| 废弃债务 | deprecated 组件仍在使用的页面数 |
| 变更回滚率 | 组件/token 变更导致回滚的比例 |

指标用于发现问题，不做个人绩效。

## 9. 验收清单

- [ ] 页面只引用 semantic token
- [ ] 每个 stable 组件有 owner、API、状态和可访问性记录
- [ ] 新组件有至少两个真实页面需求
- [ ] 组件没有结构覆盖和硬编码语义颜色
- [ ] 废弃组件有替代品和迁移说明
- [ ] 设计库与代码版本可对应
- [ ] 每月审计 0 使用、重复实现、detach 和硬编码
- [ ] Penpot 能力边界已标注，没有把模拟变体写成原生能力

## 10. 依据

- WCAG 2.2 与 W3C 可访问性成熟度模型。
- Penpot 官方设计系统/组件文档，以及本仓库 `docs/penpot-mcp/pitfalls.md` 的 2.18.7 实测。
- 现有 `docs/design/components.md`、`visual-spec.md`、`tokens.md`。
