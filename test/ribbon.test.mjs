import { test } from "node:test";
import assert from "node:assert/strict";
import { ribbonWidth, createFlow, stepFlow, RIBBON_N } from "../js/ribbon.js";

function seeded(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}
const W = 1440;
const H = 900;
function env(over = {}) {
  return { w: W, h: H, active: true, mouse: { x: -9999, y: -9999, vx: 0, vy: 0 }, random: seeded(5), ...over };
}
const segLen = (r, i) => Math.hypot(r.pts[i + 1].x - r.pts[i].x, r.pts[i + 1].y - r.pts[i].y);
function runUntil(flow, e, pred, max = 20000) {
  for (let i = 0; i < max; i++) {
    stepFlow(flow, e);
    if (pred(flow)) return i;
  }
  return -1;
}

test("ribbon width: both ends taper to a point (no cut-off ends), full in the middle, the tail tapers longer", () => {
  assert.equal(ribbonWidth(0), 0);
  assert.equal(ribbonWidth(1), 0);
  assert.equal(ribbonWidth(0.5), 1);
  for (let s = 0; s < 0.3; s += 0.01) assert.ok(ribbonWidth(s + 0.01) >= ribbonWidth(s) - 1e-9, "widens smoothly from the head");
  for (let s = 0.7; s < 0.99; s += 0.01) assert.ok(ribbonWidth(s + 0.01) <= ribbonWidth(s) + 1e-9, "narrows smoothly to the tail");
  // 尾巴那端的漸細比較長（像飄帶的尾）
  assert.ok(ribbonWidth(0.92) < ribbonWidth(0.08), "tail end is the longer, finer taper");
});

test("ribbon: drifts in from off screen, floats across, leaves the other side, and a new one comes later", () => {
  const flow = createFlow({ firstIn: 0 });
  const e = env();
  stepFlow(flow, e);
  const r = flow.ribbon;
  assert.ok(r, "a ribbon starts");
  assert.equal(r.pts.length, RIBBON_N);
  const start = r.pts[0].x;
  assert.ok(start < 0 || start > W, "starts off screen");
  let onScreen = 0;
  const t = runUntil(flow, e, (f) => {
    if (f.ribbon && f.ribbon.pts.some((p) => p.x > 0 && p.x < W)) onScreen++;
    return f.ribbon !== r;
  });
  assert.ok(t > 0, "it leaves eventually");
  assert.ok(onScreen / 60 > 15, `on screen long enough to enjoy (${(onScreen / 60).toFixed(1)}s)`);
  const next = runUntil(flow, e, (f) => f.ribbon && f.ribbon !== r);
  assert.ok(next > 60 * 4, "a pause before the next one");
});

test("ribbon: calm — no part ever moves faster than 3 px per frame, and the silk never stretches", () => {
  for (let seed = 1; seed <= 4; seed++) {
    const flow = createFlow({ firstIn: 0 });
    const e = env({ random: seeded(seed) });
    let max = 0;
    let stretch = 0;
    for (let i = 0; i < 3000; i++) {
      const r = flow.ribbon;
      const before = r ? r.pts.map((p) => ({ x: p.x, y: p.y })) : null;
      stepFlow(flow, e);
      if (!r || flow.ribbon !== r) continue;
      r.pts.forEach((p, k) => (max = Math.max(max, Math.hypot(p.x - before[k].x, p.y - before[k].y))));
      for (let k = 0; k < RIBBON_N - 1; k++) stretch = Math.max(stretch, segLen(r, k) / r.seg);
    }
    assert.ok(max <= 3, `seed ${seed}: ${max.toFixed(2)} px/frame`);
    assert.ok(stretch < 1.06, `seed ${seed}: stretched to ${stretch.toFixed(3)}x`);
  }
});

test("ribbon: the free tail flutters more than the middle (it is not a stiff stick)", () => {
  const flow = createFlow({ firstIn: 0 });
  const e = env();
  for (let i = 0; i < 600; i++) stepFlow(flow, e);
  const r = flow.ribbon;
  // 每一點相對「頭」的位置晃動多少（扣掉整條往前飄的部分）
  const track = (k) => {
    const xs = [];
    return { k, xs };
  };
  const mid = track(Math.floor(RIBBON_N * 0.45));
  const tail = track(RIBBON_N - 2);
  for (let i = 0; i < 600; i++) {
    stepFlow(flow, e);
    for (const t of [mid, tail]) {
      const p = r.pts[t.k];
      const q = r.pts[t.k - 1];
      t.xs.push(Math.atan2(p.y - q.y, p.x - q.x)); // 這一段的方向
    }
  }
  const wobble = (xs) => {
    let m = 0;
    for (let i = 1; i < xs.length; i++) m += Math.abs(Math.atan2(Math.sin(xs[i] - xs[i - 1]), Math.cos(xs[i] - xs[i - 1])));
    return m;
  };
  assert.ok(wobble(tail.xs) > wobble(mid.xs) * 1.5, `tail ${wobble(tail.xs).toFixed(2)} vs middle ${wobble(mid.xs).toFixed(2)}`);
});

test("ribbon: a passing mouse gently pushes the silk near it, not the far parts", () => {
  const flow = createFlow({ firstIn: 0 });
  const e = env();
  runUntil(flow, e, (f) => f.ribbon && f.ribbon.pts[Math.floor(RIBBON_N / 2)].x > W * 0.4);
  const r = flow.ribbon;
  const k = Math.floor(RIBBON_N / 2);
  const twin = createFlow({ firstIn: 0 });
  twin.ribbon = structuredClone(r);
  twin.timer = flow.timer;
  const calm = env({ random: seeded(9) });
  const stir = env({ random: seeded(9), mouse: { x: r.pts[k].x, y: r.pts[k].y + 10, vx: 0, vy: -30 } });
  stepFlow(twin, calm);
  stepFlow(flow, stir);
  const moved = (i) => Math.hypot(flow.ribbon.pts[i].x - twin.ribbon.pts[i].x, flow.ribbon.pts[i].y - twin.ribbon.pts[i].y);
  assert.ok(moved(k) > 0.3, `near part moved ${moved(k).toFixed(2)}`);
  assert.ok(moved(k) < 3, "a gentle push, not a yank");
  assert.ok(moved(0) < 0.05 && moved(RIBBON_N - 1) < 0.05, "far ends untouched this frame");
});

test("ribbon: on another deity's page it fades away and no new one comes", () => {
  const flow = createFlow({ firstIn: 0 });
  const e = env();
  for (let i = 0; i < 300; i++) stepFlow(flow, e);
  assert.ok(flow.ribbon);
  e.active = false;
  let lastAlpha = flow.alpha;
  const t = runUntil(flow, e, (f) => {
    assert.ok(f.alpha <= lastAlpha + 1e-9, "only fades out");
    lastAlpha = f.alpha;
    return !f.ribbon;
  });
  assert.ok(t > 50, "fades slowly, not a pop");
  for (let i = 0; i < 3000; i++) stepFlow(flow, e);
  assert.equal(flow.ribbon, null, "none while inactive");
});
