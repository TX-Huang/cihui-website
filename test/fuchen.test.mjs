// 九天玄女的拂塵：訪客可以拿起來揮，把霧拂開（「拂去塵埃」；標語「智慧之神，指引明路」）
// - 平常：拂塵浮在右邊，照廟裡神像拿的角度：玉柄從頭往右下斜（約 35 度，手握那端在右下），
//   毛從頭順著玉柄的反方向冒出來（往左上），繞一個柔順的弧再往下垂（重力）；整支都在畫面內；毛隨風慢慢擺
// - 按住拂塵拖：拂塵跟著手走，有一點延遲但不會跳；毛往移動的反方向拖
// - 放開：拂塵花 1～3 秒慢慢回到原位，不會跳
// - 按在拂塵外面：拿不起來
// - 大門下半部飄著一片雲海（開場動畫的雲）；拿著拂塵揮過去，毛掃過的地方霧變淡；放著不管，霧幾秒內慢慢回來
// - 拂塵自己隨風擺：不會把霧掃掉
// - 滑鼠快速劃過毛、點它、或拿著揮得快：甩一下、掃出一朵雲氣；1.5 秒內只掃出一朵，最多同時 3 朵
// - 離開玄女頁：還拿著就放下，慢慢淡掉，也不會再掃出雲
import { test } from "node:test";
import assert from "node:assert/strict";
import { fuchenAnchor, createFuchen, stepFuchen, hairOffset, whiskPose, whiskPoint, fogAt, MAX_WISPS, HAIR_ROOT } from "../js/fuchen.js";

const W = 1440;
const H = 900;
const still = { x: -9999, y: -9999, vx: 0, vy: 0 };
const run = (s, n, env) => {
  for (let i = 0; i < n; i++) stepFuchen(s, { W, H, active: true, mouse: still, ...env });
};
const at = (p) => ({ x: p.x, y: p.y, vx: 0, vy: 0 });

test("rests on the right, held like the temple statues: handle slanting down-right from the head, hair hanging straight down", () => {
  for (const [w, h] of [[1440, 900], [1024, 768], [390, 844]]) {
    const s = createFuchen();
    for (let i = 0; i < 60; i++) stepFuchen(s, { W: w, H: h, active: true, mouse: still });
    const p = whiskPose(s, w, h); // x, y = 頭（毛掛的地方）
    const hand = whiskPoint(p, 0); // 玉柄另一端（手握的地方）
    const tip = whiskPoint(p, 1);
    assert.ok(p.x > w * 0.6 && p.x < w, `on the right (${p.x})`);
    const slant = Math.atan2(hand.x - p.x, hand.y - p.y);
    assert.ok(slant > 0.45 && slant < 0.8, `handle slants down-right about 35 degrees (${slant.toFixed(2)})`);
    // 毛根：從頭往左上冒出來（不是一刀切平貼在玉柄旁邊）
    const root = whiskPoint(p, HAIR_ROOT + 0.02);
    assert.ok(root.x < p.x - 1 && root.y < p.y + 2, `hair leaves the head toward the upper left (${(root.x - p.x).toFixed(1)}, ${(root.y - p.y).toFixed(1)})`);
    // 繞過去以後直直垂下來
    const knee = whiskPoint(p, 0.6);
    assert.ok(Math.abs(tip.x - knee.x) < p.len * 0.05, `then hangs straight down (${(tip.x - knee.x).toFixed(1)})`);
    assert.ok(tip.x < p.x && tip.x > p.x - p.len * 0.2, "hangs just left of the head");
    // 弧是連續的：相鄰兩點距離都差不多（沒有斷掉、沒有折角）
    let prev = whiskPoint(p, HAIR_ROOT);
    for (let t = HAIR_ROOT + 0.01; t <= 1.0001; t += 0.01) {
      const q = whiskPoint(p, t);
      const d = Math.hypot(q.x - prev.x, q.y - prev.y);
      assert.ok(Math.abs(d - 0.01 * p.len) < 0.003 * p.len, `smooth arc (step ${d.toFixed(2)})`);
      prev = q;
    }
    assert.ok(tip.y > p.y + p.len * 0.5, "long hair below the head");
    for (const q of [p, hand, tip]) {
      assert.ok(q.x > 0 && q.x < w && q.y > h * 0.1 && q.y < h * 0.92, "on screen");
    }
    assert.ok(p.len >= 160, "big enough to see");
  }
});

