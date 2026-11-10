// 瑤池湖面的規格（背景圖下半部本來就是湖，讓它動起來）：
// 1. 湖面的位置要算對：背景圖用 CSS「cover、靠上下 60%」鋪滿，水平線在圖的 58% 高
// 2. 點一下湖面：擴散一圈漣漪；點在水平線以上（天空、山）：沒有
// 3. 滑鼠滑過湖面：留下很輕的波紋，但不是每格都冒（隔一點時間、一點距離才一個）
// 4. 漣漪優雅：從 0 慢慢出現、慢慢擴大（每格 ≤ 1 像素）、慢慢消失，4～6 秒後才拿掉；
//    同時最多 10 圈，滿了就不再加（不會把舊的一下子拿掉）
// 5. 花瓣落水的漣漪比點擊的小
// 6. 花瓣：大約一半會落在湖面上（落點在水平線以下），落下那一刻冒一個小漣漪，然後在水面上慢慢淡掉；
//    另一半照舊飄出畫面
import { test } from "node:test";
import assert from "node:assert/strict";
import { coverMap, waterTop, createLake, touch, stepLake, rippleRadius, rippleAmp, remapRipples, HORIZON, MAX_RIPPLES, RIPPLE_LIFE } from "../js/lake.js";
import { landingY, settle, landedAlpha, LAND_FADE } from "../js/petals.js";

const IW = 1536;
const IH = 1024;

test("the lake starts at the image's horizon, placed exactly like the CSS cover background", () => {
  assert.equal(HORIZON, 0.58);
  // 1440×900：圖寬剛好鋪滿，高 960，往上多出 60 的 60%
  let m = coverMap(1440, 900, IW, IH, 0.6);
  assert.ok(Math.abs(m.scale - 0.9375) < 1e-9 && Math.abs(m.ox) < 1e-9 && Math.abs(m.oy + 36) < 1e-9);
  assert.ok(Math.abs(waterTop(m, IH) - (-36 + 0.58 * 960)) < 1e-9);
  // 手機直的 390×844：圖高剛好鋪滿，左右裁掉
  m = coverMap(390, 844, IW, IH, 0.6);
  assert.ok(Math.abs(m.scale - 844 / IH) < 1e-9 && Math.abs(m.oy) < 1e-9);
  assert.ok(Math.abs(m.ox - (390 - IW * m.scale) / 2) < 1e-9);
  assert.ok(Math.abs(waterTop(m, IH) - 0.58 * 844) < 1e-9);
});

test("clicking the water makes a ripple; clicking the sky does not", () => {
  const lake = createLake();
  touch(lake, "click", 300, 400, 500);
  assert.equal(lake.ripples.length, 0, "above the horizon");
  touch(lake, "click", 300, 700, 500);
  assert.equal(lake.ripples.length, 1);
  assert.deepEqual([lake.ripples[0].x, lake.ripples[0].y], [300, 700]);
});

test("a mouse gliding over the water leaves light ripples, spaced out (not one per frame)", () => {
  const lake = createLake();
  let made = 0;
  for (let i = 0; i < 120; i++) {
    const before = lake.ripples.length;
    touch(lake, "move", 100 + i * 4, 700, 500);
    stepLake(lake);
    if (lake.ripples.length > before) made++;
  }
  assert.ok(made >= 3 && made <= 8, `${made} ripples over 2 s of gliding`);
  const move = lake.ripples[0];
  touch(lake, "click", 900, 800, 500);
  const click = lake.ripples.at(-1);
  assert.ok(move.strength < click.strength * 0.5, "mouse ripples are lighter than a click");
});

test("ripples are calm: appear from nothing, spread slowly, fade out, then go", () => {
  const lake = createLake();
  touch(lake, "click", 400, 700, 500);
  const r = lake.ripples[0];
  let lastR = rippleRadius(r);
  let lastA = rippleAmp(r);
  assert.equal(lastA, 0, "starts invisible");
  let frames = 0;
  while (lake.ripples.includes(r)) {
    stepLake(lake);
    frames++;
    const rad = rippleRadius(r);
    const a = rippleAmp(r);
    assert.ok(rad - lastR >= 0 && rad - lastR <= 1, `spreads slowly (${(rad - lastR).toFixed(2)} px/frame)`);
    assert.ok(Math.abs(a - lastA) <= 0.1, "fades in and out smoothly");
    lastR = rad;
    lastA = a;
  }
  assert.ok(frames >= 60 * 4 && frames <= 60 * 6, `lasts ${(frames / 60).toFixed(1)} s`);
  assert.ok(lastA < 0.02, "already invisible when removed");
  assert.equal(frames, RIPPLE_LIFE);
});

