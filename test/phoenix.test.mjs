// 丹鳳（九天玄女頁）的規格：
// 1. 進到這一頁，停一下（1～2.5 秒）後，丹鳳從畫面下方外面升上來，正面朝我們
// 2. 升到畫面中間偏下（大門門洞前，不擋匾額）停住，原地正面展翅，至少拍完一整段（兩下拍翅）
// 3. 然後往上飛走，從畫面上方完全離開
// 4. 待在這一頁時正面只出現一次；離開再回來，會再出現一次
// 5. 之後偶爾從側面飛過：從一邊畫面外進來、飛到另一邊離開，頭一直朝飛的方向（不轉身），兩次之間至少隔 15 秒
// 6. 優雅不躁動：移動不快（正面 ≤ 3、側面 ≤ 2.2 像素／格），速度變化平順（沒有突然的加速、急停）；
//    拍翅慢：正面一段（兩下）≥ 4 秒，側面一下 ≥ 2.2 秒
// 7. 換到別的神明：慢慢淡掉（至少 0.75 秒），不會再出現
import { test } from "node:test";
import assert from "node:assert/strict";
import { createPhoenix, stepPhoenix, frameIndex, FRONT_LOOP, SIDE_LOOP } from "../js/phoenix.js";

const W = 1440;
const H = 900;
function seeded(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}
const env = (over = {}) => ({ w: W, h: H, active: true, random: seeded(3), ...over });
const half = (p) => p.size / 2;

// 跑 n 格，記下每格的狀態
function run(p, e, n) {
  const log = [];
  for (let i = 0; i < n; i++) {
    stepPhoenix(p, e);
    log.push({ mode: p.mode, phase: p.phase, x: p.x, y: p.y, size: p.size, flap: p.flap, facing: p.facing, alpha: p.alpha });
  }
  return log;
}

test("frameIndex: wing-beat position 0..1 maps onto the frames and wraps around", () => {
  assert.equal(frameIndex(0, 56), 0);
  assert.equal(frameIndex(0.999, 56), 55);
  assert.equal(frameIndex(1, 56), 0);
  assert.equal(frameIndex(2.5, 100), 50);
  assert.equal(frameIndex(-0.25, 100), 75);
});

test("arriving on the page: after a short pause the phoenix rises from below the screen, facing us", () => {
  const p = createPhoenix();
  const log = run(p, env(), 400);
  const first = log.findIndex((s) => s.mode === "front");
  assert.ok(first >= 60 && first <= 150, `appears after a pause (frame ${first})`);
  const s = log[first];
  assert.ok(s.y - half(s) > H, "starts fully below the bottom edge");
  assert.ok(Math.abs(s.x - W / 2) < 1, "centered");
  assert.ok(s.size >= 240 && s.size <= 460, `a clear but not overwhelming size (${s.size})`);
});

test("it comes to rest near the middle and spreads its wings for at least one full loop, then flies up and away", () => {
  const p = createPhoenix();
  const log = run(p, env(), 3000);
  const hover = log.filter((s) => s.mode === "front" && s.phase === "hover");
  assert.ok(hover.length > 0, "it hovers");
  for (const s of hover) assert.ok(s.y > H * 0.5 && s.y < H * 0.66, `hovers in front of the doorway, below the plaque (y ${s.y.toFixed(0)})`);
  const beats = hover.at(-1).flap - hover[0].flap;
  assert.ok(beats >= 1 - 1e-9, `at least one full loop of wing beats while hovering (${beats.toFixed(2)})`);
  const leave = log.filter((s) => s.mode === "front" && s.phase === "leave");
  assert.ok(leave.length > 0, "then leaves");
  const last = leave.at(-1);
  assert.ok(last.y + half(last) < 0, "leaves completely above the top edge");
  const after = log.slice(log.indexOf(last) + 1);
  assert.ok(after.length && after[0].mode !== "front", "the front show ends");
});

test("the front show happens once per visit, and again after coming back", () => {
  const p = createPhoenix();
  const e = env();
  const shows = (log) => log.filter((s, i) => s.mode === "front" && (i === 0 || log[i - 1].mode !== "front")).length;
  assert.equal(shows(run(p, e, 60 * 90)), 1, "once while staying 90 s");
  e.active = false;
  run(p, e, 300);
  e.active = true;
  assert.equal(shows(run(p, e, 60 * 30)), 1, "once more after coming back");
});

test("later it glides past from the side: off screen to off screen, always facing where it flies, never turning", () => {
  const p = createPhoenix();
  const log = run(p, env({ random: seeded(7) }), 60 * 150);
  const passes = [];
  let cur = null;
  log.forEach((s, i) => {
    if (s.mode === "side") {
      if (!cur) passes.push((cur = { start: i, states: [] }));
      cur.states.push(s);
    } else cur = null;
  });
  if (log.at(-1).mode === "side") passes.pop(); // 最後一趟還沒飛完，不算
  assert.ok(passes.length >= 2, `at least two passes in 2.5 minutes (${passes.length})`);
  for (const ps of passes) {
    const a = ps.states[0];
    const b = ps.states.at(-1);
    assert.ok(a.x + half(a) < 0 || a.x - half(a) > W, "starts off screen");
    assert.ok(b.x + half(b) < 0 || b.x - half(b) > W, "ends off screen");
    assert.ok(Math.sign(b.x - a.x) !== Math.sign(a.x - W / 2), "ends on the other side");
    for (let i = 1; i < ps.states.length; i++) {
      const dx = ps.states[i].x - ps.states[i - 1].x;
      assert.equal(Math.sign(dx), ps.states[i].facing, "faces the way it flies");
      assert.equal(ps.states[i].facing, a.facing, "never turns around");
    }
    for (const s of ps.states) assert.ok(s.y > H * 0.08 && s.y < H * 0.42, `stays up in the sky (y ${s.y.toFixed(0)})`);
  }
  for (let k = 1; k < passes.length; k++) {
    const gap = passes[k].start - (passes[k - 1].start + passes[k - 1].states.length);
    assert.ok(gap >= 60 * 15, `at least 15 s between passes (${(gap / 60).toFixed(1)} s)`);
  }
});

