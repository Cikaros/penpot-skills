# 组件规范

> 性质：**项目规范基线**。目标是让组件数量可控、命名可反查、变体不爆炸。

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
cmp/<domain>/<Component>/<variant>
```

- `domain` 取业务域：`base`、`vehicle`、`profile`、`payment`。
- 实例沿用组件名，后缀标状态：`btn/Primary-Disabled`。
- 不使用 `Frame 123`、`Group 45` 这类默认名进入交付。

## 4. 实例使用规则

- 允许覆盖：文本、图标、显隐。
- 不允许覆盖：结构、圆角、间距、颜色 token。
- 需要不同结构时新建 Pattern，不要 detach 后改。
- 组件内不嵌套自身（避免递归实例）。

## 5. 状态清单

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