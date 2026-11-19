# 案例集

这些是**参考实现**：给出可执行的调用顺序、代码骨架与验收方法。

> 证据级别：案例 01/02/03 的完整调用顺序已在 Penpot `2.18.7` 临时合成页验证；案例 04 的生成链路已验证，token 后处理由 V-07 本地探针验证；案例 05 的 interaction/flow API 结构已在 2.18.7 合成页通过 `[实测-合成页]`（首次 interaction 自动建 `Flow 1`，可重命名；view mode 点击未测）。**均未在真实项目文件上验证**。执行前先用 `penpot_api_info` 核对成员名，并按每个案例的“现场需核对”逐项确认。证据标签定义见 `docs/engineering/COMPASS.md` 第 8 节。

## 目录

| 案例 | 场景 | 关键点 |
|---|---|---|
| [01 首页分区块搭建](01-homepage-build.md) | 从零搭一屏 11 个区块 | 分片、`insertChild`、坐标换算、30s 预算 |
| [02 图片缺失修复](02-image-repair.md) | fillImage 为空或为 HTML | 魔数检测、批量重传、逐张验收 |
| [03 子元素越界修复](03-overflow-fix.md) | 元素存在但被裁剪 | `clipContent`、`setParentXY`、不要放大父级 |
| [04 设计转代码](04-design-to-code.md) | 导出 CSS/结构 | 选项名核对、token 后处理、禁止魔数 |
| [05 可交互原型流](05-prototype-flow.md) | 连接屏幕、建立 flow | `addInteraction`、`createFlow`、view mode 验收 |

## 通用节奏

```
预检 → 读结构 → 单点改动 → 立即验收 → 记录 id → 下一片
```

每个案例都按这个节奏拆成多次 `execute_code`，不要试图一次调用做完。