test("elegant, not restless: slow movement with smooth speed changes, and slow wing beats", () => {
  for (let seed = 1; seed <= 4; seed++) {
    const p = createPhoenix();
    const log = run(p, env({ random: seeded(seed) }), 60 * 120);
    let vMax = { front: 0, side: 0 };
    let aMax = 0;
    let flapMax = { front: 0, side: 0 };
    for (let i = 2; i < log.length; i++) {
      const [a, b, c] = [log[i - 2], log[i - 1], log[i]];
      if (a.mode !== c.mode || a.mode === "idle" || b.mode !== c.mode) continue;
      const v1 = { x: b.x - a.x, y: b.y - a.y };
      const v2 = { x: c.x - b.x, y: c.y - b.y };
      vMax[c.mode] = Math.max(vMax[c.mode], Math.hypot(v2.x, v2.y));
      aMax = Math.max(aMax, Math.hypot(v2.x - v1.x, v2.y - v1.y));
      flapMax[c.mode] = Math.max(flapMax[c.mode], c.flap - b.flap);
    }
    assert.ok(vMax.front <= 3, `seed ${seed}: front ${vMax.front.toFixed(2)} px/frame`);
    assert.ok(vMax.side <= 2.2, `seed ${seed}: side ${vMax.side.toFixed(2)} px/frame`);
    assert.ok(vMax.front >= 0.8 && vMax.side >= 0.8, `seed ${seed}: but it does move (${vMax.front.toFixed(2)}, ${vMax.side.toFixed(2)})`);
    assert.ok(aMax <= 0.05, `seed ${seed}: speed changes smoothly (${aMax.toFixed(3)} px/frame²)`);
    assert.ok(flapMax.front <= 1 / 240 + 1e-12, `seed ${seed}: front loop of two beats takes ≥ 4 s`);
    assert.ok(flapMax.side <= 1 / 132 + 1e-12, `seed ${seed}: one side beat takes ≥ 2.2 s`);
  }
  assert.ok(FRONT_LOOP >= 240 && SIDE_LOOP >= 132, "loop lengths are calm");
});

test("leaving the page: it fades out slowly and does not come back while away", () => {
  const p = createPhoenix();
  const e = env();
  run(p, e, 400); // 正在正面升起
  assert.equal(p.mode, "front");
  e.active = false;
  const log = run(p, e, 60 * 60);
  let frames = 0;
  for (let i = 1; i < log.length; i++) {
    assert.ok(log[i].alpha <= log[i - 1].alpha + 1e-12, "only fades out");
    if (log[i].alpha > 0) frames++;
  }
  assert.ok(frames >= 45, `fades over ≥ 0.75 s (${frames} frames)`);
  assert.equal(log.at(-1).alpha, 0);
  assert.equal(log.at(-1).mode, "idle", "nothing shows while away");
});

test("coming back while it is still fading out: the front show still plays for the new visit", () => {
  for (const ticks of [200, 500, 800, 1400]) {
    const p = createPhoenix();
    const e = env();
    run(p, e, ticks); // 正在升起／展翅／飛走
    e.active = false;
    run(p, e, 30); // 才淡一半就回來
    e.active = true;
    const log = run(p, e, 60 * 40);
    const rise = log.findIndex((s) => s.mode === "front" && s.phase === "rise" && s.y - half(s) > H);
    assert.ok(rise >= 0, `after ${ticks} ticks: a fresh rise from below happens on return`);
  }
});

test("on a tall narrow phone it hovers in the doorway under the plaque, not on top of it", () => {
  const door = { x: 170, top: 610 }; // 匾額下緣、門洞中間（量自 390×844 的畫面）
  const p = createPhoenix();
  const log = run(p, env({ w: 390, h: 844, door }), 1500);
  const hover = log.filter((s) => s.mode === "front" && s.phase === "hover");
  assert.ok(hover.length);
  for (const s of hover) {
    assert.ok(Math.abs(s.x - door.x) < 1, "centered on the doorway");
    // 翅膀舉到最高時，翅尖在中心上方約 0.49 個鳥寬（量自圖集）
    assert.ok(s.y - s.size * 0.5 >= door.top, `raised wing tips stay below the plaque (top ${(s.y - s.size * 0.5).toFixed(0)})`);
    assert.ok(s.size <= 390 * 0.75, `fits the narrow screen (${s.size})`);
  }
});

test("resizing the window mid-flight never makes it jump", () => {
  const p = createPhoenix();
  const e = env();
  run(p, e, 700); // 正在展翅
  const before = { x: p.x, y: p.y };
  e.w = 900;
  e.h = 600;
  e.door = { x: 450, top: 300 };
  stepPhoenix(p, e);
  assert.ok(Math.hypot(p.x - before.x, p.y - before.y) < 3, "no jump on resize");
});
