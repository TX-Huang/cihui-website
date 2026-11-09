import { test } from "node:test";
import assert from "node:assert/strict";
import { curve, curveAt, createFlock, stepFlock, FLY_IN, FLY_OUT } from "../js/birds.js";

const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

function seeded(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

// 假的畫面：1440 x 900，大門上 6 個可以停的點
const PERCHES = [
  { x: 300, y: 380, face: 1 },
  { x: 400, y: 380, face: 1 },
  { x: 650, y: 300, face: 1 },
  { x: 790, y: 300, face: -1 },
  { x: 1040, y: 380, face: -1 },
  { x: 1140, y: 380, face: -1 }
];
function env(over = {}) {
  return {
    w: 1440,
    h: 900,
    active: true,
    mouse: { x: -9999, y: -9999, speed: 0 },
    perch: (i) => PERCHES[i],
    perchCount: PERCHES.length,
    random: seeded(7),
    ...over
  };
}

test("curve: starts at the start, ends exactly at the perch, faces where it is going", () => {
  const c = curve({ x: -100, y: 100 }, { x: 600, y: 300 }, 0.3);
  assert.ok(dist(curveAt(c, 0), { x: -100, y: 100 }) < 1e-9);
  assert.ok(dist(curveAt(c, 1), { x: 600, y: 300 }) < 1e-9);
  const a = curveAt(c, 0.5);
  const b = curveAt(c, 0.51);
  assert.ok(Math.abs(Math.atan2(b.y - a.y, b.x - a.x) - a.angle) < 0.05);
});

function runUntil(flock, e, pred, max = 5000) {
  for (let i = 0; i < max; i++) {
    stepFlock(flock, e);
    if (pred(flock)) return i;
  }
  return -1;
}

test("birds: fly in, land exactly on a perch, slowing down at the end", () => {
  const flock = createFlock({ firstIn: 0 });
  const e = env();
  stepFlock(flock, e);
  assert.ok(flock.birds.length >= 1 && flock.birds.length <= 3);
  const b = flock.birds[0];
  const target = PERCHES[b.perch];
  const track = [];
  for (let i = 0; i < FLY_IN + 5 && b.state === "in"; i++) {
    track.push({ x: b.x, y: b.y });
    stepFlock(flock, e);
  }
  assert.equal(b.state, "perched");
  assert.ok(dist(b, target) < 1e-6, "feet on the perch");
  // 最後 10% 的時間走的距離，比平均速度慢很多（減速降落）
  const n = track.length;
  const last = dist(track[n - 1], track[Math.floor(n * 0.9)]);
  let total = 0;
  for (let i = 1; i < n; i++) total += dist(track[i], track[i - 1]);
  assert.ok(last < total * 0.1 * 0.5, `landing too fast: ${last.toFixed(1)} of ${total.toFixed(1)}`);
});

test("birds: after resting a while they fly off screen and are gone", () => {
  const flock = createFlock({ firstIn: 0 });
  const e = env();
  const t = runUntil(flock, e, (f) => f.birds.length > 0 && f.birds.every((b) => b.state === "gone" || b.state === "out"));
  assert.ok(t > FLY_IN, "they rested first");
  const leaving = flock.birds.filter((b) => b.state === "out");
  runUntil(flock, e, () => leaving.every((b) => b.state === "gone"), FLY_OUT + 10);
  for (const b of leaving) {
    assert.equal(b.state, "gone");
    assert.ok(b.x < -50 || b.x > 1490 || b.y < -50, `ended on screen at ${b.x | 0},${b.y | 0}`);
  }
});

test("birds: a fast mouse near a resting bird scares it away; a slow one does not", () => {
  const flock = createFlock({ firstIn: 0 });
  const e = env();
  runUntil(flock, e, (f) => f.birds.length && f.birds.every((b) => b.state === "perched"));
  const b = flock.birds[0];
  e.mouse = { x: b.x + 30, y: b.y - 20, speed: 5 };
  stepFlock(flock, e);
  assert.equal(b.state, "perched", "slow mouse: stays");
  e.mouse = { x: b.x + 30, y: b.y - 20, speed: 40 };
  stepFlock(flock, e);
  assert.equal(b.state, "out", "fast mouse: flies away");
});

test("birds: when the page moves to another deity, resting birds leave and no new ones come", () => {
  const flock = createFlock({ firstIn: 0 });
  const e = env();
  runUntil(flock, e, (f) => f.birds.length && f.birds.every((b) => b.state === "perched"));
  e.active = false;
  stepFlock(flock, e);
  assert.ok(flock.birds.every((b) => b.state === "out"));
  runUntil(flock, e, (f) => f.birds.every((b) => b.state === "gone"));
  for (let i = 0; i < 4000; i++) stepFlock(flock, e);
  assert.ok(flock.birds.every((b) => b.state === "gone"), "nobody comes while inactive");
});

test("birds: never two birds on the same perch, never more than three", () => {
  for (let seed = 1; seed <= 20; seed++) {
    const flock = createFlock({ firstIn: 0 });
    const e = env({ random: seeded(seed) });
    for (let i = 0; i < 6000; i++) {
      stepFlock(flock, e);
      const alive = flock.birds.filter((b) => b.state !== "gone");
      assert.ok(alive.length <= 3, `seed ${seed}: ${alive.length} birds`);
      const perches = alive.map((b) => b.perch);
      assert.equal(new Set(perches).size, perches.length, `seed ${seed}: two birds share a perch`);
    }
  }
});

test("birds: wings keep beating the whole flight (no stiff gliding pose)", () => {
  const flock = createFlock({ firstIn: 0 });
  const e = env();
  stepFlock(flock, e);
  const b = flock.birds[0];
  let last = b.flap;
  let frozen = 0;
  while (b.state === "in") {
    stepFlock(flock, e);
    if (b.flap === last) frozen++;
    last = b.flap;
  }
  assert.equal(frozen, 0, `wings froze for ${frozen} frames`);
});

test("birds: just before landing the bird brakes (wings up), and it settles after touching down", () => {
  const flock = createFlock({ firstIn: 0 });
  const e = env();
  stepFlock(flock, e);
  const b = flock.birds[0];
  const brakeAt = [];
  while (b.state === "in") {
    brakeAt.push(b.brake);
    stepFlock(flock, e);
  }
  const n = brakeAt.length;
  assert.ok(brakeAt.slice(Math.floor(n * 0.88)).every(Boolean), "brakes in the last stretch");
  assert.ok(!brakeAt.slice(0, Math.floor(n * 0.5)).some(Boolean), "does not brake early");
  assert.equal(b.landed, 0);
  stepFlock(flock, e);
  assert.equal(b.landed, 1, "counts frames since touchdown (for the settle)");
});

test("birds: turning around is a little hop — it flips facing in mid-air, not instantly", () => {
  const flock = createFlock({ firstIn: 0 });
  const e = env({ random: () => 0.9 }); // 0.9 → 轉身（不是轉正面）
  runUntil(flock, e, (f) => f.birds.length && f.birds[0].state === "perched");
  const b = flock.birds[0];
  const before = b.facing;
  b.look = 1;
  stepFlock(flock, e); // 開始跳
  assert.equal(b.hop, 0);
  assert.equal(b.facing, before, "not flipped at take-off of the hop");
  for (let i = 0; i < 10; i++) stepFlock(flock, e);
  assert.equal(b.facing, -before, "flipped by the middle of the hop");
});
