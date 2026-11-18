# 案例集

这些是**参考实现**：给出可执行的调用顺序、代码骨架与验收方法。

> 说明：代码基于 Penpot Plugin API 与官方 MCP 总览编写，未在你的具体文件上运行过。执行前先用 `penpot_api_info` 核对成员名；每个案例都标注了需要现场确认的点。

## 目录

| 案例 | 场景 | 关键点 |
|---|---|---|
| [01 首页分区块搭建](01-homepage-build.md) | 从零搭一屏 11 个区块 | 分片、`insertChild`、坐标换算、30s 预算 |
| [02 图片缺失修复](02-image-repair.md) | fillImage 为空或为 HTML | 魔数检测、批量重传、逐张验收 |
| [03 子元素越界修复](03-overflow-fix.md) | 元素存在但被裁剪 | `clipContent`、`setParentXY`、不要放大父级 |
| [04 设计转代码](04-design-to-code.md) | 导出 CSS/结构 | 选项名核对、token 映射、禁止魔数 |

## 通用节奏

```
预检 → 读结构 → 单点改动 → 立即验收 → 记录 id → 下一片
```

每个案例都按这个节奏拆成多次 `execute_code`，不要试图一次调用做完。