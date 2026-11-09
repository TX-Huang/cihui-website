import { test } from "node:test";
import assert from "node:assert/strict";
import { steer } from "../js/swim.js";

// 固定的亂數，每次跑結果都一樣
function seeded(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

function makeFish(random, w, h) {
  return {
    x: w * (0.2 + random() * 0.6),
    y: h * (0.4 + random() * 0.4),
    angle: random() * Math.PI * 2,
    speed: 0.6,
    cruise: 0.5 + random() * 0.4,
    phase: 0,
    wander: random() * Math.PI * 2,
    fear: 0,
    len: 150
  };
}

// 任何一段 window 格裡，魚頭轉的角度加起來（同方向抵銷）超過一整圈 → 在原地轉圈
function worstLoop(fish, env, frames, window) {
  const turns = [];
  let prev = fish.angle;
  for (let t = 0; t < frames; t++) {
    steer(fish, env);
    turns.push(Math.atan2(Math.sin(fish.angle - prev), Math.cos(fish.angle - prev)));
    prev = fish.angle;
  }
  let worst = 0;
  let sum = 0;
  for (let t = 0; t < turns.length; t++) {
    sum += turns[t];
    if (t >= window) sum -= turns[t - window];
    worst = Math.max(worst, Math.abs(sum));
  }
  return worst;
}

const W = 1280;
const H = 720;

test("swim: a fish wandering alone never loops a full circle within 6 seconds", () => {
  for (let seed = 1; seed <= 12; seed++) {
    const random = seeded(seed);
    const env = { mouse: { x: -9999, y: -9999, speed: 0, still: 9999 }, w: W, h: H, random };
    const f = makeFish(random, W, H);
    const loop = worstLoop(f, env, 60 * 60, 360);
    assert.ok(loop < Math.PI * 2, `seed ${seed}: turned ${(loop / Math.PI).toFixed(2)}π in 6s`);
  }
});

test("swim: a fish visiting a still mouse does not orbit it in place", () => {
  for (let seed = 1; seed <= 12; seed++) {
    const random = seeded(seed);
    const mouse = { x: W / 2, y: H * 0.62, speed: 0, still: 0 };
    const env = { mouse, w: W, h: H, random };
    const f = makeFish(random, W, H);
    f.x = W / 2 + 200;
    f.y = H * 0.62;
    // 滑鼠停在原地，但使用者還在（still 一直很小，就像偶爾輕輕動一下）
    const turns = [];
    let prev = f.angle;
    for (let t = 0; t < 60 * 40; t++) {
      mouse.still = t % 120;
      steer(f, env);
      turns.push(Math.atan2(Math.sin(f.angle - prev), Math.cos(f.angle - prev)));
      prev = f.angle;
    }
    let worst = 0;
    let sum = 0;
    for (let t = 0; t < turns.length; t++) {
      sum += turns[t];
      if (t >= 360) sum -= turns[t - 360];
      worst = Math.max(worst, Math.abs(sum));
    }
    assert.ok(worst < Math.PI * 2, `seed ${seed}: circled ${(worst / Math.PI).toFixed(2)}π around the mouse in 6s`);
  }
});

test("swim: fish keep moving around the pond instead of staying in one spot", () => {
  for (let seed = 1; seed <= 12; seed++) {
    const random = seeded(seed);
    const env = { mouse: { x: -9999, y: -9999, speed: 0, still: 9999 }, w: W, h: H, random };
    const f = makeFish(random, W, H);
    // 每 30 秒看一次：這段時間內離起點最遠有多遠（最慢的魚每秒約 30px，碰到池邊會掉頭）
    for (let block = 0; block < 4; block++) {
      const x0 = f.x;
      const y0 = f.y;
      let far = 0;
      for (let t = 0; t < 1800; t++) {
        steer(f, env);
        far = Math.max(far, Math.hypot(f.x - x0, f.y - y0));
      }
      assert.ok(far > 300, `seed ${seed}, block ${block}: only went ${far.toFixed(0)}px in 30s`);
    }
  }
});

test("swim: fish stay inside the pond", () => {
  for (let seed = 1; seed <= 6; seed++) {
    const random = seeded(seed);
    const env = { mouse: { x: -9999, y: -9999, speed: 0, still: 9999 }, w: W, h: H, random };
    const f = makeFish(random, W, H);
    for (let t = 0; t < 60 * 60; t++) {
      steer(f, env);
      assert.ok(f.x > -f.len && f.x < W + f.len && f.y > 0 && f.y < H + f.len * 0.5, `seed ${seed} left the pond`);
    }
  }
});
