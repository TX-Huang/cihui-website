import { test } from "node:test";
import assert from "node:assert/strict";
import { curve, curveAt, createFlock, stepFlock, FLY_IN, FLY_OUT_MAX } from "../js/birds.js";

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
    hover: (i) => ({ x: PERCHES[i].x + 20 * PERCHES[i].face, y: PERCHES[i].y - 50 }), // 降落前先飛到的點（起飛影片最後一格的位置）
    clipLength: () => 80,
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

test("birds: fly in to the hover point (slowing down), then the landing clip puts its feet on the perch", () => {
  const flock = createFlock({ firstIn: 0 });
  const e = env();
  stepFlock(flock, e);
  assert.ok(flock.birds.length >= 1 && flock.birds.length <= 2);
  const b = flock.birds[0];
  const hover = e.hover(b.perch);
  const track = [];
  while (b.state === "in") {
    track.push({ x: b.x, y: b.y });
    stepFlock(flock, e);
  }
  assert.equal(b.state, "landing", "after flying in it plays the landing clip");
  assert.ok(dist(track[track.length - 1], hover) < 3, "arrives at the hover point");
  // 最後 10% 的時間走的距離，比平均速度慢很多（減速）
  const n = track.length;
  const last = dist(track[n - 1], track[Math.floor(n * 0.9)]);
  let total = 0;
  for (let i = 1; i < n; i++) total += dist(track[i], track[i - 1]);
  assert.ok(last < total * 0.1 * 0.5, `arriving too fast: ${last.toFixed(1)} of ${total.toFixed(1)}`);
  // 降落影片播的時候，位置就是停的地方（影片自己會讓鳥從上方降下來）
  while (b.state === "landing") {
    assert.ok(dist(b, PERCHES[b.perch]) < 1e-6);
    stepFlock(flock, e);
  }
  assert.equal(b.state, "perched");
});

test("birds: after resting a while they fly off screen and are gone", () => {
  const flock = createFlock({ firstIn: 0 });
  const e = env();
  const t = runUntil(flock, e, (f) => f.birds.length > 0 && f.birds.every((b) => ["gone", "out", "takeoff"].includes(b.state)));
  assert.ok(t > FLY_IN, "they rested first");
  const leaving = flock.birds.filter((b) => b.state !== "gone");
  runUntil(flock, e, () => leaving.every((b) => b.state === "gone"), FLY_OUT_MAX + 200);
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
  assert.equal(b.state, "takeoff", "fast mouse: takes off (plays the take-off clip, then flies away)");
  runUntil(flock, e, () => b.state !== "takeoff");
  assert.equal(b.state, "out");
});

test("birds: when the page moves to another deity, resting birds leave and no new ones come", () => {
  const flock = createFlock({ firstIn: 0 });
  const e = env();
  runUntil(flock, e, (f) => f.birds.length && f.birds.every((b) => b.state === "perched"));
  e.active = false;
  stepFlock(flock, e);
  assert.ok(flock.birds.every((b) => b.state === "takeoff"));
  runUntil(flock, e, (f) => f.birds.every((b) => b.state === "gone"));
  for (let i = 0; i < 4000; i++) stepFlock(flock, e);
  assert.ok(flock.birds.every((b) => b.state === "gone"), "nobody comes while inactive");
});

test("birds: never two birds on the same perch, never more than two", () => {
  for (let seed = 1; seed <= 20; seed++) {
    const flock = createFlock({ firstIn: 0 });
    const e = env({ random: seeded(seed) });
    for (let i = 0; i < 6000; i++) {
      stepFlock(flock, e);
      const alive = flock.birds.filter((b) => b.state !== "gone");
      assert.ok(alive.length <= 2, `seed ${seed}: ${alive.length} birds`);
      const perches = alive.map((b) => b.perch);
      assert.equal(new Set(perches).size, perches.length, `seed ${seed}: two birds share a perch`);
    }
  }
});

