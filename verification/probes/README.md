# 探针索引

| ID | 文件 | 运行位置 | 是否写入 | 期望 |
|---|---|---|---|---|
| V-00 | `00-runtime-readonly.js` | `execute_code` | 否 | 返回 `version`、`rootType`、`layoutWait`、`pages`、`selection` |
| V-01 | `01-image-kind.mjs` | Node | 否 | PNG/JPEG/GIF87a/GIF89a/WEBP 通过；WAV/AVI/HTML/截断字节为空 |
| V-02 | `02-layout-wait.js` | `execute_code` | 是（自清理） | 两条路径都 `resolved`，y 为 0/20/40；使用 2 秒上限，超时也清理 |
| V-03 | `03-overflow.mjs` | Node | 否 | 只报 `badge` 一个嵌套越界，父级为 `card-Vehicle` |
| V-04 | `04-overflow-live.js` | `execute_code` | 是（自清理） | 直接子级 + 嵌套子级各报一个越界 |
| V-05 | `05-image-upload.js` | `execute_code` | 是（自清理） | 1×1 PNG 上传成功，`media` 1×1，读回字节仍是 PNG |
| V-06 | `06-page-lifecycle.js` | `execute_code` | 是（自清理） | 临时页可创建、切换、恢复、删除 |
| V-07 | `07-css-tokenize.mjs` | Node | 否 | 8 位 alpha 裸色归一化并替换为 token；剩余裸 px 进入审计 |
| V-08 | `08-prototype-flow.js` | `execute_code` | 是（自清理） | board interaction + flow 创建、读回、清理；待 Penpot 标签页唤醒后执行 |
| V-09 | `09-site-links.mjs` | Node | 否 | `site/` 所有本地 href/src 可解析 |
| V-10 | `10-real-file-baseline.js` | `execute_code` | 否 | 真实项目文件的文件/页面/board/选区只读基线；待真实文件 |

## 期望输出示例

V-01：

```json
{"ok":true,"cases":[{"name":"png","kind":"png"},{"name":"wav","kind":null}]}
```

V-03：

```json
{"ok":true,"count":1,"first":{"id":"badge","parent":"card-Vehicle"}}
```

V-04：

```json
{"outsideCount":2,"outside":[{"name":"probe-overflow-direct"},{"name":"probe-overflow-nested-child"}]}
```

V-05：

```json
{"sourceIsPng":true,"sourceBytes":70,"media":{"width":1,"height":1},"dataBytes":70,"dataIsPng":true}
```

V-06：

```json
{"opened":{"isCurrent":true},"restored":true,"removed":true}
```

V-07：

```json
{"ok":true,"replacements":[{"from":"#3366ffFF","to":"var(--color-brand-primary)"}],"audit":{"rawColors":[],"rawPx":["16px"]}}
```

V-09：

```json
{"ok":true,"pages":38,"links":1186}
```

实际输出可以与示例字段顺序不同，但关键字段必须一致；V-02 的 `wait` 必须是 `resolved`，否则先记录为波动，不要直接判定布局逻辑失败。案例 01–05 的完整脚本见 `docs/penpot-mcp/cases/`，执行结果记录在 `verification/log/`。

> V-08 / V-10 目前只有可执行探针，**没有执行记录**：2026-11-19 本轮 Penpot 插件标签页被浏览器挂起（无心跳），不得标 `[实测]`。V-07 / V-09 是本地 Node 探针，不是 Penpot 行为结论。
