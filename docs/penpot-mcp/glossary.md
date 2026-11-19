# 术语表

> 目的：减少文档、案例与技能之间的同词异义。遇到新术语先补这里，再在正文使用。

| 术语 | 含义 | 常见误区 |
|---|---|---|
| **Page root** | 当前页面的根容器：`penpot.currentPage.root`；官方也提供等价的 `penpot.root` | 把 `penpot.root` 当成跨页根；它只指向当前页 |
| **Board** | Penpot 的画板/容器；有 `clipContent`，会裁剪越界子元素 | 把 Group 当 Board；Group 不负责裁剪 |
| **Shape proxy** | 插件 API 返回的图层代理对象，不能直接 JSON 序列化 | 把 shape 放进 `return`，触发 `message could not be cloned` |
| **`parentX` / `parentY`** | 相对**直接父容器**的坐标，只读 | 拿它和顶层 board 的宽高比较，漏掉嵌套越界 |
| **`clipContent`** | Board 是否裁剪超出边界的子元素；默认 `true` | 元素“消失”时先怀疑被删除，实际常是被裁剪 |
| **`fillImage`** | 形状填充中的图片对象；`fillImage.data()` 返回 Promise | 当同步数组用；上传错误页后读回 `<html>` |
| **`storage`** | `execute_code` 跨调用持久化的键值存储 | 把普通变量当跨调用状态；下一次调用就丢 |
| **`execute_code`** | 在 Penpot 插件上下文执行 JS 的工具；单次 30 秒硬超时 | 一次遍历全树、批量上传大量图片 |
| **`userToken`** | MCP 传输层的会话标识，不是 Penpot 登录令牌 | 拼到 Penpot URL 上以为能登录；实际后端只认 cookie/Authorization |
| **Token** | 设计变量（颜色/间距/字体等）的规范标识 | 把 `space/4` 直接写进图层名；Penpot 会归一化 `/` |
| **Derived copy** | 从唯一源生成/同步的技能引用或摘要 | 手工改派生副本，导致与源不一致 |
| **Capability level** | 当前会话可用工具的等级：A 有 `export_shape` 落盘，B 只有 `execute_code` | 假设可选工具一定存在；把字节头校验写成“目视通过” |

相关：`pitfalls.md` 第 0 节探测、第 8 节错误索引；`../engineering/COMPASS.md` 第 2 节设计原则。
