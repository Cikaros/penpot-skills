/**
 * Penpot 操作中容易写错的纯逻辑。
 *
 * 这些函数不依赖 Penpot 运行时，可以在 Node 里直接测试；
 * 技能里的可粘贴代码块应保持与这里的行为一致。
 */

import { imageKind } from "./snippets/image-kind.mjs";

export { imageKind };

export function headHex(bytes, max = 8) {
  if (!bytes || typeof bytes.length !== "number") return "";
  return Array.from(bytes)
    .slice(0, max)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join(" ");
}


export function assertImageBytes(bytes, label = "image") {
  const kind = imageKind(bytes);
  if (!kind) {
    throw new Error(`${label}: not a supported image (head=${headHex(bytes)})`);
  }
  return kind;
}

/** 把 Penpot 写入时归一化的 "btn / Primary" 还原为 "btn/Primary"。 */
export function normalizeName(name) {
  return String(name ?? "").replace(/\s*\/\s*/g, "/");
}

/** 判断子元素是否越出直接父容器（使用 parentX/parentY 的相对坐标）。 */
export function isOverflow(child, parent) {
  if (!child || !parent) return false;
  const x = Number(child.parentX);
  const y = Number(child.parentY);
  const w = Number(child.width);
  const h = Number(child.height);
  if (![x, y, w, h].every(Number.isFinite)) return false;
  return x < 0 || y < 0 || x + w > parent.width || y + h > parent.height;
}

/**
 * 逐层检查每个容器的直接子元素，返回纯数据（不含 shape 代理）。
 * 这是对 analyzeDescendants 只比较顶层 board 的补充。
 */
export function collectOverflows(root, { maxDepth = Infinity, limit = 1000 } = {}) {
  const out = [];

  function walk(container, depth) {
    if (!container || depth > maxDepth || out.length >= limit) return;
    for (const child of container.children ?? []) {
      if (isOverflow(child, container)) {
        out.push({
          id: child.id,
          name: child.name,
          parent: container.name,
          px: child.parentX,
          py: child.parentY,
          w: child.width,
          h: child.height,
        });
        if (out.length >= limit) return;
      }
      if (child.children?.length) walk(child, depth + 1);
    }
  }

  walk(root, 0);
  return out;
}

export function requireShape(shape, label) {
  if (!shape) throw new Error(`shape not found: ${label}`);
  return shape;
}
