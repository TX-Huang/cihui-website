// 九天玄女的拂塵（取代舊的丹鳳；新丹鳳搬到金母頁）
// - 掛在畫面右側（標題、說明字的下面，大門右邊），玉柄在上、白毛往下垂
// - 平常：毛隨風慢慢擺（很小、很慢，優雅）；玉柄幾乎不動
// - 滑鼠快速劃過毛（或點它）：拂塵甩一下，掃出一朵雲氣，雲氣慢慢往左飄、淡掉；1.5 秒內只掃出一朵，最多同時 3 朵
// - 離開玄女頁：慢慢淡掉，也不會再掃出雲
import { test } from "node:test";
import assert from "node:assert/strict";
import { fuchenAnchor, createFuchen, stepFuchen, hairOffset, MAX_WISPS } from "../js/fuchen.js";

const W = 1440;
const H = 900;
const still = { x: -9999, y: -9999, vx: 0, vy: 0 };
const run = (s, n, env) => {
  for (let i = 0; i < n; i++) stepFuchen(s, { W, H, active: true, mouse: still, ...env });
};

test("hangs on the right side, fully on screen", () => {
  for (const [w, h] of [[1440, 900], [1024, 768], [390, 844]]) {
    const a = fuchenAnchor(w, h);
    assert.ok(a.x > w * 0.6 && a.x < w, `x ${a.x}`);
    assert.ok(a.y > h * 0.1, "below the top bar");
    assert.ok(a.y + a.len < h * 0.92, "tip above the bottom");
    assert.ok(a.len >= 160, "big enough to see");
  }
});

test("the jade handle stays put; the hair bends more toward the tip", () => {
  assert.equal(hairOffset(0, 30), 0);
  assert.ok(Math.abs(hairOffset(0.5, 30)) < Math.abs(hairOffset(1, 30)));
  assert.ok(Math.abs(hairOffset(1, 30) - 30) < 1e-9, "the tip moves by the full bend");
});

test("idle: a small, slow sway", () => {
  const s = createFuchen();
  const { len } = fuchenAnchor(W, H);
  let last = s.bend;
  for (let i = 0; i < 60 * 20; i++) {
    run(s, 1);
    assert.ok(Math.abs(s.bend) <= len * 0.08, `small (${s.bend.toFixed(1)})`);
    assert.ok(Math.abs(s.bend - last) <= 1.5, "slow");
    last = s.bend;
  }
  assert.equal(s.wisps.length, 0, "no clouds by itself");
});

test("a quick swipe across the hair flicks it and sweeps out one cloud", () => {
  const s = createFuchen();
  run(s, 120);
  const a = fuchenAnchor(W, H);
  const y = a.y + a.len * 0.75;
  let maxBend = 0;
  // 快速往左劃過毛
  for (let x = a.x + 150; x > a.x - 150; x -= 25) {
    stepFuchen(s, { W, H, active: true, mouse: { x, y, vx: -25, vy: 0 } });
    maxBend = Math.max(maxBend, Math.abs(s.bend));
  }
  let pinned = 0;
  for (let i = 0; i < 40; i++) {
    stepFuchen(s, { W, H, active: true, mouse: still });
    maxBend = Math.max(maxBend, Math.abs(s.bend));
    if (Math.abs(s.bend) >= a.len * 0.35 - 1e-6) pinned++;
  }
  assert.ok(pinned <= 3, `swings back instead of sticking at the limit (${pinned} frames)`);
  assert.ok(maxBend > a.len * 0.1, `flicks (${maxBend.toFixed(1)})`);
  assert.equal(s.wisps.length, 1, "one cloud");
  // 馬上再劃一次：還在冷卻，不會多一朵
  for (let x = a.x - 150; x < a.x + 150; x += 25) stepFuchen(s, { W, H, active: true, mouse: { x, y, vx: 25, vy: 0 } });
  assert.equal(s.wisps.length, 1, "at most one cloud per 1.5 s");
});

test("clicking the whisk also sweeps out a cloud; never more than 3 at once", () => {
  const s = createFuchen();
  const a = fuchenAnchor(W, H);
  for (let k = 0; k < 6; k++) {
    stepFuchen(s, { W, H, active: true, mouse: still, click: { x: a.x, y: a.y + a.len * 0.7 } });
    run(s, 100);
    assert.ok(s.wisps.length <= MAX_WISPS);
  }
  assert.ok(s.wisps.length >= 2);
});

test("clouds drift left, fade in then out, then disappear", () => {
  const s = createFuchen();
  const a = fuchenAnchor(W, H);
  stepFuchen(s, { W, H, active: true, mouse: still, click: { x: a.x, y: a.y + a.len * 0.7 } });
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

test("leaving the 玄女 page: fades out slowly, no clouds while away", () => {
  const s = createFuchen();
  run(s, 120);
  assert.ok(s.alpha > 0.99);
  const a = fuchenAnchor(W, H);
  let n = 0;
  while (s.alpha > 0) {
    stepFuchen(s, { W, H, active: false, mouse: still, click: { x: a.x, y: a.y + a.len * 0.7 } });
    n++;
  }
  assert.ok(n >= 30, `fades over ${n} frames`);
  assert.equal(s.wisps.length, 0);
});