test("the jade handle stays put; the hair bends more toward the tip", () => {
  assert.equal(hairOffset(0, 30), 0);
  assert.ok(Math.abs(hairOffset(0.5, 30)) < Math.abs(hairOffset(1, 30)));
  assert.ok(Math.abs(hairOffset(1, 30) - 30) < 1e-9, "the tip moves by the full bend");
});

test("idle: a small, slow sway, no clouds, the fog stays", () => {
  const s = createFuchen();
  run(s, 60);
  const { len } = fuchenAnchor(W, H);
  const fog0 = fogAt(s, W * 0.5, H * 0.85, W, H);
  let last = s.bend;
  for (let i = 0; i < 60 * 20; i++) {
    run(s, 1);
    assert.ok(Math.abs(s.bend) <= len * 0.08, `small (${s.bend.toFixed(1)})`);
    assert.ok(Math.abs(s.bend - last) <= 1.5, "slow");
    last = s.bend;
  }
  assert.equal(s.wisps.length, 0, "no clouds by itself");
  const tip = whiskPoint(whiskPose(s, W, H), 1);
  const fresh = createFuchen();
  run(fresh, 10);
  assert.ok(Math.abs(fogAt(s, tip.x, tip.y, W, H) - fogAt(fresh, tip.x, tip.y, W, H)) < 0.01, "the swaying hair does not sweep the fog");
  assert.ok(Math.abs(fogAt(s, W * 0.5, H * 0.85, W, H) - fog0) < 0.01);
});

test("clouds fill the lower part of the page, none at the top", () => {
  const s = createFuchen();
  run(s, 10);
  assert.ok(fogAt(s, W * 0.5, H * 0.85, W, H) > 0.9, "bottom: full of cloud");
  assert.equal(fogAt(s, W * 0.5, H * 0.3, W, H), 0, "top: clear (title and roofs stay visible)");
});

test("press on the whisk and drag: it follows the hand smoothly, the hair trails behind", () => {
  const s = createFuchen();
  run(s, 60);
  const p0 = whiskPose(s, W, H);
  const grab = whiskPoint(p0, 0.6);
  run(s, 1, { mouse: at(grab), click: grab });
  assert.ok(s.held, "picked up");
  // 往左拖 600 像素（每格 12 像素）
  let last = whiskPose(s, W, H);
  for (let i = 1; i <= 50; i++) {
    const m = { x: grab.x - i * 12, y: grab.y, vx: -12, vy: 0 };
    run(s, 1, { mouse: m });
    const p = whiskPose(s, W, H);
    assert.ok(Math.hypot(p.x - last.x, p.y - last.y) <= 30, "no jumps");
    last = p;
  }
  // 手停下來後，拂塵跟上
  run(s, 60, { mouse: at({ x: grab.x - 600, y: grab.y }) });
  const p = whiskPose(s, W, H);
  assert.ok(Math.abs(p.x - (p0.x - 600)) < 20 && Math.abs(p.y - p0.y) < 20, `follows the hand (${p.x - p0.x}, ${p.y - p0.y})`);
  // 往左移動：毛往右拖（局部座標往 +x 偏）
  const s2 = createFuchen();
  run(s2, 60);
  const g2 = whiskPoint(whiskPose(s2, W, H), 0.6);
  run(s2, 1, { mouse: at(g2), click: g2 });
  let maxBend = 0;
  for (let i = 1; i <= 15; i++) {
    run(s2, 1, { mouse: { x: g2.x - i * 12, y: g2.y, vx: -12, vy: 0 } });
    maxBend = Math.max(maxBend, s2.bend);
  }
  assert.ok(maxBend > 5, `hair trails behind (${maxBend.toFixed(1)})`);
});

