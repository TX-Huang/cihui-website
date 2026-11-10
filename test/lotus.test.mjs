// 蓮花（中壇元帥頁）的規格：哪吒以蓮花化身重生。
// 1. 點空白的地方：那裡先浮出一片荷葉，花苞從荷葉上慢慢長出來，再慢慢開成一朵蓮花，飄一陣子後慢慢淡掉
// 2. 點到不能放的地方（珠簾門洞、按鈕）：不會開
// 3. 同時最多 3 朵；點在已經有的蓮花上不會疊一朵新的
// 4. 沒人點的話，進到這一頁幾秒後、之後每 20～40 秒，兩旁會自己開一朵（讓人發現可以點）
// 5. 優雅：從透明、小小的開始（不會突然冒出來），大小和透明度都慢慢變，飄動很慢
// 6. 換到別的神明：全部慢慢淡掉，不會再開
import { test } from "node:test";
import assert from "node:assert/strict";
import { createPond, stepPond, lotusPose, fadeOutAll, MAX_LOTUS } from "../js/lotus.js";

const W = 1440;
const H = 900;
function seeded(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}
const door = (x, y) => x > 560 && x < 880 && y > 380 && y < 800; // 珠簾門洞（不能放）
const env = (over = {}) => ({ w: W, h: H, active: true, click: null, free: (x, y) => !door(x, y), random: seeded(4), ...over });
const run = (pond, e, n) => {
  for (let i = 0; i < n; i++) stepPond(pond, e);
};

test("clicking an empty spot: a leaf appears, a bud grows from it and slowly opens, floats, then fades away", () => {
  const pond = createPond();
  const e = env();
  stepPond(pond, { ...e, click: { x: 200, y: 600 } });
  assert.equal(pond.lotus.length, 1);
  const l = pond.lotus[0];
  assert.ok(Math.abs(l.x - 200) < 1 && Math.abs(l.y - 600) < 1, "blooms where you clicked");
  const poses = [];
  for (let i = 0; i < 60 * 25 && pond.lotus.includes(l); i++) {
    poses.push(lotusPose(l));
    stepPond(pond, e);
  }
  const first = poses[0];
  assert.ok(first.alpha < 0.1 && first.leaf < 0.1 && first.bud < 0.1 && first.open === 0, "starts invisible, nothing pops in");
  const at = (pred) => poses.findIndex(pred);
  const leafIn = at((p) => p.leaf >= 0.99);
  const budIn = at((p) => p.bud >= 0.99);
  const opened = at((p) => p.open >= 0.99);
  assert.ok(leafIn > 30 && leafIn < budIn && budIn < opened, `leaf (${leafIn}) → bud (${budIn}) → open flower (${opened})`);
  assert.ok(opened >= 60 * 4 && opened <= 60 * 8, `fully open after ${(opened / 60).toFixed(1)} s`);
  const full = poses.filter((p) => p.open >= 0.99 && p.alpha >= 0.99).length;
  assert.ok(full >= 60 * 8, `stays in bloom for a while (${(full / 60).toFixed(1)} s)`);
  assert.ok(poses.at(-1).alpha < 0.05, "fades away at the end");
  assert.ok(!pond.lotus.includes(l), "then it is gone");
  assert.ok(poses.length <= 60 * 25, "within 25 s");
});

test("clicking a spot it cannot go (the curtain doorway) does nothing", () => {
  const pond = createPond();
  stepPond(pond, env({ click: { x: 720, y: 600 } }));
  assert.equal(pond.lotus.length, 0);
});

test("at most three at once, and no new one on top of an existing one", () => {
  const pond = createPond();
  const e = env();
  stepPond(pond, { ...e, click: { x: 150, y: 550 } });
  stepPond(pond, { ...e, click: { x: 160, y: 560 } }); // 點在同一朵上
  assert.equal(pond.lotus.length, 1, "no stacking");
  stepPond(pond, { ...e, click: { x: 1250, y: 600 } });
  stepPond(pond, { ...e, click: { x: 400, y: 250 } });
  stepPond(pond, { ...e, click: { x: 1100, y: 250 } });
  assert.equal(pond.lotus.length, MAX_LOTUS);
  assert.equal(MAX_LOTUS, 3);
});

