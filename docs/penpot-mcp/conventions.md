# 命名与分组规范

> 性质：**项目约定**，可按团队覆盖。与 `pitfalls.md` 里的硬规则不同，这里的条目违反不会报错，但会让文件难以维护。

## 1. 文件与页面

- 文件：`<产品>-<端>-<版本>`，例：`app-mobile-v2`。
- 页面固定顺序，编号即排序：

```
00-Cover
01-Foundations
02-Components
03-Screens
99-Archive
```

- 页面名用英文短横线，不用空格和中文，避免跨工具与导出时编码问题。

## 2. 画板（Board）

命名格式：`<模块>/<屏幕>-<状态>`

```
home/Home-Default
vehicle/Add-Empty
vehicle/Add-Filled
profile/Profile-Loading
```

- 一屏一个 board，不要用 group 冒充屏幕。
- 同尺寸屏幕放在连续区域，横向间距 80px、按 8 的倍数排列。
- 设计稿不放业务说明文字；说明写在页面外的注释板或交付文档里。

## 3. 图层前缀

| 前缀 | 用途 | 示例 |
|---|---|---|
| `bg/` | 背景 | `bg/Page` |
| `nav/` | 导航 | `nav/TopBar` |
| `card/` | 卡片容器 | `card/Vehicle` |
| `btn/` | 按钮 | `btn/Primary` |
| `txt/` | 文本 | `txt/Title` |
| `img/` | 图片 | `img/Hero` |
| `ico/` | 图标 | `ico/Arrow` |
| `input/` | 输入 | `input/Phone` |
| `div/` | 分隔线 | `div/Hairline` |

前缀小写，语义名用大驼峰。前缀的价值是让 `findShapes` 的谓词可读、可批量筛选。

## 4. 分组

- **Board** 承担区块与屏幕；**Group** 只承担逻辑单元。
- 嵌套不超过 3 层；超了就拆 board，不要靠深嵌套组织。
- 只有「需要整体移动/整体隐藏」的元素才分组；纯装饰不分组。
- Group 不裁剪子元素；只有 board 的 `clipContent` 会裁剪。元素"消失"时先查这个。

## 5. 组件

命名：`cmp/<domain>/<Component>/<variant>`

```
cmp/base/Button/Primary
cmp/base/Input/Default
cmp/vehicle/Card/Compact
```

- 变体维度不超过 3 个：`size` / `state` / `tone`。
- 实例保持与主组件同名，便于反查；覆盖只允许文本和图标，不改结构。
- 不复制形状来"仿造"组件；要新样式就加变体。

## 6. Token

```
color/<role>/<name>       color/bg/surface, color/text/secondary
space/<n>                 space/4, space/16
radius/<n>                radius/8
font/<role>/<step>        font/heading/1
shadow/<level>            shadow/2
```

`role` 只取：`bg` / `text` / `border` / `brand` / `state`。

## 7. 归档

- 废弃屏幕移到 `99-Archive`，不直接删除。
- 归档保留 30 天后清理；清理前确认没有组件实例仍引用其内部元素。