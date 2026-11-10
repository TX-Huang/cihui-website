// 稻穗（福德正神頁）的規格：
// 1. 畫面左下、右下兩個角落各一叢稻子，中間（階梯）空著；越靠外越密；後排比較矮
// 2. 平常跟著風慢慢擺，風像一波一波從田裡吹過（每根擺的時間不一樣），擺得很小、很慢
// 3. 滑鼠經過稻穗，會被順著滑鼠的方向撥開；遠的稻子不受影響；撥得溫柔，不會甩
// 4. 滑鼠離開後，慢慢彈回來，不會來回大力晃
// 5. 滑鼠再怎麼用力甩，稻子彎的程度也有上限
// 6. 換到別的神明：慢慢淡掉；回來：慢慢出現
import { test } from "node:test";
import assert from "node:assert/strict";
import { createField, stepField, MAX_BEND } from "../js/rice.js";

const W = 1440;
const H = 900;
function seeded(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}
const still = () => ({ x: -9999, y: -9999, vx: 0, vy: 0 });
const env = (over = {}) => ({ w: W, h: H, active: true, mouse: still(), ...over });
const tipX = (s) => s.x + s.b * s.h; // 稻穗頂端的水平位置

test("layout: two clumps in the bottom corners, the middle stays clear, denser toward the edges, back rows shorter", () => {
  const f = createField({ w: W, h: H, random: seeded(1) });
  assert.ok(f.stalks.length >= 30 && f.stalks.length <= 70, `${f.stalks.length} stalks`);
  let outer = 0;
  let inner = 0;
  for (const s of f.stalks) {
    assert.ok(s.x < W * 0.3 || s.x > W * 0.7, `stays out of the middle (x ${s.x.toFixed(0)})`);
    assert.ok(s.base >= H, "rooted at or below the bottom edge");
    assert.ok(s.h >= H * 0.14 && s.h <= H * 0.32, `height ${(s.h / H).toFixed(2)} of the screen`);
    const d = Math.min(s.x, W - s.x); // 離最近的畫面邊緣多遠
    if (d < W * 0.15) outer++;
    else inner++;
  }
  assert.ok(outer > inner * 1.3, `denser toward the edges (${outer} vs ${inner})`);
  assert.ok(f.stalks.some((s) => s.x < W / 2) && f.stalks.some((s) => s.x > W / 2), "both corners");
  for (let i = 1; i < f.stalks.length; i++) assert.ok(f.stalks[i].depth >= f.stalks[i - 1].depth, "drawn back to front");
  const back = f.stalks.filter((s) => s.depth < 0.4);
  const front = f.stalks.filter((s) => s.depth > 0.7);
  const avg = (a) => a.reduce((m, s) => m + s.h, 0) / a.length;
  assert.ok(back.length && front.length && avg(back) < avg(front), "back rows are shorter");
});

test("calm sway: small, slow, and in waves (not all stalks in lockstep)", () => {
  const f = createField({ w: W, h: H, random: seeded(2) });
  const e = env();
  let maxSpeed = 0;
  let maxBend = 0;
  let spread = 0;
  for (let i = 0; i < 60 * 20; i++) {
    const before = f.stalks.map(tipX);
    stepField(f, e);
    f.stalks.forEach((s, k) => {
      maxSpeed = Math.max(maxSpeed, Math.abs(tipX(s) - before[k]));
      maxBend = Math.max(maxBend, Math.abs(s.b));
    });
    const bs = f.stalks.map((s) => s.b);
    const mean = bs.reduce((a, b) => a + b, 0) / bs.length;
    spread = Math.max(spread, Math.sqrt(bs.reduce((a, b) => a + (b - mean) ** 2, 0) / bs.length));
  }
  assert.ok(maxSpeed <= 0.5, `tips move at most ${maxSpeed.toFixed(2)} px/frame`);
  assert.ok(maxSpeed >= 0.03, `but they do move (${maxSpeed.toFixed(3)})`);
  assert.ok(maxBend <= 0.1, `small sway (${maxBend.toFixed(3)} of the height)`);
  assert.ok(spread > 0.005, `different stalks are at different points of the sway (${spread.toFixed(4)})`);
});