test("left alone, one blooms by itself at the sides a few seconds after arriving, then every 20–40 s", () => {
  const pond = createPond();
  const e = env();
  const births = [];
  let seen = new Set();
  for (let i = 0; i < 60 * 120; i++) {
    stepPond(pond, e);
    for (const l of pond.lotus) {
      if (!seen.has(l)) {
        seen.add(l);
        births.push({ t: i, x: l.x, y: l.y });
      }
    }
  }
  assert.ok(births.length >= 3, `${births.length} bloomed by themselves in 2 minutes`);
  assert.ok(births[0].t >= 60 * 4 && births[0].t <= 60 * 12, `first one after ${(births[0].t / 60).toFixed(1)} s`);
  for (let k = 1; k < births.length; k++) {
    const gap = births[k].t - births[k - 1].t;
    assert.ok(gap >= 60 * 20 && gap <= 60 * 40 + 1, `then every 20–40 s (${(gap / 60).toFixed(1)} s)`);
  }
  for (const b of births) {
    assert.ok(b.x < W * 0.2 || b.x > W * 0.8, `at the sides (x ${b.x.toFixed(0)})`);
    assert.ok(b.y > H * 0.55 && b.y < H * 0.85, `low, near the water (y ${b.y.toFixed(0)})`);
  }
});

test("elegant: size and opacity change slowly, and it floats gently", () => {
  const pond = createPond();
  const e = env();
  stepPond(pond, { ...e, click: { x: 220, y: 620 } });
  const l = pond.lotus[0];
  let prev = lotusPose(l);
  let prevPos = { x: l.x + prev.dx, y: l.y + prev.dy };
  while (pond.lotus.includes(l)) {
    stepPond(pond, e);
    const p = lotusPose(l);
    for (const k of ["alpha", "leaf", "bud", "open", "scale"]) {
      assert.ok(Math.abs(p[k] - prev[k]) <= 1 / 40, `${k} changes slowly (${Math.abs(p[k] - prev[k]).toFixed(4)} per frame)`);
    }
    const pos = { x: l.x + p.dx, y: l.y + p.dy };
    assert.ok(Math.hypot(pos.x - prevPos.x, pos.y - prevPos.y) <= 0.3, "floats gently");
    prev = p;
    prevPos = pos;
  }
});

test("leaving the page: all fade out slowly and no new ones bloom", () => {
  const pond = createPond();
  const e = env();
  stepPond(pond, { ...e, click: { x: 200, y: 600 } });
  run(pond, e, 60 * 6);
  const l = pond.lotus[0];
  e.active = false;
  let n = 0;
  let last = lotusPose(l).alpha;
  while (pond.lotus.length && n < 1000) {
    stepPond(pond, { ...e, click: { x: 1300, y: 600 } });
    const a = lotusPose(l).alpha;
    assert.ok(a <= last + 1e-9, "only fades");
    last = a;
    n++;
  }
  assert.ok(n >= 45, `fades over ${n} frames`);
  run(pond, e, 60 * 60);
  assert.equal(pond.lotus.length, 0, "none while away");
});

test("blooming by itself also respects the no-go areas", () => {
  const pond = createPond();
  const e = env({ free: () => false });
  for (let i = 0; i < 60 * 90; i++) {
    stepPond(pond, e);
    assert.equal(pond.lotus.length, 0, `frame ${i}`);
  }
});

test("clicking on the petals of an open flower does not stack a new one", () => {
  const pond = createPond();
  const e = env();
  stepPond(pond, { ...e, click: { x: 200, y: 600 } });
  run(pond, e, 60 * 6);
  stepPond(pond, { ...e, click: { x: 200, y: 525 } }); // 花瓣上方
  stepPond(pond, { ...e, click: { x: 290, y: 610 } }); // 荷葉邊
  assert.equal(pond.lotus.length, 1);
});

test("a young lotus leaving the page only fades (never brightens first)", () => {
  for (const age of [5, 20, 60, 150]) {
    const pond = createPond();
    const e = env();
    stepPond(pond, { ...e, click: { x: 200, y: 600 } });
    run(pond, e, age);
    const l = pond.lotus[0];
    e.active = false;
    const seen = (p) => [p.alpha * p.leaf, p.alpha * p.bud, p.alpha * p.open];
    let last = seen(lotusPose(l));
    while (pond.lotus.includes(l)) {
      stepPond(pond, e);
      const now = seen(lotusPose(l));
      now.forEach((v, k) => assert.ok(v <= last[k] + 1e-9, `age ${age}: part ${k} only fades`));
      last = now;
    }
  }
});

