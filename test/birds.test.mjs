import { test } from "node:test";
import assert from "node:assert/strict";
import { flapPose, curve, curveAt, createFlock, stepFlock, FLY_IN, FLY_OUT } from "../js/birds.js";

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

test("flapPose: wings go up → spread → down → spread, blending smoothly", () => {
  const seq = [];
  for (let p = 0; p < 1; p += 0.125) {
    const f = flapPose(p);
    seq.push(f.mix < 0.5 ? f.a : f.b);
  }
  assert.deepEqual(seq, ["up", "up", "mid", "mid", "down", "down", "mid", "mid"]);
  // 連續：相鄰兩點的「主要畫面」不會跳過一格
  const f1 = flapPose(0.24);
  const f2 = flapPose(0.26);
  assert.equal(f1.b, "mid");
  assert.equal(f2.a, "mid");
});

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
