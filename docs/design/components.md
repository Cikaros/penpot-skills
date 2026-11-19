# 组件规范

> 性质：**项目规范基线**。目标是让组件数量可控、命名可反查、变体不爆炸。

> 体系治理、组件 API、贡献流程、版本与废弃见 [`design-system.md`](design-system.md)；本文只定义具体组件的分层、变体、命名与验收。

## 1. 三层结构

| 层 | 内容 | 例子 |
|---|---|---|
| Primitive | 不可再拆的基础件 | Button、Input、Icon、Tag |
| Pattern | 由基础件组合的复用块 | SearchBar、VehicleCard、EmptyState |
| Screen | 只做拼装，不新建样式 | Home、Profile、AddVehicle |

规则：Screen 层不允许出现未登记的颜色/字号；发现即回补到 Primitive 或 Pattern。

## 2. 变体维度

- 维度上限 3 个，推荐 `size` / `state` / `tone`。
- 维度取值要封闭：`size = sm|md|lg`，不要出现 `xl2`。
- 状态不作为视觉稿的独立屏幕，而是组件的 `state` 变体。
- 组合数超过 24 时先拆组件，不要继续加维度。

## 3. 命名

```
cmp-<domain>-<Component>-<variant>
```

- `domain` 取业务域：`base`、`vehicle`、`profile`、`payment`。
- 实例图层名用 `btn-<Component>-<variant>-<state>`（如 `btn-Primary-Disabled`）；主组件名用 `cmp-<domain>-...`，通过实例关系反查，不要求字符串完全同名。
- **不要用 `/` 分隔**：Penpot 会归一化成 `" / "`，按原名精确查找会失败。
- 不使用 `Frame 123`、`Group 45` 这类默认名进入交付。

## 4. 实例使用规则

- 允许覆盖：文本、图标、显隐。
- 不允许覆盖：结构、圆角、间距、颜色 token。
- 需要不同结构时新建 Pattern，不要 detach 后改。
- 组件内不嵌套自身（避免递归实例）。

## 5. 状态清单

组件状态解决“控件怎么变”；屏幕级的数据、空态、错误、离线和权限状态见 [`states.md`](states.md)。

每个交互组件交付前必须齐：

- [ ] default
- [ ] hover
- [ ] pressed
- [ ] focus（可见焦点环）
- [ ] disabled
- [ ] loading（如适用）
- [ ] error（表单类必填）

## 6. 验收

- [ ] 所有实例都能追溯到主组件
- [ ] 没有 detach 的实例
- [ ] 颜色/字号全部来自 token
- [ ] 变体命名与目录一致
- [ ] 在 390 与 1440 两个宽度下都不溢出

## 7. 反例

- 用 Group 冒充组件（无法同步修改）。
- 同一个按钮存在 `Button`、`Btn`、`button-primary` 三种命名。
- 为一次性需求新建组件，导致库里 80% 组件从未复用。