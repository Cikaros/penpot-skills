# 验证与探针

> 目的：让每一条 `[实测]` 都能找到**探针、期望输出、最近一次执行记录**。  
> 证据级别见 `docs/engineering/COMPASS.md` 的 ADR-005。

## 目录

```text
verification/
  probes/
    00-runtime-readonly.js     # execute_code：只读预检
    01-image-kind.mjs          # Node：图片签名纯函数
    02-layout-wait.js          # execute_code：自清理布局探针（会写入）
    03-overflow.mjs            # Node：嵌套越界纯函数
    04-overflow-live.js        # execute_code：真实 API 越界探针（会写入）
    05-image-upload.js         # execute_code：图片上传/读回探针（会写入）
    06-page-lifecycle.js       # execute_code：临时页创建/删除探针（会写入）
  log/
    2026-11-19.md              # 最近一次记录
  compatibility.md             # 版本 × 能力矩阵
```

## 运行方式

静态探针（不需要 Penpot）：

```powershell
node verification/probes/01-image-kind.mjs
node verification/probes/03-overflow.mjs
```

Penpot 探针：

1. 在 Penpot 中打开一个**可丢弃的验收页**；
2. 打开插件并确认已连接 MCP；
3. 把 `00-runtime-readonly.js` 的内容粘贴到 `execute_code`；
4. 把返回原样写入新的 `verification/log/YYYY-MM-DD.md`；
5. `02`/`04`/`05` 会创建并删除临时 board，`06` 会创建并删除临时页，只在确认当前页可写时运行；V-02 有 2 秒等待上限，超时也会清理。

## 约定

- 探针文件名以两位编号开头；新增探针同步更新本文件与 `compatibility.md`。
- `execute_code` 的探针只返回纯数据，不返回 shape/page 代理或函数。
- 任何写入型探针必须有 `try/finally` 清理，并在文件头标注“会写入”。
- 日志记录：日期、Penpot 版本、MCP 工具清单、探针 ID、原始结果、结论。
- 没有执行记录的结论不能标 `[实测]`；只能标 `[源码]`、`[推断]` 或 `[待验证]`。
