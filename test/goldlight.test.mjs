// 金母頁的金色光線（使用者選了「飛過才變金」）
// 丹鳳：慢慢從左邊天空飛到右邊（約 10 秒），在大門上方的天空，飛出畫面才結束；之後隔一陣子再飛一次
// 鳳凰飛進來時天空慢慢變暖金色，飛到中間最亮，飛走後慢慢退回月白
// 拍翅：照影片每一格該播多久輪流播，播完接回第一格；兩格之間慢慢混過去（不會一格一格跳）
// 優雅：光的強弱每格最多變一點點（不會一下變亮）；離開金母頁：光慢慢退掉、鳳凰不再出現
// 火星：從鳳凰身上飄落，慢慢往下飄、慢慢淡掉，最多 120 顆
import { test } from "node:test";
import assert from "node:assert/strict";
import { createLight, stepLight, flightPose, stepEmbers, flapFrame, FLIGHT, MAX_EMBERS } from "../js/goldlight.js";

const W = 1440;
const H = 900;
function seeded(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

test("the phoenix crosses the upper sky from left to right, starting and ending off screen, moving smoothly", () => {
  const a = flightPose(0, W, H);
  const b = flightPose(1, W, H);
  assert.ok(a.x + a.w / 2 < 0, "starts fully off the left edge");
  assert.ok(b.x - b.w / 2 > W, "ends fully off the right edge");
  let last = a;
  for (let f = 1; f <= FLIGHT; f++) {
    const p = flightPose(f / FLIGHT, W, H);
    assert.ok(p.y > H * 0.08 && p.y < H * 0.3, `stays high in the sky, above the gate's roofs (y ${p.y.toFixed(0)})`);
    assert.ok(Math.hypot(p.x - last.x, p.y - last.y) <= 6, "glides slowly");
    assert.ok(p.x > last.x, "always heading right");
    last = p;
  }
  assert.ok(FLIGHT >= 480 && FLIGHT <= 720, `a slow crossing (${(FLIGHT / 60).toFixed(1)} s)`);
  // 使用者覺得飛過去不自然（2026-11-15）：原本畫面寬的一半，躲在屋頂後面只看得到一半。改到大門前面、小一點，整隻都看得到
  assert.ok(a.w >= W * 0.3 && a.w <= W * 0.42, "big, but the whole bird fits above the roofs");
});

test("the sky warms only while the phoenix passes, brightest mid-way, then fades back", () => {
  const s = createLight();
  const random = seeded(2);
  const seq = [];
  for (let i = 0; i < 60 * 40; i++) {
    stepLight(s, { active: true, random });
    seq.push({ warm: s.warm, flying: s.flying, p: s.p });
  }
  const firstFly = seq.findIndex((x) => x.flying);
  assert.ok(firstFly > 0 && firstFly <= 60 * 4, "first flight soon after arriving");
  assert.ok(seq.slice(0, firstFly).every((x) => x.warm < 1e-9), "no warmth before the phoenix comes");
  const flight = seq.slice(firstFly, firstFly + FLIGHT);
  const peak = Math.max(...flight.map((x) => x.warm));
  assert.ok(peak >= 0.8, `bright when it passes (${peak.toFixed(2)})`);
  const mid = flight[Math.floor(FLIGHT / 2)].warm;
  assert.ok(mid >= 0.7, "bright mid-way");
  const after = seq[firstFly + FLIGHT + 120];
  assert.ok(after.warm < 0.05, "back to moon-white two seconds after it leaves");
  for (let i = 1; i < seq.length; i++) assert.ok(Math.abs(seq[i].warm - seq[i - 1].warm) <= 1 / 60 + 1e-9, "no sudden brightening");
});

test("leaving the 金母 page: the light fades away slowly and no new flight starts", () => {
  {
    const s = createLight();
    const random = seeded(4);
    for (let i = 0; i < 60 * 6; i++) stepLight(s, { active: true, random });
    assert.ok(s.warm > 0.3, "lit while the phoenix is passing");
    let n = 0;
    while (s.warm > 0 && n < 600) {
      const before = s.warm;
      stepLight(s, { active: false, random });
      assert.ok(s.warm <= before);
      n++;
    }
    assert.ok(n >= 30, `fades over ${n} frames`);
    for (let i = 0; i < 60 * 60; i++) {
      stepLight(s, { active: false, random });
      assert.ok(!s.flying || s.p > 0, "no new flight while away");
    }
    assert.equal(s.flying, false);
  }
});

test("embers drift down and fade, then disappear; never more than the cap", () => {
  const random = seeded(5);
  let embers = [];
  for (let i = 0; i < 600; i++) {
    embers = stepEmbers(embers, [{ x: 500, y: 200 }, { x: 600, y: 260 }], random, 1);
    assert.ok(embers.length <= MAX_EMBERS);
  }
  const e = { x: 0, y: 0, vx: 0.2, vy: 0.3, age: 0, life: 150, size: 2 };
  let list = [e];
  let lastA = 1;
  for (let i = 0; i < 160; i++) {
    list = stepEmbers(list, [], random, 1);
    if (!list.includes(e)) break;
    assert.ok(e.alpha <= lastA + 1e-9, "only fades");
    lastA = e.alpha;
  }
  assert.ok(!list.includes(e), "gone after its life");
  assert.ok(e.y > 0, "drifted down");
});

test("wingbeat: each video frame shows for its own length, blends into the next, and loops back to the first", () => {
  // 三格：第一格播 2 個影片格、第二格 2、第三格 4（影片 24 格／秒，畫面 60 格／秒）
  const frames = [[0, 0, 1, 1, 2], [0, 0, 1, 1, 2], [0, 0, 1, 1, 4]];
  const cycle = ((2 + 2 + 4) / 24) * 60; // 20 個畫面格
  assert.deepEqual(flapFrame(0, frames), { a: 0, b: 1, w: 0 });
  const mid = flapFrame(2.5, frames); // 第一格播一半
  assert.equal(mid.a, 0);
  assert.equal(mid.b, 1);
  assert.ok(Math.abs(mid.w - 0.5) < 1e-9);
  assert.equal(flapFrame(5, frames).a, 1);
  const last = flapFrame(cycle - 1, frames);
  assert.equal(last.a, 2);
  assert.equal(last.b, 0, "the last frame blends back into the first");
  assert.deepEqual(flapFrame(cycle, frames), flapFrame(0, frames), "loops");
  for (let t = 0; t < cycle * 3; t += 0.25) {
    const f = flapFrame(t, frames);
    assert.ok(f.w >= 0 && f.w < 1);
  }
});

test("leaving mid-flight: the phoenix itself fades out within a second, smoothly, and comes back softly", () => {
  const s = createLight();
  const random = seeded(6);
  while (!s.flying) stepLight(s, { active: true, random });
  for (let i = 0; i < FLIGHT * 0.4; i++) stepLight(s, { active: true, random });
  assert.ok(s.show > 0.99, "fully visible while on the page");
  let n = 0;
  while (s.show > 0) {
    const before = s.show;
    stepLight(s, { active: false, random });
    assert.ok(before - s.show <= 1 / 30 + 1e-9, "no snap");
    n++;
    assert.ok(n <= 60, "gone within a second");
  }
  stepLight(s, { active: true, random });
  assert.ok(s.show > 0 && s.show <= 1 / 30 + 1e-9, "fades back in");
});
