# Canonical snippets

本目录是跨文档复用代码的唯一源。

- `image-kind.mjs`：图片签名守卫；被 `shared/penpot-guards.mjs` 导入，也被 `scripts/sync-snippets.mjs` 注入 Markdown。
- `manifest.json`：片段 ID、源文件与目标文件列表。

修改片段后运行：

```powershell
npm run sync      # 重建目标代码块
npm run manifest  # 技能目录清单哈希会变
npm run verify
```

注入时会去掉行首 `export `，因此同一份实现既能在 Node 中 import，也能粘贴进 Penpot `execute_code`。