// 兩片一樣的田：一片有滑鼠經過、一片沒有，比較差多少
function twins(seed) {
  const a = createField({ w: W, h: H, random: seeded(seed) });
  const b = structuredClone(a);
  for (let i = 0; i < 120; i++) {
    stepField(a, env());
    stepField(b, env());
  }
  return [a, b];
}

test("a passing mouse brushes the nearby stalks the way it moves, gently; far stalks are untouched", () => {
  const [stir, calm] = twins(3);
  const k = stir.stalks.findIndex((s) => s.x < W / 2 && s.depth > 0.7);
  const s = stir.stalks[k];
  const headY = s.base - s.h * 0.85;
  let maxSpeed = 0;
  // 滑鼠從左往右掃過這根稻穗的穗頭
  for (let i = 0; i < 20; i++) {
    const x = tipX(s) - 100 + i * 10;
    const before = stir.stalks.map(tipX);
    stepField(stir, env({ mouse: { x, y: headY, vx: 10, vy: 0 } }));
    stepField(calm, env());
    stir.stalks.forEach((q, j) => (maxSpeed = Math.max(maxSpeed, Math.abs(tipX(q) - before[j]))));
  }
  const pushed = stir.stalks[k].b - calm.stalks[k].b;
  assert.ok(pushed > 0.02, `pushed the way the mouse moved (${pushed.toFixed(3)})`);
  assert.ok(maxSpeed <= 2, `gently (${maxSpeed.toFixed(2)} px/frame)`);
  stir.stalks.forEach((q, j) => {
    if (q.x > W / 2) assert.ok(Math.abs(q.b - calm.stalks[j].b) < 1e-9, "the other corner is untouched");
  });
});

test("after the mouse leaves, stalks ease back without big swings", () => {
  const [stir, calm] = twins(4);
  const k = stir.stalks.findIndex((s) => s.x > W / 2 && s.depth > 0.7);
  const s = stir.stalks[k];
  for (let i = 0; i < 20; i++) {
    stepField(stir, env({ mouse: { x: tipX(s) + 100 - i * 10, y: s.base - s.h * 0.85, vx: -10, vy: 0 } }));
    stepField(calm, env());
  }
  const diff = () => stir.stalks[k].b - calm.stalks[k].b;
  let peak = 0;
  let back = 0;
  for (let i = 0; i < 60 * 4; i++) {
    stepField(stir, env());
    stepField(calm, env());
    peak = Math.min(peak, diff());
    back = Math.max(back, diff());
  }
  assert.ok(peak < -0.02, "it was pushed left");
  assert.ok(Math.abs(diff()) < 0.01, `back to the wind sway after 4 s (${diff().toFixed(4)})`);
  assert.ok(back <= Math.abs(peak) * 0.4, `springs back without a big swing the other way (${back.toFixed(3)} vs ${peak.toFixed(3)})`);
});

test("even a wild mouse cannot bend a stalk past the limit", () => {
  const f = createField({ w: W, h: H, random: seeded(5) });
  for (let i = 0; i < 600; i++) {
    const s = f.stalks[i % f.stalks.length];
    stepField(f, env({ mouse: { x: tipX(s), y: s.base - s.h * 0.8, vx: (i % 2 ? 1 : -1) * 400, vy: 300 } }));
    for (const q of f.stalks) assert.ok(Math.abs(q.b) <= MAX_BEND + 1e-9);
  }
  assert.ok(MAX_BEND <= 0.3);
});

test("leaving the page fades the field out slowly; coming back fades it in", () => {
  const f = createField({ w: W, h: H, random: seeded(6) });
  const e = env();
  for (let i = 0; i < 200; i++) stepField(f, e);
  assert.equal(f.alpha, 1);
  e.active = false;
  let n = 0;
  let last = f.alpha;
  while (f.alpha > 0 && n < 1000) {
    stepField(f, e);
    assert.ok(f.alpha <= last);
    last = f.alpha;
    n++;
  }
  assert.ok(n >= 45, `fades out over ${n} frames`);
  e.active = true;
  n = 0;
  while (f.alpha < 1 && n < 1000) {
    stepField(f, e);
    n++;
  }
  assert.ok(n >= 45, `fades in over ${n} frames`);
});
