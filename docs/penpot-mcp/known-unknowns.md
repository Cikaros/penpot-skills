# 已知未知与待验证项

> 基线：Penpot `2.18.7`，2026-11-19。  
> 本文只记录**还不能写成事实**的结论；每条给出影响与关闭条件。不要把这里的条目当成操作依据。

## 1. 当前运行时状态

| ID | 未知点 | 当前证据 | 影响 | 关闭条件 |
|---|---|---|---|---|
| KU-01 | 当前 Penpot 实例的实时版本与插件状态 | 2026-11-19 刷新后 V-00 通过：`2.18.7`，`rootType=object`，`layoutWait=function` `[实测-合成页]` | 已恢复连接；后续升级仍需重跑 | 升级后运行 `verification/probes/00-runtime-readonly.js` |
| KU-02 | 真实项目文件上的行为 | 现有 `[实测]` 主要来自 2.18.7 合成验收页；案例 01–03 已在临时页跑通 `[实测-合成页]` | 真实文件的组件、库、权限差异未覆盖 | 在专用真实文件运行案例 01/02/03，记录为 `[实测-真实文件]` |
| KU-03 | 远程/多用户模式的完整工具面 | 只从文档与上游说明知道 `import_image` 可能被移除 | 远程部署的图片导入与导出路径可能不同 | 在 remote 部署跑 `00` 探针并记录工具清单 |
| KU-13 | 案例 01 的默认页面是否存在 | 当前 `test-design` 只有 `Page 1` / `99-MCP-Test`，没有 `03-Screens`；本轮已临时创建并删除 `03-Screens` `[实测-合成页]` | 全新文件直接照案例执行会找不到页面 | 把案例改成“先查/再建页面”，或由调用者先建页面 |
| KU-14 | 案例 04 的 token 映射是否达标 | 合成 board 未挂 token 时 CSS 出现裸色 `#FFFFFFFF`；已有 `exp-token` 挂了 `color-brand-primary`，`generateStyle` 仍输出 `#3366ffFF`、无变量 `[实测-合成页]` | `generateStyle` 不会自动 token 化，不能声称案例 04 全量通过 | 生成后按 `library.local.colors`/项目 token 表替换，并在真实 token 文件复跑 |

## 2. API 语义待确认

| ID | 未知点 | 已知 | 影响 | 关闭条件 |
|---|---|---|---|---|
| KU-04 | `penpot.root` 与 `penpot.currentPage.root` 的版本差异 | 官方 API 同时提供两者；`penpot.root` 是当前页根 `[源码]` | 两者都可用于当前页；不要当成跨页根 | 在 2.18.7 与目标版本各跑 `00` 探针的 `rootType` |
| KU-05 | `penpotUtils.getPages()` 是否在所有版本都返回纯 `{id,name}[]` | 官方总览写返回 `{id,name}[]` `[源码]`；代码仍做一次映射 | 老版本若返回 page 代理，直接返回会触发克隆错误 | 在目标版本检查 `typeof pages[0].root` 与返回值 |
| KU-06 | `generateStyle` 的选项名 | 2.18.7 实测只认 `includeChildren`；官方总览示例出现 `withChildren` `[实测]`/`[源码]` 冲突 | 用错选项会静默生成不含子元素的 CSS | 用输出长度和子元素选择器验证；以实测版本为准 |
| KU-07 | `generateCss` 是否切换当前页 | 仅有“可能切换”的推断 `[推断]` | 后续写入可能落到错误页面 | 记录调用前后 `currentPage.id`，在 2.18.7 复测 |
| KU-08 | `fillImage.data()` 是否始终返回 Promise | 2.18.7 返回 Promise `[实测]` | 不 `await` 会拿到 Promise 而不是字节 | 对同步/异步两种实现都 `await`，并记录返回类型 |
| KU-09 | `penpot.waitForLayoutUpdate` 在旧版是否存在 | 2.18.7 存在 `[实测]` | 旧版直接调用会抛错 | 探针 `layoutWait` 为 `undefined` 时改用“插测试块 + 复读坐标” |
| KU-10 | `import_image` 的返回值与本地/远程差异 | 远程模式可能移除该工具 `[源码]` | 不能把 `import_image` 当成修复已有 fill 的通用方案 | 本地模式单独跑一次新建图片，记录返回 shape/id |
| KU-11 | `export_shape` 在远程模式的 `filePath` | 远程模式可能删除该字段 `[源码]` | 不能依赖落盘路径做视觉验收 | 检查工具 schema；无 `filePath` 时只做字节/尺寸校验并注明 |
| KU-12 | `penpotUtils.base64ToByteArray` 的跨版本可用性 | 2.18.7 可用，`penpotUtils.atob` 不存在 `[实测]` | 解码分支写死会在其他版本失败 | 探针检查 `typeof atob` 与 `typeof penpotUtils.base64ToByteArray` |

## 3. 版本范围

当前只对 Penpot `2.18.7` 给出操作承诺。其他版本：

- 先跑 `verification/probes/00-runtime-readonly.js`；
- 再按 `verification/compatibility.md` 的未知列逐项确认；
- 未确认前，结论只能标 `[待验证]`，不能复制成“通用做法”。

## 4. 关闭方式

1. 运行对应探针，把原始返回写入 `verification/log/YYYY-MM-DD.md`；
2. 更新 `verification/compatibility.md` 的版本列；
3. 若结论变化，先改 `docs/penpot-mcp/pitfalls.md`（事实源），再跑 `npm run sync` 与 `npm run check`；
4. 删除或改写本文对应条目，并在 `CHANGELOG.md` 记录。
