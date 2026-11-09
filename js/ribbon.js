// 混天綾（中壇元帥）：一條紅綢在風裡慢慢飄過畫面。
// 《封神演義》：哪吒出生時腹上圍著紅綾，太乙真人稱為「混天綾」，在九灣河一攪，河水盡紅。
// 純計算（方便測試），畫面在 js/ribbon-view.js。時間單位是「格」（60 格 ≈ 1 秒）。
//
// 做法：一串點（頭 → 尾）。頭被一道看不見的「風」慢慢帶著走（輕輕上下起伏）；
// 其他點跟著拖在後面，加上一道從頭傳到尾的波（越靠尾巴擺越大），像絲綢在風裡飄。
// 點和點之間保持固定距離（不會被拉長）。滑鼠經過會輕輕撥動附近那一段。

export const RIBBON_N = 40; // 幾個點
const SPEED = 1.2; // 往前飄的速度（每格像素）：慢慢飄過，約 30 秒
const DAMP = 0.94; // 空氣阻力（越小越黏、越慢）
const ITER = 8; // 保持長度要算幾次
const FLUTTER = 0.1; // 波的力道
const GRAVITY = 0.003; // 很輕，絲綢幾乎是浮著
const MOUSE_R = 90;
const GAP_MIN = 600; // 一條飄走後，下一條隔多久（10～20 秒）
const GAP_MAX = 1200;
const FADE = 1 / 120; // 換到別的神明：2 秒慢慢淡掉

const smooth = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));

// 綢帶的寬度（0～1），s 是從頭（0）到尾（1）的位置：
// 兩端都慢慢收成尖的（不是一刀切掉的布），尾巴那端收得比較長，像飄帶的尾
export function ribbonWidth(s) {
  return smooth(s / 0.1) * smooth((1 - s) / 0.22);
}

export function createFlow({ firstIn } = {}) {
  return { ribbon: null, timer: firstIn ?? 120 + Math.random() * 240, alpha: 0 };
}

// 風帶著頭走的高度：慢慢上下起伏
const windY = (L) => L.y0 + Math.sin(L.phase) * L.amp + Math.sin(L.phase * 2.3 + 1) * L.amp * 0.3;

function spawn(e) {
  const fromLeft = e.random() < 0.5;
  const dir = fromLeft ? 1 : -1;
  const len = Math.max(420, Math.min(900, e.w * 0.55));
  const seg = len / (RIBBON_N - 1);
  const y0 = e.h * (0.22 + e.random() * 0.3);
  const leader = {
    x: fromLeft ? -40 : e.w + 40,
    y: y0,
    y0,
    dir,
    phase: e.random() * Math.PI * 2,
    amp: e.h * (0.05 + e.random() * 0.04)
  };
  leader.y = windY(leader);
  // 一開始整條排在畫面外、拖在頭的後面（已經在往前飄，不是從靜止突然被拉走）
  const pts = [];
  for (let i = 0; i < RIBBON_N; i++) {
    const x = leader.x - dir * seg * i;
    pts.push({ x, y: leader.y, ox: x - dir * SPEED, oy: leader.y });
  }
  return { pts, seg, leader, t: 0, seed: e.random() * 10, age: 0 };
}

function stepRibbon(r, e) {
  r.t += 1;
  const L = r.leader;
  L.x += L.dir * SPEED;
  L.phase += 0.0045;
  L.y = windY(L);

  const p = r.pts;
  // 頭：輕輕跟著風走（不是釘死，所以頭那端也會有一點飄）
  const h = p[0];
  h.ox = h.x;
  h.oy = h.y;
  h.x += (L.x - h.x) * 0.12;
  h.y += (L.y - h.y) * 0.12;

  const m = e.mouse;
  const mvx = Math.max(-40, Math.min(40, m.vx || 0));
  const mvy = Math.max(-40, Math.min(40, m.vy || 0));
  for (let i = 1; i < RIBBON_N; i++) {
    const q = p[i];
    const s = i / (RIBBON_N - 1);
    const vx = (q.x - q.ox) * DAMP;
    const vy = (q.y - q.oy) * DAMP;
    q.ox = q.x;
    q.oy = q.y;
    // 這一段的法線（垂直方向）：波往這個方向推
    const a = p[i - 1];
    const dx = q.x - a.x;
    const dy = q.y - a.y;
    const d = Math.hypot(dx, dy) || 1;
    // 兩道波疊在一起：一道長而慢（大大的 S 形），一道短一點（尾巴的細擺）
    const wave = (Math.sin(i * 0.15 - r.t * 0.012 + r.seed) * 0.75 + Math.sin(i * 0.38 - r.t * 0.04 + r.seed * 2) * 0.28) * FLUTTER * (0.25 + 0.75 * s ** 1.3);
    q.x += vx + (-dy / d) * wave;
    q.y += vy + (dx / d) * wave + GRAVITY;
    // 滑鼠經過：照滑鼠移動的方向，輕輕撥一下附近的綢子
    const mdx = q.x - m.x;
    const mdy = q.y - m.y;
    const md = Math.hypot(mdx, mdy);
    if (md < MOUSE_R) {
      const f = 1 - md / MOUSE_R;
      q.x += mvx * 0.05 * f;
      q.y += mvy * 0.05 * f;
    }
  }

  // 保持每一段的長度（頭不動，其他兩邊各讓一半）
  for (let k = 0; k < ITER; k++) {
    for (let i = 1; i < RIBBON_N; i++) {
      const a = p[i - 1];
      const b = p[i];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const d = Math.hypot(dx, dy) || 1;
      const diff = (d - r.seg) / d;
      if (i === 1) {
        b.x -= dx * diff;
        b.y -= dy * diff;
      } else {
        b.x -= dx * diff * 0.5;
        b.y -= dy * diff * 0.5;
        a.x += dx * diff * 0.5;
        a.y += dy * diff * 0.5;
      }
    }
  }
  r.age += 1;
}

// 整條都飄出另一邊了嗎
function gone(r, e) {
  if (r.age > 6000) return true;
  return r.leader.dir > 0 ? r.pts.every((q) => q.x > e.w + 40) : r.pts.every((q) => q.x < -40);
}

export function stepFlow(flow, e) {
  if (!e.active) {
    // 換到別的神明：不再來新的；現在這條慢慢淡掉
    flow.timer = Math.max(flow.timer, 90);
    if (!flow.ribbon) return;
    flow.alpha = Math.max(0, flow.alpha - FADE);
    stepRibbon(flow.ribbon, e);
    if (flow.alpha <= 0) flow.ribbon = null;
    return;
  }
  if (!flow.ribbon) {
    flow.timer -= 1;
    if (flow.timer > 0) return;
    flow.ribbon = spawn(e);
  }
  flow.alpha = Math.min(1, flow.alpha + 1 / 90);
  stepRibbon(flow.ribbon, e);
  if (gone(flow.ribbon, e)) {
    flow.ribbon = null;
    flow.alpha = 0;
    flow.timer = GAP_MIN + e.random() * (GAP_MAX - GAP_MIN);
  }
}
