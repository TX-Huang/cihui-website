// 蟠桃樹（瑤池金母頁）：點一下，樹輕輕搖，桃花瓣翻轉飄落到旁邊的宣紙卡片上，
// 每片落下後像墨一樣暈開成一格，排成道場 LINE 的 QR code；再點一下倒回去。
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

// QR 卡片：桌機放在樹的左邊（樹大部分看得到，才看得出花瓣從樹上飄過去），不蓋到珠簾門洞；
// 手機放畫面中間。每格是整數像素，四邊留 4 格白
export function qrBox(n, tree, vw, vh) {
  const total = n + QUIET * 2;
  const phone = vw <= 720;
  const target = Math.min(phone ? Math.min(vw * 0.8, 300) : 280, vh - TOP - BELOW); // 橫拿的手機很矮：卡片跟著變小
  let m = Math.max(4, Math.floor(target / total));
  let cx = phone ? vw / 2 : tree.x + tree.w / 2;
  if (!phone) {
    const left = doorRight(vw, vh) + 12;
    // 卡片右邊最多蓋到樹寬的六成；放不下就把格子縮小一點
    while (m > 4 && Math.max(left, tree.x - total * m * 0.65) + total * m - tree.x > tree.w * 0.6) m--;
    cx = Math.max(left, tree.x - total * m * 0.65) + (total * m) / 2;
  }
  const size = total * m;
  const cy = phone ? vh * 0.45 : tree.y + tree.h * 0.35;
  const x = Math.round(clamp(cx - size / 2, 12, vw - 12 - size)); // 整數像素：格子之間不會有細縫
  const y = Math.round(clamp(cy - size / 2, TOP, vh - BELOW - size));
  return { m, n, card: { x, y, w: size, h: size }, x0: x + QUIET * m, y0: y + QUIET * m };
}

// 每個深色格子配一片花瓣：樹冠左邊的花瓣飛到 QR 左邊的格子（路線不會亂交叉），出發時間錯開
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

// (x, y) 點到桃樹了嗎；QR 出來的時候點卡片也算（卡片在樹旁邊，兩個都可以點回去）
export function hitPeach(s, x, y, tree, box) {
  const inside = (r) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
  return inside(tree) || (s.t > 0.5 && inside(box.card));
}

// ── 花瓣飄落、墨點暈開 ──
const FLIGHT = 0.45; // 每片花瓣飛多久（佔整段的比例）
const SOAK = 0.2; // 落下後暈開多久（MAX_DELAY + FLIGHT + SOAK = 1，最後一片剛好暈完）

// 樹輕輕搖一下（弧度）：一開始像一陣風，0.6 秒內停下來
export function treeSway(t) {
  const end = 0.22;
  if (t <= 0 || t >= end) return 0;
  const k = t / end;
  return 0.022 * Math.sin(k * Math.PI * 2) * (1 - k) * (1 - k);
}

// 一片花瓣在 t 的樣子：x, y, angle（翻轉）, size, alpha（花瓣本身）, ink（墨暈開了多少 0～1）, drift（離直線多遠）
export function petalPose(p, t, tree, box) {
  const u = clamp((t - p.delay) / FLIGHT, 0, 1);
  const e = smooth(u);
  const ink = smooth((t - p.delay - FLIGHT) / SOAK);
  const ax = tree.x + p.sx * tree.w;
  const ay = tree.y + p.sy * tree.h;
  const bx = box.x0 + (p.col + 0.5) * box.m;
  const by = box.y0 + (p.row + 0.5) * box.m;
  // 先被風往上、往外吹起來，再飄下來（二次曲線），一路左右擺
  const seed = p.sx * 37 + p.sy * 53;
  const cx = (ax + bx) / 2 + 40 + 30 * Math.sin(seed);
  const cy = Math.min(ay, by) - 50 - 0.2 * Math.abs(bx - ax);
  const q = 1 - e;
  const drift = 10 * Math.sin(seed + u * Math.PI * 4) * Math.sin(Math.PI * e);
  return {
    x: q * q * ax + 2 * q * e * cx + e * e * bx + drift,
    y: q * q * ay + 2 * q * e * cy + e * e * by,
    angle: seed + e * Math.PI * 3,
    size: box.m,
    alpha: smooth(u / 0.08) * (1 - ink),
    ink,
    drift: Math.abs(drift)
  };
}
