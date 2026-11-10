// 稻穗（福德正神）：土地公護田、春祈秋報。畫面左下、右下兩叢稻子跟著風擺，滑鼠經過會被撥開。
// 純計算（方便測試），畫面在 js/tudi-view.js。時間單位是「格」（60 格 ≈ 1 秒）。
//
// 每根稻子只記一個數：b＝頂端往旁邊彎了多少（佔稻子高度的比例，正的往右）。
// 風給每根一個「想彎到的位置」，一波一波從田裡吹過；稻子像彈簧一樣慢慢跟過去（有阻尼，不會一直晃）。
// 滑鼠經過穗頭：照滑鼠移動的方向推一下。

export const MAX_BEND = 0.28; // 最多彎到稻子高度的 28%

const K = 0.003; // 彈簧：多快回到風要的位置（越大越快）
const DAMP = 0.075; // 阻尼：彈回來時不會來回晃
const PUSH = 0.012; // 滑鼠推的力道
const TIP_SPEED = 1.9; // 頂端最快每格移動幾像素
const FADE = 1 / 60; // 淡入淡出 1 秒

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export function createField({ w, h, random }) {
  const perSide = clamp(Math.round((w / 1440) * 34), 12, 34);
  const stalks = [];
  for (let side = 0; side < 2; side++) {
    for (let i = 0; i < perSide; i++) {
      const d = w * 0.26 * random() ** 1.8; // 離畫面邊緣多遠：越靠邊越密
      const depth = random(); // 0＝最後排、1＝最前排
      const sh = h * (0.15 + 0.15 * depth * (0.7 + 0.3 * random())); // 後排比較矮
      stalks.push({
        side, // 0＝左下、1＝右下
        dFrac: d / w, // 離畫面邊緣多遠（佔畫面寬的比例）：調整視窗大小時照比例搬
        hFrac: sh / h,
        x: side ? w - d : d,
        base: h + 4 + depth * h * 0.03, // 前排的根在比較下面（近大遠小）
        h: sh,
        depth,
        flip: random() < 0.5 ? -1 : 1, // 穗頭垂向哪邊
        seed: random() * 10,
        b: 0,
        v: 0
      });
    }
  }
  stalks.sort((a, b) => a.depth - b.depth); // 從後排畫到前排
  const field = { stalks, alpha: 0, t: 0 };
  for (const s of stalks) s.b = windBend(s, 0); // 一開始就在風裡的位置，不會先彈一下
  return field;
}

// 風要這根稻子彎到哪：一道慢慢的大波（從田的一邊吹到另一邊）加一點細細的抖動
function windBend(s, t) {
  return 0.02 + 0.035 * Math.sin(t * 0.012 - s.x * 0.0035 + s.seed * 0.6) + 0.008 * Math.sin(t * 0.031 + s.seed);
}

export function stepField(f, e) {
  f.alpha = e.active ? Math.min(1, f.alpha + FADE) : Math.max(0, f.alpha - FADE);
  f.t += 1;
  for (const s of f.stalks) {
    s.v += (windBend(s, f.t) - s.b) * K - s.v * DAMP;
    s.v += brush(s, e.mouse);
    const vmax = TIP_SPEED / s.h;
    s.v = clamp(s.v, -vmax, vmax);
    s.b += s.v;
    if (Math.abs(s.b) > MAX_BEND) {
      s.b = Math.sign(s.b) * MAX_BEND;
      s.v = 0;
    }
  }
}

// 滑鼠經過穗頭附近：照滑鼠左右移動的方向推一下（越近推越多）
function brush(s, m) {
  if (!m || !m.vx) return 0;
  const hx = s.x + s.b * s.h;
  const hy = s.base - s.h * 0.8;
  const r = Math.max(60, s.h * 0.35);
  const d = Math.hypot(m.x - hx, m.y - hy);
  if (d >= r) return 0;
  return (clamp(m.vx, -40, 40) / s.h) * PUSH * (1 - d / r);
}

// 調整視窗大小：同一片稻子照比例搬到新位置（不重新種，畫面才不會跳）
export function resizeField(f, w, h) {
  for (const s of f.stalks) {
    s.x = s.side ? w - s.dFrac * w : s.dFrac * w;
    s.h = s.hFrac * h;
    s.base = h + 4 + s.depth * h * 0.03;
  }
}
