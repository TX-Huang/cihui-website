// 中壇元帥的乾坤圈和火尖槍（取代混天綾）。純計算（方便測試），畫面在 js/weapons-view.js。
// 時間單位是「格」（60 格 ≈ 1 秒）。
//
// 乾坤圈：浮在左下，慢慢上下浮、輕輕左右擺（turn 慢慢走，畫的時候擺動角度 = 0.12 × sin(turn)）。
//   點它：沿一道弧飛出去（往右、先往上再往下），繞過大門前面再飛回原位，約 2.7 秒。
//   《封神演義》哪吒用乾坤圈打敖丙，圈打出去會再回到手上。
// 火尖槍：斜立在右邊，輕輕浮動；槍尖的火一直冒出小火星。
// 風火輪：一對浮在下方中間（腳踏風火輪）。火焰是 AI Video 做的影片（tools/prep_fenghuolun.py），
//   影片裡輪子幾乎不轉，所以輪子另外剪下來由程式慢慢順時針轉（wheelAngle）。

export const MAX_SPARKS = 60;
const THROW = 160; // 飛一圈幾格
const TIP = [0.95, 0.055]; // 火焰中心在槍圖裡的位置（tools/prep_weapons.py 量的槍尖，往內一點）
const SPEAR_ASPECT = 900 / 897;
const WHEELS_ASPECT = 1.8; // 一對風火輪連火焰的寬高比（tools/prep_fenghuolun.py 裁出來的）

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export function ringHome(W, H) {
  const size = clamp(Math.min(W, H) * 0.22, 80, 220);
  return { x: Math.max(size / 2 + W * 0.04, W * 0.13), y: H * 0.68, size };
}

export function spearPose(W, H, t = 0) {
  const h = clamp(Math.min(H * 0.5, W * 0.42), 150, 480);
  const w = h * SPEAR_ASPECT;
  const x = W * 0.91 - w / 2; // 右邊留 9% 給神明的名字
  const y = H * 0.55 + 4 * Math.sin(t * 0.018);
  return { x, y, w, h, tip: { x: x - w / 2 + w * TIP[0], y: y - h / 2 + h * TIP[1] } };
}

export function wheelsPose(W, H, t = 0) {
  const w = clamp(W * 0.3, 140, 440);
  const h = w / WHEELS_ASPECT;
  return { x: W / 2, y: H - h / 2 - H * 0.03 + 3 * Math.sin(t * 0.02), w, h };
}

export function createWeapons() {
  return { t: 0, alpha: 0, turn: 0, spin: 0, thrown: false, u: 0, sparks: [], wheelAngle: 0 };
}

export function ringPose(s, W, H) {
  const home = ringHome(W, H);
  let x = home.x;
  let y = home.y + 6 * Math.sin(s.t * 0.025);
  if (s.thrown) {
    const e = (1 - Math.cos(Math.PI * s.u)) / 2; // 出去和回來都慢慢加速、慢慢停
    x += W * 0.45 * Math.sin(Math.PI * e);
    y -= H * 0.15 * Math.sin(2 * Math.PI * e);
  }
  return { x, y, size: home.size, turn: s.turn, spin: s.spin };
}

export function stepWeapons(s, { W, H, active, random, click }) {
  s.t++;
  s.alpha = active ? Math.min(1, s.alpha + 1 / 60) : Math.max(0, s.alpha - 1 / 60);

  if (active && click && !s.thrown) {
    const p = ringPose(s, W, H);
    if (Math.hypot(click.x - p.x, click.y - p.y) < p.size * 0.6) {
      s.thrown = true;
      s.u = 0;
    }
  }
  if (s.thrown) {
    s.u += 1 / THROW;
    s.spin += 0.3 * Math.sin(Math.PI * s.u); // 飛的時候轉得快，回到手上慢下來
    if (s.u >= 1) {
      s.thrown = false;
      s.u = 0;
    }
  }
  s.turn += 0.006;
  s.wheelAngle += 0.02; // 約 5 秒轉一圈

  // 火星：從槍尖冒出來，往上飄、慢慢淡掉
  for (const p of s.sparks) {
    p.age++;
    p.x += p.vx;
    p.y += p.vy;
    p.alpha = (1 - p.age / p.life) ** 1.3;
  }
  s.sparks = s.sparks.filter((p) => p.age < p.life);
  if (active && s.sparks.length < MAX_SPARKS && random() < 0.5) {
    const { tip } = spearPose(W, H, s.t);
    s.sparks.push({
      x: tip.x + (random() - 0.5) * 20,
      y: tip.y + (random() - 0.5) * 16,
      vx: -0.2 + random() * 0.5,
      vy: -0.5 - random() * 0.6,
      age: 0,
      life: 60 + random() * 50,
      size: 1 + random() * 1.5,
      alpha: 1
    });
  }
}