test("fadeOutAll (used when the window is resized): every flower fades out slowly while staying on the page", () => {
  const pond = createPond();
  const e = env();
  stepPond(pond, { ...e, click: { x: 200, y: 600 } });
  stepPond(pond, { ...e, click: { x: 1250, y: 600 } });
  run(pond, e, 400);
  fadeOutAll(pond);
  let n = 0;
  let last = pond.lotus.map((l) => lotusPose(l).alpha);
  while (pond.lotus.length && n < 500) {
    const ls = [...pond.lotus];
    stepPond(pond, e);
    ls.forEach((l, k) => assert.ok(lotusPose(l).alpha <= last[k] + 1e-9, "only fades"));
    last = pond.lotus.map((l) => lotusPose(l).alpha);
    n++;
  }
  assert.ok(n >= 45 && n <= 90, `fades out over ${n} frames (about a second, not its whole life)`);
});

// 7. 開花要自然：花苞和開好的花不會兩張半透明疊在一起很久（看起來像鬼影）；
//    花是從花苞的大小慢慢張開（spread 0→1），不是在原地淡入
test("blooming looks natural: no long ghostly double image, the flower spreads open from the bud", () => {
  const pond = createPond();
  const e = env();
  stepPond(pond, { ...e, click: { x: 200, y: 600 } });
  const l = pond.lotus[0];
  const poses = [];
  for (let i = 0; i < 60 * 10; i++) {
    poses.push(lotusPose(l));
    stepPond(pond, e);
  }
  const half = (v) => v > 0.15 && v < 0.85;
  const ghost = poses.filter((p) => half(p.budA) && half(p.flowerA)).length;
  assert.ok(ghost <= 40, `bud and flower are both half see-through for ${ghost} frames`);
  const shown = poses.findIndex((p) => p.flowerA > 0.05);
  const wide = poses.findIndex((p) => p.spread >= 0.99);
  assert.ok(poses[shown].spread < 0.1, "the flower first shows at the bud's size");
  assert.ok(poses[shown].scale >= 0.99, "by then the bud is fully grown (so the sizes match)");
  assert.ok(wide - shown >= 60 * 2, `then opens slowly (${((wide - shown) / 60).toFixed(1)} s)`);
  for (let i = 1; i < poses.length; i++) {
    assert.ok(poses[i].spread >= poses[i - 1].spread, "only opens, never closes");
    for (const k of ["budA", "flowerA", "spread"]) {
      assert.ok(Math.abs(poses[i][k] - poses[i - 1][k]) <= 1 / 40, `${k} changes slowly`);
    }
  }
  assert.ok(poses.at(-1).budA === 0 && poses.at(-1).flowerA === 1, "ends as just the open flower");
});

// 8. 蓮花長在湖裡：圖層在大門後面（鯉魚上面），只在看得到湖水的地方開
//    （點在門上、天空、珠簾門洞都不會開——這由 free(x, y) 決定，view 用湖面的 visibleWater）
test("the lotus layer sits behind the gate (in the lake), above the koi", async () => {
  const { readFileSync } = await import("node:fs");
  const read = (f) => readFileSync(new URL(`../${f}`, import.meta.url), "utf8");
  const html = read("index.html");
  const stageStart = html.indexOf('<div class="stage"');
  const canvas = html.indexOf('id="lotus"');
  assert.ok(canvas > 0 && canvas < stageStart, "the lotus canvas is not inside the stage (the stage holds the gate)");
  const css = read("style.css");
  const block = css.match(/\n\.lotus\s*\{[^}]*\}/)?.[0] ?? "";
  assert.match(block, /position:\s*fixed/);
  const z = Number(block.match(/z-index:\s*(\d+)/)?.[1]);
  assert.ok(z > 5 && z < 10, `between the koi (5) and the gate stage (10): ${z}`);
});

test("blooming by itself still happens when only a little water is visible (keeps looking instead of giving up)", () => {
  const pond = createPond();
  const e = env({ free: (x, y) => (x < W * 0.045 || x > W * 0.955) && y > H * 0.6 });
  let births = 0;
  const seen = new Set();
  for (let i = 0; i < 60 * 120; i++) {
    stepPond(pond, e);
    for (const l of pond.lotus) if (!seen.has(l)) (seen.add(l), births++);
  }
  assert.ok(births >= 3, `${births} bloomed in 2 minutes`);
});
