// 九天玄女的拂塵：掛在畫面右側，白毛隨風慢慢擺；滑鼠快速劃過（或點它）就甩一下、掃出一朵雲氣。
// 純計算（方便測試），畫面在 js/fuchen-view.js。時間單位是「格」（60 格 ≈ 1 秒）。
//
// bend：毛尖往左右偏多少（像素）。像彈簧一樣被拉回「風」要的位置（風慢慢變），所以擺得慢、不會抖。
// 毛的每一段照 hairOffset 偏：玉柄（s = 0）不動，越往毛尖偏越多。

export const MAX_WISPS = 3;
const COOL = 90; // 甩一下之後 1.5 秒內不會再掃出雲
const WISP_LIFE = 300; // 一朵雲 5 秒
const ASPECT = 394 / 900; // 拂塵圖的寬高比（tools/prep_weapons.py）

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// 拂塵在畫面上的位置：x 是玉柄的中線，y 是玉柄頂端，len 是整支的長度
// 右邊留 9% 給神明的名字（右側那一排）
export function fuchenAnchor(W, H) {
  const len = clamp(Math.min(H * 0.42, W * 0.55), 160, 420);
  return { x: W * 0.9 - (len * ASPECT) / 2, y: H * 0.3, len };
}

// 毛的第 s 段（0 = 毛根、1 = 毛尖）往旁邊偏多少
export function hairOffset(s, bend) {
  return bend * s * s;
}

export function createFuchen() {
  return { t: 0, bend: 0, bendV: 0, alpha: 0, cool: 0, wisps: [] };
}

function onWhisk(p, a) {
  return p && Math.abs(p.x - a.x) < a.len * 0.35 && p.y > a.y && p.y < a.y + a.len;
}

function flick(s, a, dir) {
  if (s.cool > 0) return; // 冷卻中：不再加力（不然一直劃會被推到底卡住）
  s.cool = COOL;
  s.bendV += dir * a.len * 0.03;
  if (s.wisps.length >= MAX_WISPS) return;
  s.wisps.push({ x: a.x + s.bend, y: a.y + a.len * 0.85, vx: -0.8, vy: -0.15, age: 0, alpha: 0 });
}

export function stepFuchen(s, { W, H, active, mouse, click }) {
  const a = fuchenAnchor(W, H);
  s.t++;
  s.alpha = active ? Math.min(1, s.alpha + 1 / 60) : Math.max(0, s.alpha - 1 / 60);
  if (s.cool > 0) s.cool--;

  // 風：兩個慢慢的波疊在一起，不會規律得像鐘擺
  const wind = a.len * 0.035 * (Math.sin(s.t * 0.011) + 0.5 * Math.sin(s.t * 0.027 + 1));
  if (active && mouse && onWhisk(mouse, a) && mouse.y > a.y + a.len * 0.35) {
    s.bendV += clamp(mouse.vx || 0, -40, 40) * 0.015;
    if (Math.abs(mouse.vx || 0) > 12) flick(s, a, Math.sign(mouse.vx));
  }
  if (active && onWhisk(click, a)) flick(s, a, s.bend >= 0 ? -1 : 1);
  s.bendV += (wind - s.bend) * 0.01;
  s.bendV *= 0.92;
  s.bend = clamp(s.bend + s.bendV, -a.len * 0.35, a.len * 0.35);

  // 雲氣：往左慢慢飄；慢慢出現、慢慢淡掉
  for (const w of s.wisps) {
    w.age++;
    w.x += w.vx;
    w.y += w.vy;
    w.alpha = 0.9 * Math.min(1, w.age / 40) * Math.min(1, (WISP_LIFE - w.age) / 60);
  }
  s.wisps = s.wisps.filter((w) => w.age < WISP_LIFE);
}
