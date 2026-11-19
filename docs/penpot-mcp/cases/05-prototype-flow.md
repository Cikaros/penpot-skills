# 案例 05：可交互原型流

**目标**：用 Penpot 原生的 board interaction / flow 把两个屏幕连成一条可点击路径，并能读回验证。

> 适用：`execute_code` 可用的 2.18.7 环境。API 签名来自 `penpot_api_info`（`[源码]`）；V-08 已在 `test-design` / `99-MCP-Test` 合成页通过 API 结构验收 `[实测-合成页]`。**view mode 的实际点击尚未验证**；执行前仍用可丢弃页面。

## 步骤 1：准备两个 board

```js
const page = penpot.currentPage;
const start = penpot.createBoard();
start.name = "probe-Proto-Start";
start.resize(390, 844);
start.fills = [{ fillOpacity: 1, fillColor: "#FFFFFF" }];

const target = penpot.createBoard();
target.name = "probe-Proto-Target";
target.resize(390, 844);
target.fills = [{ fillOpacity: 1, fillColor: "#F8FAFC" }];

await penpot.waitForLayoutUpdate();

return {
  page: page.name,
  start: { id: start.id, name: start.name, w: start.width, h: start.height },
  target: { id: target.id, name: target.name, w: target.width, h: target.height },
};
```

`createBoard()` 会落在页面根；要嵌到别的 board 必须 `insertChild`。名称不要含 `/`。

## 步骤 2：添加点击跳转

```js
const nav = start.addInteraction("click", {
  type: "navigate-to",
  destination: target,
});

return {
  trigger: nav.trigger,
  action: nav.action.type,
  destination: nav.action.destination?.id ?? null,
};
```

API 约定（2.18.7）：

- `trigger`：`click` / `mouse-enter` / `mouse-leave` / `after-delay`；
- `action`：`navigate-to` / `open-overlay` / `toggle-overlay` / `close-overlay` / `previous-screen` / `open-url`；
- `after-delay` 的 `delay` 单位是毫秒；
- `navigate-to` 的目标是 board，不是任意 shape。

## 步骤 3：命名自动 flow

```js
const autoFlow = page.flows.find(f => f.startingBoard.id === start.id);
if (!autoFlow) throw new Error("addInteraction did not create a flow");
autoFlow.name = "probe-checkout";
return {
  flow: autoFlow.name,
  startingBoard: autoFlow.startingBoard.id,
  flows: page.flows.map(f => ({ name: f.name, board: f.startingBoard.id })),
};
```

2.18.7 的实测行为：**首次 `addInteraction` 会自动创建 `Flow 1`**；再调用 `page.createFlow` 会追加第二条 flow，而不是替换默认 flow。单路径场景应直接重命名自动 flow。需要多个起点/多条流程时，再用 `createFlow` 追加并分别命名。

一个 flow 只定义一个起点 board；同一页可以有多条 flow。不要把 flow 名和 board 名混用。

## 步骤 4：读回验收

```js
const readback = {
  interactions: start.interactions.map(i => ({
    trigger: i.trigger,
    action: i.action.type,
    destination: i.action.destination?.id ?? null,
    delay: i.delay ?? null,
  })),
  flows: page.flows.map(f => ({
    name: f.name,
    board: f.startingBoard.id,
  })),
};
return readback;
```

验收条件：

- [ ] `start.interactions` 里有且只有一条预期交互
- [ ] `action.type === "navigate-to"`
- [ ] `destination.id === target.id`
- [ ] flow 的 `startingBoard.id === start.id`
- [ ] 切到 view mode 后点击 start 能到 target（需人工/浏览器验收）

最后一条不能用 API 读回替代；API 只能证明数据结构，不证明原型在 view mode 真的可点。

## 步骤 5：清理

```js
try {
  // ...创建与断言...
} finally {
  if (flow) page.removeFlow(flow);
  if (nav) start.removeInteraction(nav);
  if (start) start.remove();
  if (target) target.remove();
}
```

清理顺序：flow → interaction → boards。只在可丢弃页面运行；不要删除当前工作页。

## 常见失败

| 现象 | 原因 | 处理 |
|---|---|---|
| `addInteraction` 报 destination 无效 | 传了 shape 或 id 字符串 | 传 board 对象 |
| 交互存在但 view mode 点不动 | 没有 flow / 起点不对 | 建 flow，确认 startingBoard |
| 多条 flow 混在一起 | 首次 `addInteraction` 自动建了 `Flow 1`，又手动 `createFlow` | 单路径重命名自动 flow；不要重复创建 |
| `after-delay` 不触发 | 没传 delay 或单位错 | 用毫秒，例如 `500` |
| 删除 board 后残留 flow | 先删 board | 先 `removeFlow`，再删 board |
| 把合成页通过写成真实文件通过 | 证据边界缺失 | 标 `[实测-合成页]` 或 `[待验证]` |

## 现场需核对

- `flow.name` 已确认可写 `[实测-合成页]`；`page.createFlow` 会追加 flow；
- `addInteraction` 的 action 对象是否要求其他必填字段（`navigate-to` 已验证）；
- `open-overlay` 的 `relativeTo` / `position` 在当前版本的实际行为；
- view mode 的点击路径与返回行为（**尚未验证**）。

## 相关

- `verification/probes/08-prototype-flow.js`：自清理探针。
- `docs/design/prototyping.md`：先决定是否需要可交互原型。
- `docs/design/states.md`：原型必须覆盖的状态。