test("letting go: it drifts back home over 1-3 seconds, no jumps", () => {
  const s = createFuchen();
  run(s, 60);
  const home = whiskPose(s, W, H);
  const grab = whiskPoint(home, 0.6);
  run(s, 1, { mouse: at(grab), click: grab });
  for (let i = 1; i <= 40; i++) run(s, 1, { mouse: { x: grab.x - i * 12, y: grab.y + i * 3, vx: -12, vy: 3 } });
  run(s, 1, { release: true });
  assert.equal(s.held, false);
  let last = whiskPose(s, W, H);
  let n = 0;
  while (n < 600) {
    run(s, 1);
    const p = whiskPose(s, W, H);
    assert.ok(Math.hypot(p.x - last.x, p.y - last.y) <= 12, "glides, no jumps");
    last = p;
    n++;
    if (Math.hypot(p.x - home.x, p.y - home.y) < home.len * 0.03) break; // 平常會輕輕上下浮，差一點點就算到了
  }
  assert.ok(n >= 60 && n <= 180, `takes 1-3 s (${n} frames)`);
});

test("a press and release in the same frame is a tap: it flicks, and the whisk is not left stuck to the hand", () => {
  const s = createFuchen();
  run(s, 60);
  const pt = whiskPoint(whiskPose(s, W, H), 0.6);
  run(s, 1, { mouse: at(pt), click: pt, release: true });
  assert.equal(s.held, false, "not held");
  assert.equal(s.wisps.length, 1, "counts as a tap");
});

test("pressing away from the whisk does not pick it up", () => {
  const s = createFuchen();
  run(s, 60);
  for (const pt of [{ x: W * 0.3, y: H * 0.5 }, { x: W * 0.5, y: H * 0.8 }, { x: 10, y: 10 }]) {
    run(s, 1, { mouse: at(pt), click: pt });
    assert.equal(s.held, false);
  }
});

test("sweeping the held whisk clears the fog where the hair passes; it slowly comes back", () => {
  const s = createFuchen();
  run(s, 60);
  const grab = whiskPoint(whiskPose(s, W, H), 0.3);
  run(s, 1, { mouse: at(grab), click: grab });
  // 拿到下半部，左右揮幾下
  const y = H * 0.62;
  const path = [];
  for (let x = grab.x; x > W * 0.3; x -= 15) path.push(x);
  for (let k = 0; k < 2; k++) {
    for (const x of path) run(s, 1, { mouse: { x, y, vx: -15, vy: 0 } });
    for (const x of [...path].reverse()) run(s, 1, { mouse: { x, y, vx: 15, vy: 0 } });
  }
  const tip = whiskPoint(whiskPose(s, W, H), 0.9);
  const swept = fogAt(s, W * 0.45, tip.y, W, H);
  const untouched = fogAt(s, W * 0.45, H * 0.99, W, H);
  assert.ok(swept < untouched * 0.5, `swept clear (${swept.toFixed(2)} vs ${untouched.toFixed(2)})`);
  run(s, 1, { release: true });
  run(s, 60);
  const after1s = fogAt(s, W * 0.45, tip.y, W, H);
  assert.ok(after1s < untouched * 0.8, "still clearer one second later (not instant)");
  run(s, 60 * 8);
  assert.ok(fogAt(s, W * 0.45, tip.y, W, H) > swept + 0.1, "the fog comes back");
});