test("birds: fly calmly — never faster than 6 px per frame, coming in or going out", () => {
  for (let seed = 1; seed <= 10; seed++) {
    const flock = createFlock({ firstIn: 0 });
    const e = env({ random: seeded(seed) });
    let max = 0;
    const last = new Map();
    for (let i = 0; i < 6000; i++) {
      stepFlock(flock, e);
      for (const b of flock.birds) {
        if (b.state === "in" || b.state === "out") {
          const p = last.get(b);
          if (p && p.state === b.state) max = Math.max(max, Math.hypot(b.x - p.x, b.y - p.y));
        }
        last.set(b, { x: b.x, y: b.y, state: b.state });
      }
    }
    assert.ok(max <= 6, `seed ${seed}: ${max.toFixed(1)} px/frame`);
  }
});

test("birds: never flip around in the air — they arrive facing the perch's way and leave the way they face", () => {
  for (let seed = 1; seed <= 20; seed++) {
    const flock = createFlock({ firstIn: 0 });
    const e = env({ random: seeded(seed) });
    const seen = new Map(); // 每隻鳥：這一段（飛來＋降落、起飛＋飛走）的方向
    for (let i = 0; i < 6000; i++) {
      stepFlock(flock, e);
      for (const b of flock.birds) {
        const leg = b.state === "in" || b.state === "landing" ? "arrive" : b.state === "takeoff" || b.state === "out" ? "leave" : null;
        if (!leg) {
          seen.delete(b);
          continue;
        }
        const s = seen.get(b);
        if (s && s.leg === leg) assert.equal(b.facing, s.facing, `seed ${seed}: flipped during ${b.state}`);
        else seen.set(b, { leg, facing: b.facing });
        if (b.state === "landing") assert.equal(b.facing, PERCHES[b.perch].face, `seed ${seed}: lands facing the wrong way`);
      }
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
  while (b.state === "landing") stepFlock(flock, e);
  assert.equal(b.landed, 0);
  stepFlock(flock, e);
  assert.equal(b.landed, 1, "counts frames since touchdown (for the settle)");
});

test("birds: turning around is a little hop — it flips facing in mid-air, not instantly", () => {
  const flock = createFlock({ firstIn: 0 });
  const e = env({ random: () => 0.9 }); // 0.9 → 轉身（不是轉正面）
  runUntil(flock, e, (f) => f.birds.length && f.birds[0].state === "perched");
  const b = flock.birds[0];
  b.look = 9999;
  for (let i = 0; i < 20; i++) stepFlock(flock, e); // 先讓剛落地的狀態過去
  const before = b.facing;
  b.look = 1;
  stepFlock(flock, e); // 開始跳
  assert.equal(b.hop, 0);
  assert.equal(b.facing, before, "not flipped at take-off of the hop");
  for (let i = 0; i < 10; i++) stepFlock(flock, e);
  assert.equal(b.facing, -before, "flipped by the middle of the hop");
});

test("birds: while resting they sometimes turn the head or flutter their wings, one thing at a time", () => {
  const seen = new Set();
  for (let seed = 1; seed <= 15; seed++) {
    const flock = createFlock({ firstIn: 0 });
    const e = env({ random: seeded(seed), animLength: (name) => (name === "head" ? 240 : 185) });
    runUntil(flock, e, (f) => f.birds.length && f.birds[0].state === "perched");
    const b = flock.birds[0];
    for (let i = 0; i < 2000 && b.state === "perched"; i++) {
      stepFlock(flock, e);
      if (b.anim) {
        seen.add(b.anim);
        assert.ok(b.hop >= 20 || b.hop === 99, "no hop while a clip is playing");
        assert.ok(b.animT <= e.animLength(b.anim), "clip runs past its end");
      }
    }
  }
  assert.ok(seen.has("head"), "never turned its head");
  assert.ok(seen.has("flutter"), "never fluttered");
});

test("birds: taking off plays the clip forward from the perch, then flies away from where the clip ended", () => {
  const flock = createFlock({ firstIn: 0 });
  const e = env();
  runUntil(flock, e, (f) => f.birds.length && f.birds[0].state === "perched");
  const b = flock.birds[0];
  const at = PERCHES[b.perch];
  b.rest = 1;
  stepFlock(flock, e);
  assert.equal(b.state, "takeoff");
  while (b.state === "takeoff") {
    assert.ok(dist(b, at) < 1e-6, "stays on the perch while the clip plays");
    stepFlock(flock, e);
  }
  assert.equal(b.state, "out");
  const hover = e.hover(b.perch);
  assert.ok(dist(b, hover) < 12, `flight starts where the clip left the bird (${dist(b, hover).toFixed(1)}px off)`);
});

test("birds: calm motion — a wing beat takes 2+ seconds while cruising, the turn-around hop takes 1/3 second", async () => {
  const { HOP, CLIP_SPEED } = await import("../js/birds.js");
  const flock = createFlock({ firstIn: 0 });
  const e = env();
  stepFlock(flock, e);
  const b = flock.birds[0];
  let last = b.flap;
  while (b.state === "in") {
    stepFlock(flock, e);
    if (b.state === "in" && !b.brake) assert.ok(b.flap - last <= 1 / 120 + 1e-9, `beat too fast: ${(b.flap - last).toFixed(4)} per frame`);
    last = b.flap;
  }
  assert.ok(HOP >= 20, `hop is ${HOP} frames`);
  assert.ok(CLIP_SPEED <= 0.75, "video clips (head turn, flutter, take-off) play slower than recorded");
});

test("birds: leaving picks up the take-off clip's speed and direction, then speeds up smoothly", () => {
  const vel = { x: 0.3, y: -1.6 }; // 起飛影片最後的速度（每格像素，朝右）
  const flock = createFlock({ firstIn: 0 });
  const e = env({ leaveVelocity: (i) => ({ x: vel.x * PERCHES[i].face, y: vel.y }) });
  runUntil(flock, e, (f) => f.birds.length && f.birds[0].state === "perched");
  const b = flock.birds[0];
  b.rest = 1;
  runUntil(flock, e, () => b.state === "out");
  const want = e.leaveVelocity(b.perch);
  let prev = { x: b.x, y: b.y };
  stepFlock(flock, e);
  const v0 = { x: b.x - prev.x, y: b.y - prev.y };
  const speed = Math.hypot(v0.x, v0.y);
  const wantSpeed = Math.hypot(want.x, want.y);
  assert.ok(Math.abs(speed - wantSpeed) < wantSpeed * 0.3, `first step ${speed.toFixed(2)} px, clip ends at ${wantSpeed.toFixed(2)}`);
  const da = Math.atan2(v0.y, v0.x) - Math.atan2(want.y, want.x);
  assert.ok(Math.abs(Math.atan2(Math.sin(da), Math.cos(da))) < 0.3, "leaves in the clip's direction");
  let lastSpeed = speed;
  prev = { x: b.x, y: b.y };
  while (b.state === "out") {
    stepFlock(flock, e);
    if (b.state === "gone") break; // 最後一格被截到終點，不算
    const s = Math.hypot(b.x - prev.x, b.y - prev.y);
    assert.ok(Math.abs(s - lastSpeed) < 0.12, `speed jumps ${lastSpeed.toFixed(2)} → ${s.toFixed(2)}`);
    lastSpeed = s;
    prev = { x: b.x, y: b.y };
  }
});

test("birds: the body points where the bird is going — climbing steeply means nose up, not flat", async () => {
  const { bodyTilt } = await import("../js/birds.js");
  const up = Math.atan2(-217, 67); // 起飛影片最後的方向：往右上很陡
  assert.ok(bodyTilt({ angle: up, facing: 1, brake: false }) < -0.9, "right-facing climb: nose up");
  assert.ok(bodyTilt({ angle: Math.PI - up, facing: -1, brake: false }) < -0.9, "left-facing climb: nose up (mirrored)");
  assert.ok(Math.abs(bodyTilt({ angle: 0.1, facing: 1, brake: false }) - 0.1) < 1e-9, "level flight follows the path");
});