test("at most ten at once; when full, new ones are skipped instead of yanking old ones away", () => {
  const lake = createLake();
  for (let i = 0; i < 15; i++) touch(lake, "click", 100 + i * 50, 700, 500);
  assert.equal(MAX_RIPPLES, 10);
  assert.equal(lake.ripples.length, 10);
  assert.equal(lake.ripples[0].x, 100, "the first ones stay");
});

test("a petal landing makes a smaller ripple than a click", () => {
  const lake = createLake();
  touch(lake, "drop", 300, 700, 500);
  touch(lake, "click", 600, 700, 500);
  assert.ok(lake.ripples[0].strength <= lake.ripples[1].strength * 0.4);
});

test("petals: about half land on the water (below the horizon), ripple once, rest and fade on the surface", () => {
  const top = 500;
  const h = 900;
  const lands = { x: 0, y: 0, alpha: 0.8, land: 0.5, landed: 0 };
  const floats = { x: 0, y: 0, alpha: 0.8, land: null, landed: 0 };
  const ly = landingY(lands, top, h);
  assert.ok(ly > top && ly < h, `lands on the water (y ${ly})`);
  assert.equal(landingY(floats, top, h), Infinity, "the other half never lands");
  assert.equal(landingY(lands, null, h), Infinity, "no lake known yet: no landing");
  let events = [];
  for (let y = 0; y < h; y += 0.4) {
    lands.y = y;
    const ev = settle(lands, ly);
    if (ev) events.push(ev);
    if (ev === "gone") break;
  }
  assert.equal(events[0], "land", "it lands once (that is when the ripple happens)");
  assert.equal(events.filter((e) => e === "land").length, 1);
  assert.equal(events.at(-1), "gone");
  // 落水後在水面上慢慢淡掉
  const p = { alpha: 0.8, land: 0.5, landed: 1 };
  let last = landedAlpha(p);
  for (let i = 1; i < LAND_FADE; i++) {
    p.landed = i + 1;
    const a = landedAlpha(p);
    assert.ok(a <= last && last - a <= 0.02, "fades slowly");
    last = a;
  }
  assert.ok(LAND_FADE >= 60, "rests on the water for at least a second");
});

test("mouse-glide ripples leave room, so a click always gets its ripple", () => {
  const lake = createLake();
  for (let i = 0; i < 600; i++) {
    touch(lake, "move", 100 + ((i * 7) % 1200), 650 + (i % 5) * 40, 500);
    stepLake(lake);
  }
  assert.ok(lake.ripples.filter((r) => r.strength < 1).length <= MAX_RIPPLES - 4, "glide ripples use at most 6 slots");
  assert.ok(touch(lake, "click", 700, 800, 500), "the click still gets one");
});

test("a petal crossing its landing line where the water is hidden (in front of the gate) keeps falling instead", () => {
  const p = { x: 0, y: 0, alpha: 0.8, land: 0.5, landed: 0 };
  const ly = landingY(p, 500, 900);
  p.y = ly + 1;
  assert.equal(settle(p, ly, false), null, "no landing there");
  assert.equal(p.landed, 0);
  assert.equal(landingY(p, 500, 900), Infinity, "and it will not try again");
});

test("resizing the window keeps ripples on the same spot of the lake (they do not vanish)", () => {
  const lake = createLake();
  const a = coverMap(1440 * 1.08, 900 * 1.08, IW, IH, 0.6);
  touch(lake, "click", 700, 650, waterTop(a, IH));
  const r = lake.ripples[0];
  const imgPt = { x: (r.x - a.ox) / a.scale, y: (r.y - a.oy) / a.scale };
  const b = coverMap(1440 * 1.08, 1200 * 1.08, IW, IH, 0.6);
  remapRipples(lake, a, b);
  assert.ok(Math.abs((r.x - b.ox) / b.scale - imgPt.x) < 1e-9 && Math.abs((r.y - b.oy) / b.scale - imgPt.y) < 1e-9, "same point of the image");
  assert.ok(r.y > waterTop(b, IH), "still on the water");
});