test("a quick swipe across the hair flicks it and sweeps out one cloud", () => {
  const s = createFuchen();
  run(s, 120);
  const p = whiskPose(s, W, H);
  const mid = whiskPoint(p, 0.75);
  let maxBend = 0;
  // 快速往左劃過毛
  for (let x = mid.x + 150; x > mid.x - 150; x -= 25) {
    stepFuchen(s, { W, H, active: true, mouse: { x, y: mid.y, vx: -25, vy: 0 } });
    maxBend = Math.max(maxBend, Math.abs(s.bend));
  }
  let pinned = 0;
  for (let i = 0; i < 40; i++) {
    stepFuchen(s, { W, H, active: true, mouse: still });
    maxBend = Math.max(maxBend, Math.abs(s.bend));
    if (Math.abs(s.bend) >= p.len * 0.35 - 1e-6) pinned++;
  }
  assert.ok(pinned <= 3, `swings back instead of sticking at the limit (${pinned} frames)`);
  assert.ok(maxBend > p.len * 0.1, `flicks (${maxBend.toFixed(1)})`);
  assert.equal(s.wisps.length, 1, "one cloud");
  // 馬上再劃一次：還在冷卻，不會多一朵
  for (let x = mid.x - 150; x < mid.x + 150; x += 25) stepFuchen(s, { W, H, active: true, mouse: { x, y: mid.y, vx: 25, vy: 0 } });
  assert.equal(s.wisps.length, 1, "at most one cloud per 1.5 s");
});

test("clicking the whisk also sweeps out a cloud; never more than 3 at once", () => {
  const s = createFuchen();
  run(s, 60);
  for (let k = 0; k < 6; k++) {
    const pt = whiskPoint(whiskPose(s, W, H), 0.7);
    stepFuchen(s, { W, H, active: true, mouse: at(pt), click: pt });
    run(s, 1, { release: true });
    run(s, 100);
    assert.ok(s.wisps.length <= MAX_WISPS);
  }
  assert.ok(s.wisps.length >= 2);
});

test("waving the held whisk fast also sweeps out clouds, at most one per 1.5 s", () => {
  const s = createFuchen();
  run(s, 60);
  const grab = whiskPoint(whiskPose(s, W, H), 0.5);
  run(s, 1, { mouse: at(grab), click: grab });
  const n0 = s.wisps.length;
  for (let i = 0; i < 80; i++) {
    const x = grab.x - 300 + 300 * Math.cos(i * 0.4);
    run(s, 1, { mouse: { x, y: grab.y, vx: -120 * Math.sin(i * 0.4), vy: 0 } });
  }
  const made = s.wisps.length - n0;
  assert.ok(made >= 1 && made <= 2, `${made} clouds in 80 frames`);
});

test("clouds drift left, fade in then out, then disappear", () => {
  const s = createFuchen();
  run(s, 60);
  const pt = whiskPoint(whiskPose(s, W, H), 0.7);
  stepFuchen(s, { W, H, active: true, mouse: at(pt), click: pt });
  run(s, 1, { release: true });
  const c = s.wisps[0];
  const x0 = c.x;
  let peak = 0;
  let n = 0;
  let lastA = c.alpha;
  while (s.wisps.includes(c) && n < 60 * 20) {
    run(s, 1);
    const al = c.alpha;
    assert.ok(Math.abs(al - lastA) <= 1 / 30 + 1e-9, "no pop");
    lastA = al;
    peak = Math.max(peak, al);
    n++;
  }
  assert.ok(!s.wisps.includes(c), "gone");
  assert.ok(n >= 60 * 3, "lingers a few seconds");
  assert.ok(c.x < x0 - 100, "drifted left");
  assert.ok(peak > 0.6);
});

test("leaving the 玄女 page: puts the whisk down, fades out slowly, no clouds while away", () => {
  const s = createFuchen();
  run(s, 120);
  assert.ok(s.alpha > 0.99);
  const grab = whiskPoint(whiskPose(s, W, H), 0.6);
  run(s, 1, { mouse: at(grab), click: grab });
  assert.ok(s.held);
  let n = 0;
  while (s.alpha > 0) {
    const pt = whiskPoint(whiskPose(s, W, H), 0.7);
    stepFuchen(s, { W, H, active: false, mouse: still, click: pt });
    n++;
  }
  assert.equal(s.held, false, "put down");
  assert.ok(n >= 30, `fades over ${n} frames`);
  assert.equal(s.wisps.length, 0);
});
