// 虎爺（福德正神頁的彩蛋）：供桌下的虎爺，小小的趴在右下角的稻穗裡。點牠會慢慢抬頭，再趴回去。
// 純計算（方便測試），畫面在 js/tudi-view.js。時間單位是「格」（60 格 ≈ 1 秒）。

const ASPECT = 300 / 349; // 圖的高／寬（assets/elements/tiger.webp）
const UP = 72; // 抬頭 1.2 秒
const HOLD = 120; // 停 2 秒
const DOWN = 90; // 趴回去 1.5 秒
const FADE = 1 / 60;

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const smooth = (t) => t * t * (3 - 2 * t);

// 虎爺在畫面上佔的範圍（右下角、整隻在畫面內）
export function tigerBox(w, h) {
  const bw = clamp(w * 0.075, 60, 120);
  const bh = bw * ASPECT;
  const cx = w * 0.86;
  const y1 = h - h * 0.012;
  return { x0: cx - bw / 2, y0: y1 - bh, x1: cx + bw / 2, y1 };
}

export function createTiger() {
  return { state: "rest", lift: 0, t: 0, alpha: 0 };
}

export function stepTiger(g, e) {
  g.alpha = e.active ? Math.min(1, g.alpha + FADE) : Math.max(0, g.alpha - FADE);
  if (g.state === "rest") {
    if (e.active && e.click && inside(tigerBox(e.w, e.h), e.click)) g.state = "up";
    return;
  }
  if (g.state === "up") {
    g.lift = Math.min(1, g.lift + 1 / UP);
    if (g.lift >= 1) {
      g.state = "hold";
      g.t = 0;
    }
  } else if (g.state === "hold") {
    g.t += 1;
    if (g.t >= HOLD) g.state = "down";
  } else {
    g.lift = Math.max(0, g.lift - 1 / DOWN);
    if (g.lift <= 0) g.state = "rest";
  }
}

const inside = (b, p) => p.x >= b.x0 && p.x <= b.x1 && p.y >= b.y0 && p.y <= b.y1;

// 現在的樣子：angle＝往後仰多少（負的＝頭抬起來）、rise＝身體前半抬高多少（佔虎爺寬度的比例）
export function tigerPose(g) {
  const k = smooth(g.lift);
  return { lift: g.lift, angle: -0.07 * k, rise: 0.04 * k };
}
