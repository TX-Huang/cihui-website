// 蟠桃樹（瑤池金母頁）：點一下，葉子和花一片一片飄起來，排成道場 LINE 的 QR code；再點一下飄回去。
// 純計算（方便測試），畫面在 js/peach-view.js。時間單位是「格」（60 格 ≈ 1 秒）。
import { fitGate } from "./layout.js";
import { GATE } from "./gate.js";

export const DURATION = 150; // 樹 → QR（或倒回去）要 2.5 秒
export const QR_DARK = "#1f3a2c"; // 深玉綠：QR 的深色格
export const QR_LIGHT = "#f7f2e6"; // 象牙白：QR 卡片（淺色格和四邊留白）
const QUIET = 4; // QR 四邊至少留 4 格空白，手機才掃得到
const TOP = 70; // 上面的選單列底下才開始（選單是半透明毛玻璃，蓋到 QR 會掃不到）
const BELOW = 60; // 卡片下面留位子放說明文字和「打開 LINE」
const MAX_DELAY = 0.35; // 每片出發的時間錯開（佔整段的比例）
const FADE_IN = 1 / 36; // 進金母頁：0.6 秒浮現（使用者可能很快就滑走）
const FADE = 1 / 60; // 換頁：1 秒淡掉

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const smooth = (t) => {
  const x = clamp(t, 0, 1);
  return x * x * (3 - 2 * x);
};

// 珠簾門洞右邊在畫面上的位置（跟 style.css 的 .gate-wrap 一樣：置中、底部在 101vh、從底部縮放）
function doorRight(vw, vh) {
  const s = fitGate(vw, vh, GATE);
  return vw / 2 + (GATE.door.x1 - GATE.w / 2) * s;
}

// 桃樹在畫面上的位置：大門右前方、站在畫面底部，不擋珠簾門洞
export function treeRect(vw, vh, aspect) {
  const phone = vw <= 720;
  const margin = phone ? 6 : Math.max(16, vw * 0.025);
  // 手機：畫面高的三成，但至少 120 像素寬（橫拿時畫面很矮）
  const hWant = phone ? Math.min(vh * 0.6, Math.max(vh * 0.3, 120 / aspect)) : Math.min(vh * 0.56, 600);
  const xMin = doorRight(vw, vh) + 6;
  const w = Math.min(hWant * aspect, vw - margin - xMin);
  const h = w / aspect;
  return { x: vw - margin - w, y: vh - h - (phone ? vh * 0.03 : vh * 0.01), w, h };
}

// QR 卡片：桌機浮在樹冠上，手機在畫面中間；每格是整數像素，四邊留 4 格白
export function qrBox(n, tree, vw, vh) {
  const total = n + QUIET * 2;
  const phone = vw <= 720;
  const target = Math.min(phone ? Math.min(vw * 0.8, 300) : 280, vh - TOP - BELOW); // 橫拿的手機很矮：卡片跟著變小
  const m = Math.max(4, Math.floor(target / total));
  const size = total * m;
  const cx = phone ? vw / 2 : tree.x + tree.w / 2;
  const cy = phone ? vh * 0.45 : tree.y + tree.h * 0.35;
  const x = Math.round(clamp(cx - size / 2, 12, vw - 12 - size)); // 整數像素：格子之間不會有細縫
  const y = Math.round(clamp(cy - size / 2, TOP, vh - BELOW - size));
  return { m, n, card: { x, y, w: size, h: size }, x0: x + QUIET * m, y0: y + QUIET * m };
}

// 每個深色格子配一片葉子：樹冠左邊的葉子飛到 QR 左邊的格子（路線不會亂交叉），出發時間錯開
// rows：QR 格子（"0101…" 字串）；pts：樹冠上的點 {x, y（0～1，圖上的比例）, color: [r, g, b]}
export function assignParticles(rows, pts, random) {
  const n = rows.length;
  const cells = [];
  rows.forEach((r, row) => [...r].forEach((v, col) => v === "1" && cells.push({ row, col, k: col + row * 0.3 + random() * 3 })));
  cells.sort((a, b) => a.k - b.k);
  const order = [...pts].sort((a, b) => a.x + a.y * 0.3 - (b.x + b.y * 0.3));
  return cells.map((c, i) => {
    const q = order[Math.floor((i * order.length) / cells.length)];
    return { row: c.row, col: c.col, sx: q.x, sy: q.y, color: q.color, delay: random() * MAX_DELAY, n };
  });
}

// 一片葉子在 t（0＝樹、1＝QR）的位置、大小、顏色
export function particlePose(p, t, tree, box) {
  const e = smooth((t - p.delay) / (1 - MAX_DELAY));
  const ax = tree.x + p.sx * tree.w;
  const ay = tree.y + p.sy * tree.h;
  const bx = box.x0 + (p.col + 0.5) * box.m;
  const by = box.y0 + (p.row + 0.5) * box.m;
  const lift = 24 + 0.15 * Math.hypot(bx - ax, by - ay); // 路上微微往上飄
  const dark = [1, 3, 5].map((i) => parseInt(QR_DARK.slice(i, i + 2), 16));
  return {
    x: ax + (bx - ax) * e,
    y: ay + (by - ay) * e - lift * Math.sin(Math.PI * e),
    size: box.m * (0.7 + 0.3 * e),
    // 前半段保持原本的花、葉顏色，快到格子時才慢慢變成深玉綠
    color: p.color.map((v, k) => Math.round(v + (dark[k] - v) * smooth((e - 0.45) / 0.55))),
    e
  };
}

export function createPeach({ still = false } = {}) {
  return { t: 0, target: 0, alpha: 0, still };
}

export function togglePeach(s) {
  s.target = s.target ? 0 : 1;
}

// 過一格：active＝在金母這一頁。不在就慢慢淡掉，並且回到樹的樣子
export function stepPeach(s, { active }) {
  s.alpha = clamp(s.alpha + (active ? FADE_IN : -FADE), 0, 1);
  if (!active) s.target = 0;
  if (s.still) s.t = s.target;
  else s.t = s.t < s.target ? Math.min(s.target, s.t + 1 / DURATION) : Math.max(s.target, s.t - 1 / DURATION);
}

// (x, y) 點到桃樹（樹的時候）或 QR 卡片（QR 出來的時候）了嗎
export function hitPeach(s, x, y, tree, box) {
  const r = s.t > 0.5 ? box.card : tree;
  return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
}
