// 中壇元帥的乾坤圈和火尖槍（取代混天綾；金蓮保留；風火輪等影片）
// - 乾坤圈：浮在畫面左下（標題下面），慢慢上下浮、慢慢轉（像立體的圈在空中轉）
//   點它：圈飛出去，劃一道弧繞過大門前面，2～3 秒後飛回原位（不會瞬間跳回）；飛的時候再點沒有用
// - 火尖槍：斜立在畫面右邊，輕輕浮動；槍尖的火一直冒出小火星，往上飄、淡掉
// - 風火輪：一對浮在畫面下方中間（腳踏風火輪），輪子慢慢順時針轉，火焰一直燒（火焰是影片，輪子由程式轉）
// - 離開三太子頁：慢慢淡掉；飛出去的圈照樣飛回來
import { test } from "node:test";
import assert from "node:assert/strict";
import { ringHome, spearPose, wheelsPose, createWeapons, stepWeapons, ringPose, MAX_SPARKS } from "../js/weapons.js";

const W = 1440;
const H = 900;
const still = { x: -9999, y: -9999 };
const run = (s, n, env = {}) => {
  for (let i = 0; i < n; i++) stepWeapons(s, { W, H, active: true, random: Math.random, ...env });
};

test("the ring floats lower-left, the spear stands on the right, both on screen and apart", () => {
  for (const [w, h] of [[1440, 900], [1024, 768], [390, 844]]) {
    const r = ringHome(w, h);
    const sp = spearPose(w, h);
    assert.ok(r.x - r.size / 2 > 0 && r.x < w * 0.35, "ring on the left");
    assert.ok(r.y > h * 0.4 && r.y + r.size / 2 < h * 0.95, "ring in the lower half");
    assert.ok(sp.x > w * 0.65 && sp.x + sp.w / 2 <= w, "spear on the right");
    assert.ok(sp.y - sp.h / 2 > h * 0.08 && sp.y + sp.h / 2 < h * 0.98, "spear on screen");
    assert.ok(r.size >= 70);
  }
});

test("idle: the ring bobs and turns slowly", () => {
  const s = createWeapons();
  run(s, 60);
  const home = ringHome(W, H);
  let last = ringPose(s, W, H);
  for (let i = 0; i < 60 * 10; i++) {
    run(s, 1);
    const p = ringPose(s, W, H);
    assert.ok(Math.abs(p.y - home.y) <= 10, "bobs a little");
    assert.ok(Math.hypot(p.x - last.x, p.y - last.y) <= 1, "slowly");
    assert.ok(Math.abs(p.turn - last.turn) <= 0.02, "turns slowly");
    last = p;
  }
});

test("clicking the ring throws it in an arc across the gate and it comes back home", () => {
  const s = createWeapons();
  run(s, 60);
  const home = ringHome(W, H);
  run(s, 1, { click: { x: home.x, y: home.y } });
  assert.ok(s.thrown, "thrown");
  let maxX = 0;
  let last = ringPose(s, W, H);
  let n = 0;
  while (s.thrown && n < 600) {
    run(s, 1, { click: n === 30 ? { x: last.x, y: last.y } : null });
    const p = ringPose(s, W, H);
    assert.ok(Math.hypot(p.x - last.x, p.y - last.y) <= 25, "no jumps");
    maxX = Math.max(maxX, p.x);
    last = p;
    n++;
  }
  assert.ok(n >= 120 && n <= 180, `2–3 s (${n} frames)`);
  assert.ok(maxX > home.x + W * 0.3, "flies out across the gate");
  const back = ringPose(s, W, H);
  assert.ok(Math.hypot(back.x - home.x, back.y - home.y) <= 12, "back home");
});

test("sparks rise from the spear tip and fade; capped", () => {
  const s = createWeapons();
  const random = (() => {
    let x = 7;
    return () => ((x = (x * 1664525 + 1013904223) >>> 0) / 2 ** 32);
  })();
  for (let i = 0; i < 60 * 8; i++) {
    stepWeapons(s, { W, H, active: true, random });
    assert.ok(s.sparks.length <= MAX_SPARKS);
  }
  assert.ok(s.sparks.length > 5, "sparks keep coming");
  const tip = spearPose(W, H).tip;
  const sp = s.sparks[0];
  const y0 = sp.y;
  const a0 = sp.alpha;
  stepWeapons(s, { W, H, active: true, random });
  assert.ok(sp.y < y0, "rise");
  assert.ok(sp.alpha <= a0 + 1e-9, "fade");
  assert.ok(Math.hypot(s.sparks.at(-1).x - tip.x, s.sparks.at(-1).y - tip.y) < 80, "born at the tip");
});

test("leaving the 三太子 page: fades slowly, no new sparks, a thrown ring still flies home", () => {
  const s = createWeapons();
  run(s, 60);
  const home = ringHome(W, H);
  run(s, 1, { click: { x: home.x, y: home.y } });
  run(s, 40);
  let n = 0;
  while (s.alpha > 0 && n < 600) {
    const before = s.sparks.length;
    stepWeapons(s, { W, H, active: false, random: Math.random });
    assert.ok(s.sparks.length <= before, "no new sparks");
    n++;
  }
  assert.ok(n >= 30, `fades over ${n} frames`);
  run(s, 300, { active: false });
  assert.equal(s.thrown, false, "the ring came home");
});

test("the wind-fire wheels float at the bottom centre, between the ring and the spear, turning slowly clockwise", () => {
  for (const [w, h] of [[1440, 900], [1024, 768], [390, 844]]) {
    const wh = wheelsPose(w, h, 0);
    assert.ok(Math.abs(wh.x - w / 2) < w * 0.05, "centred");
    assert.ok(wh.y - wh.h / 2 > h * 0.55 && wh.y + wh.h / 2 <= h, "at the bottom, on screen");
    assert.ok(wh.x - wh.w / 2 >= 0 && wh.x + wh.w / 2 <= w, "fits the width");
    assert.ok(wh.w >= 140, "big enough to see");
    const r = ringHome(w, h);
    assert.ok(wh.x - wh.w / 2 > r.x - r.size / 2, "right of the ring's left edge");
  }
  const s = createWeapons();
  let last = s.wheelAngle;
  let lastY = wheelsPose(W, H, s.t).y;
  for (let i = 0; i < 600; i++) {
    stepWeapons(s, { W, H, active: true, random: Math.random });
    const d = s.wheelAngle - last;
    assert.ok(d > 0 && d <= 0.03, "clockwise, slowly");
    const y = wheelsPose(W, H, s.t).y;
    assert.ok(Math.abs(y - lastY) <= 0.5, "floats gently");
    last = s.wheelAngle;
    lastY = y;
  }
});
