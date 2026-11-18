# 案例 01：首页分区块搭建

**目标**：在 390×844 的画板上按顺序搭出 11 个区块，全部落在画板内。

**为什么分片**：单次 `execute_code` 硬超时 30 秒。11 个区块 + 内部元素通常要拆成 3–4 次调用。

## 步骤 0：预检

```js
return {
  user: penpot.currentUser ? penpot.currentUser.name : null,
  pages: penpotUtils.getPages(),
  current: penpot.currentFile ? penpot.currentFile.name : null
};
```

## 步骤 1：确保画板存在（幂等）

```js
const page = penpotUtils.getPageByName("03-Screens");
if (!page) throw new Error("page 03-Screens not found");
penpot.openPage(page);

let board = penpotUtils.findShape(s => s.name === "home/Home-Default", page.root);
if (!board) {
  board = penpot.createBoard();
  board.name = "home/Home-Default";
  board.resize(390, 844);
  board.x = 0;
  board.y = 0;
}
storage.homeBoardId = board.id;
return { id: board.id, x: board.x, y: board.y, w: board.width, h: board.height };
```

要点：先查后建，重复执行不会产生第二个画板。

## 步骤 2：建区块骨架（一次 4 个）

```js
const board = penpotUtils.findShapeById(storage.homeBoardId);
const specs = [
  { name: "sec-TopBar",     h: 56  },
  { name: "sec-Search",     h: 64  },
  { name: "sec-QuickTags",  h: 48  },
  { name: "sec-AIAssistant",h: 180 }
];

let offset = board.children.reduce((sum, c) => Math.max(sum, c.y - board.y + c.height), 0);
for (const s of specs) {
  if (board.children.some(c => c.name === s.name)) continue;   // 幂等
  const sec = penpot.createBoard();
  sec.name = s.name;
  sec.resize(board.width, s.h);
  board.insertChild(board.children.length, sec);
  sec.x = board.x;
  sec.y = board.y + offset;
  offset += s.h;
}
return { children: board.children.map(c => ({ name: c.name, y: c.y, h: c.height })) };
```

要点：

- `insertChild(board.children.length, sec)`，不要 `appendChild`。
- 名称用 `sec-TopBar` 而不是 `sec/TopBar`：Penpot 会把 `/` 归一化成 `" / "`，导致幂等判断失效、重复执行时插出重复区块。
- `x/y` 是页面绝对坐标，所以子区块要写成 `board.x` / `board.y + offset`。
- `offset` 从现有子元素的最大底边算起，保证可重复执行。
- 剩余 7 个区块用同样方式再跑两次。

## 步骤 3：填内容

文本：

```js
const sec = penpotUtils.findShape(s => s.name === "sec-Search", board);
const t = penpot.createText("搜索目的地");
t.growType = "auto-height";
t.fontSize = 14;
sec.insertChild(sec.children.length, t);
penpotUtils.setParentXY(t, 16, 20);
```

图片（本地模式）：

```
import_image(filePath="C:/assets/hero.png", x=..., y=..., width=358)
```

远程模式改用 `penpot.uploadMediaData`，见 `../auth.md`。

## 步骤 4：验收

```js
const board = penpotUtils.findShapeById(storage.homeBoardId);
const outside = penpotUtils.analyzeDescendants(board, (root, s) =>
  penpotUtils.isContainedIn(s, root) ? null : { name: s.name, x: s.x, y: s.y, w: s.width, h: s.height }
);
return {
  board: { w: board.width, h: board.height },
  sections: board.children.map(c => ({ name: c.name, y: c.y, h: c.height })),
  outside
};
```

再执行 `export_shape(board.id, "png", "shape")` 目视确认。

## 常见失败

| 现象 | 原因 | 处理 |
|---|---|---|
| 区块重叠 | 用了固定 offset，没考虑已有子元素 | 按最大底边计算 |
| 区块跑到画板外 | 把相对坐标当绝对坐标 | `y = board.y + offset` |
| 第二次执行多出重复区块 | 没做幂等检查 | 先按 name 查重 |
| 30 秒超时 | 一次建完 11 个区块及内容 | 每片 3–4 个区块 |

## 现场需核对

- 画板是否启用 flex/grid：启用后子元素坐标由布局接管，本案例的 `y` 赋值会失效。
- `penpot.createText` 的签名与默认 `growType`：用 `penpot_api_info("Penpot", "createText")` 确认。