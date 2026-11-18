// 首頁道場門前慢慢飄的薄霧。
// 使用者 2026-11-17：「雲中的道場」改成湖邊、平平的薄霧帶以後，「薄霧好像太淺，我沒看到」、「還是沒看到霧，在哪裡啊？」
// → 畫在圖上的霧大多在道場外面，跟背景本來的霧混在一起看不出來 → 使用者選 A：讓霧在道場前面慢慢飄（動的才看得到）。
//
// 規格：
// 1. 道場門（月白版）前面有三層很淡的橫向薄霧，非常慢地橫著飄（一圈 60～120 秒），相鄰兩層往相反方向（有遠近感）。
//    油畫版的廟門沒有。
// 2. 一層貼著地板和水面（整個寬度）；一層在兩邊白牆的下半部；一層淡淡地飄過兩個上角和橫樑兩端。
// 3. 不蓋到字：兩邊白牆上的「瑤池」「無極」（左 x 388–525、右 x 1081–1216、y 383–550）完全不會有霧。
//    上角那層只在兩邊，不碰到中間給青鳥停的橫樑（x 566–1032）和匾。
// 4. 霧在大門圖的前面、珠簾的後面（珠簾的金字不會被霧蓋住）；換神明時跟大門一起淡掉、一起放大。
// 5. 很淡：每一層最濃不超過六成；顏色是背景的珍珠白。霧的形狀是程式畫的柔和橫條，左右接得起來（飄的時候看不到接縫），每次都一樣。
// 6. 要求減少動畫：霧還在，但不動。
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { MIST_BANDS, visibleAt, mistBlobs } from "../js/gate-mist.js";
import { GATE, gateFor } from "../js/gate.js";

const read = (f) => readFileSync(new URL(`../${f}`, import.meta.url), "utf8");
const WORDS = [
  { x0: 388, x1: 525, y0: 383, y1: 550 },
  { x0: 1081, x1: 1216, y0: 383, y1: 550 }
];

test("three faint bands, drifting very slowly, neighbours in opposite directions; only on the dojo gate", () => {
  assert.equal(MIST_BANDS.length, 3);
  for (const b of MIST_BANDS) {
    assert.ok(b.seconds >= 60 && b.seconds <= 120, `one round takes ${b.seconds} s`);
    assert.ok(b.opacity > 0 && b.opacity <= 0.6, `faint (${b.opacity})`);
    assert.ok(b.y0 < b.y1 && b.y0 >= 0 && b.y1 <= GATE.h);
  }
  for (let i = 1; i < MIST_BANDS.length; i++) assert.notEqual(MIST_BANDS[i].dir, MIST_BANDS[i - 1].dir, "neighbours drift opposite ways");
  assert.equal(GATE.mist, true);
  for (const look of ["oil", "oil-red"]) assert.equal(gateFor(look).mist, undefined, `${look}: no drifting mist`);
});

test("where the bands are: the floor and water, the lower walls, the upper corners", () => {
  const [water, walls, corners] = MIST_BANDS;
  assert.ok(water.y0 >= 820 && water.y1 === GATE.h, "along the floor and water, to the bottom");
  assert.ok(visibleAt(water, 800) > 0, "across the middle too");
  assert.ok(walls.y0 >= 560 && walls.y1 <= 860, "the lower half of the walls");
  assert.ok(corners.y1 <= 360, "up at the beam and corners");
});

test("never over the calligraphy, the birds' stretch of beam, or the plaque", () => {
  for (const b of MIST_BANDS) {
    for (const w of WORDS) {
      const crossesRows = b.y0 < w.y1 && b.y1 > w.y0;
      if (!crossesRows) continue;
      for (let x = w.x0; x <= w.x1; x += 4) assert.equal(visibleAt(b, x), 0, `band at y ${b.y0}–${b.y1} over the characters at x ${x}`);
    }
  }
  const corners = MIST_BANDS[2];
  for (let x = 566; x <= 1032; x += 4) assert.equal(visibleAt(corners, x), 0, `the birds' beam at x ${x} stays clear`);
  assert.ok(visibleAt(corners, 380) > 0.5 && visibleAt(corners, 1220) > 0.5, "the two corners are misty");
  for (const b of MIST_BANDS) assert.ok(b.y0 >= GATE.plaque.cy + GATE.plaque.h / 2 || b.y1 <= GATE.plaque.cy - GATE.plaque.h / 2 || [651, 801, 951].every((x) => visibleAt(b, x) === 0), "not over the plaque");
});

test("the mist shapes: soft horizontal blobs that join up left to right, the same every time", () => {
  const a = mistBlobs(7, 1600, 200, 24);
  assert.deepEqual(mistBlobs(7, 1600, 200, 24), a, "the same every time");
  assert.notDeepEqual(mistBlobs(8, 1600, 200, 24), a, "each band its own shapes");
  for (const b of a) {
    assert.ok(b.rx > b.ry * 2, "wide and flat (horizontal streaks)");
    assert.ok(b.x >= 0 && b.x < 1600 && b.y >= 0 && b.y <= 200);
    assert.ok(b.alpha > 0 && b.alpha <= 1);
  }
  // 接縫：見下面「the loop is seamless」
});

test("in front of the gate picture, behind the curtain; inside the gate so it fades and zooms with it", () => {
  const css = read("style.css");
  const z = (sel) => Number(css.match(new RegExp(String.raw`(^|\n)` + sel.replace(/[.#-]/g, (c) => "\\" + c) + String.raw`\s*\{[^}]*z-index:\s*(\d+)`))?.[2]);
  assert.equal(z(".gate-mist"), z(".gate-img"), "same layer as the picture …");
  assert.ok(z(".gate-mist") < z("#cloth"), "… below the curtain");
  const view = read("js/gate-mist-view.js");
  assert.match(view, /gateImg[\s\S]{0,40}\.after\(/, "placed right after the picture (on top of it within the same layer)");
  assert.match(read("js/main.js"), /if \(GATE\.mist\)[^\n]*addGateMist\(/, "only for the dojo gate");
});

test("slow and smooth; reduced motion keeps the mist but stops it", () => {
  const css = read("style.css");
  assert.match(css, /@keyframes gate-mist-drift\s*\{[^}]*translateX\(-50%\)/, "slides by exactly one strip width (seamless loop)");
  assert.match(css, /\.gate-mist-band\s*\{[^}]*animation:\s*gate-mist-drift[^;]*linear infinite/, "steady, no easing jumps at the loop");
  const reduced = css.slice(css.lastIndexOf("@media (prefers-reduced-motion: reduce)"));
  assert.match(reduced, /\.gate-mist-band\s*\{[^}]*animation:\s*none/);
  const view = read("js/gate-mist-view.js");
  assert.match(view, /animationDuration = `\$\{b\.seconds\}s`/);
  assert.match(view, /animationDirection = b\.dir < 0 \? "normal" : "reverse"/);
});

// ── 2026-11-18 審查後 ──
// 7. 霧在大門圖的左右兩端慢慢淡到沒有（大門圖兩端本來就是透明的，霧不能在那裡變成一條直直的邊）。
// 8. 飄一圈接回開頭時看不出來：霧的長條左右兩半一模一樣（每團霧在兩倍寬的長條裡畫四份，各畫一次）。
// 9. 霧跟著大門一起淡入（一進首頁就慢慢出現，不會等別的圖載完才突然跳出來）；換神明時跟清楚的大門一起淡出、淡入。

test("the mist fades out towards both ends of the gate picture (no straight edge in the sky)", async () => {
  const { MIST_W } = await import("../js/gate-mist.js");
  assert.equal(MIST_W, GATE.w);
  for (const b of MIST_BANDS) {
    assert.equal(visibleAt(b, 0), 0, `band ${b.y0}: nothing at the left end`);
    assert.equal(visibleAt(b, MIST_W), 0, `band ${b.y0}: nothing at the right end`);
    let prev = 0;
    for (let x = 0; x <= 150; x += 10) {
      const v = visibleAt(b, x);
      assert.ok(v >= prev - 1e-9 && v - prev <= 0.2, `band ${b.y0}: fades in smoothly from the left edge (x ${x})`);
      prev = v;
    }
  }
  assert.ok(visibleAt(MIST_BANDS[0], 800) === 1, "the floor band is full across the middle");
});

test("the loop is seamless: each blob is drawn at x − w, x, x + w and x + 2w, once each", async () => {
  const { stripCopies } = await import("../js/gate-mist.js");
  assert.deepEqual(stripCopies(100, 1600), [-1500, 100, 1700, 3300]);
  // 兩倍寬的長條：左半和右半的每一團霧位置一樣（差一個寬度）
  const xs = stripCopies(1234, 1600);
  assert.equal(new Set(xs).size, xs.length, "no blob drawn twice in the same place");
  assert.match(read("js/gate-mist-view.js"), /for \(const x of stripCopies\(b\.x, w\)\)/);
});

test("the mist fades in with the gate (not popping in later) and fades with the sharp gate during a deity change", () => {
  const css = read("style.css");
  assert.match(css, /\.gate-mist\s*\{[^}]*animation:\s*gate-mist-in\s+[\d.]+s/, "fades in");
  assert.match(css, /@keyframes gate-mist-in\s*\{\s*from\s*\{\s*opacity:\s*0/);
  const main = read("js/main.js");
  assert.match(main, /bakeBlurredGate\(\);[\s\S]{0,200}if \(GATE\.mist\) addGateMist\(GATE\)/, "added right when the gate is ready");
  assert.match(main, /for \(const id of \["gateImg", "cloth", "plaque", "gateMist"\]\)/, "crossfades with the sharp gate");
  assert.match(read("js/gate-mist-view.js"), /wrap\.id = "gateMist"/);
});

test("every band gets the mask (so even the full-width floor band fades out at both ends)", () => {
  const view = read("js/gate-mist-view.js");
  assert.doesNotMatch(view, /if \(b\.clear\) \{\s*const m = maskFor/, "not only the bands with a clear middle");
  assert.match(view, /const m = maskFor\(b, gate\.w\);\s*row\.style\.maskImage = m;/);
});

// ── 2026-11-18 使用者：「再疊一層時隱時現的濃一點的霧」──
// 10. 再加兩團比較濃的霧，會慢慢變濃、再慢慢散開（一次約 16～24 秒），同時也慢慢橫著飄：
//     一團在兩邊（白牆下半到地板），一團在中間的地板和水面上；兩團錯開半拍（一邊濃的時候另一邊淡）。
//     最濃不超過八成五；跟其他霧一樣不蓋字、匾、青鳥的橫樑，在珠簾後面，兩端淡掉。
// 11. 使用者還是看不到（量過：霧濃淡變化時畫面只差 2～5／255）：白霧蓋在白牆上看不出來。
//     所以濃的那兩團要有明暗：上面亮白、底下帶一點灰藍的陰影（真的霧堆就是這樣），在白牆上也看得出一團一團；
//     而且飄過比較深的地方：木頭門框、走廊下面的燈牆、地上的倒影、大門兩旁的山。
//     要求減少動畫：不動、不變，固定在淡淡的樣子。
// 12. 20 秒一輪太慢，看不出霧在變（使用者 2026-11-18 選 A）：變濃再散開改成 12 秒一輪，還是慢慢的。

test("two denser patches that slowly thicken and thin, half a beat apart", async () => {
  const { MIST_PUFFS } = await import("../js/gate-mist.js");
  assert.equal(MIST_PUFFS.length, 2);
  for (const p of MIST_PUFFS) {
    assert.equal(p.breathe, 12, `one thicken-and-thin takes ${p.breathe} s`);
    assert.ok(p.peak > Math.max(...MIST_BANDS.map((b) => b.opacity)) && p.peak <= 0.85, `denser than the thin bands, still see-through (${p.peak})`);
    assert.ok(p.seconds >= 60 && p.seconds <= 120, "also drifts slowly");
    assert.ok(p.y1 <= GATE.h && p.y0 >= 560, "low: lower walls, floor and water");
    for (let x = 0; x <= 1600; x += 20) assert.ok(visibleAt(p, x) >= 0 && visibleAt(p, x) <= 1);
    assert.equal(visibleAt(p, 0), 0, "fades out at the ends like the other mist");
  }
  const [sides, middle] = MIST_PUFFS;
  assert.equal(visibleAt(sides, 800), 0, "the side patch leaves the middle clear");
  assert.ok(visibleAt(sides, 420) > 0.5 && visibleAt(sides, 1180) > 0.5);
  assert.ok(visibleAt(middle, 800) > 0.9, "the middle patch is on the floor in the middle");
  assert.ok(Math.abs(Math.abs(sides.delay - middle.delay) - sides.breathe / 2) < 1e-9, "half a beat apart");
});

test("the patches breathe with CSS (smooth in and out), and stay still and faint for reduced motion", () => {
  const css = read("style.css");
  assert.match(css, /@keyframes gate-mist-breathe\s*\{[\s\S]*?0%,\s*100%\s*\{\s*opacity:\s*0[\s\S]*?50%\s*\{\s*opacity:\s*var\(--peak\)/, "from nothing to its peak and back");
  assert.match(css, /\.gate-mist-puff\s*\{[^}]*animation:\s*gate-mist-drift[^;]*,\s*gate-mist-breathe[^;]*ease-in-out infinite/, "drifts and breathes");
  const reduced = css.slice(css.lastIndexOf("@media (prefers-reduced-motion: reduce)"));
  assert.match(reduced, /\.gate-mist-puff\s*\{[^}]*animation:\s*none;[^}]*opacity:\s*calc\(var\(--peak\) \* 0\.3\)/, "reduced motion: still and faint");
  const view = read("js/gate-mist-view.js");
  assert.match(view, /setProperty\("--peak", String\(p\.peak\)\)/);
  assert.match(view, /animationDuration = `\$\{p\.seconds\}s, \$\{p\.breathe\}s`/, "drift and breathe on their own clocks");
  assert.match(view, /animationDelay = `0s, \$\{p\.delay\}s`/);
});

test("the dense patches are shaded (bright tops, a soft grey-blue underside) so they show on white walls", async () => {
  const { MIST_PUFFS } = await import("../js/gate-mist.js");
  const view = read("js/gate-mist-view.js");
  assert.match(view, /const SHADE = "\d+, \d+, \d+";/, "a grey-blue shade colour");
  const shade = view.match(/const SHADE = "(\d+), (\d+), (\d+)";/).slice(1).map(Number);
  assert.ok(shade[2] > shade[0] && Math.max(...shade) <= 200, `cool and clearly darker than the walls (${shade})`);
  assert.match(view, /drawStrip\(10 \+ i, gate\.w, p\.y1 - p\.y0, 30, true\)/, "the dense patches are drawn shaded");
  // 飄過比較深的地方：左邊的木頭門框和下面的燈牆（x 486–620），還有大門兩旁的山（x 170–330）
  const [sides] = MIST_PUFFS;
  for (const x of [200, 300, 500, 600]) assert.ok(visibleAt(sides, x) > 0.5, `over the darker parts at x ${x}`);
  assert.ok(sides.y0 <= 640, "reaches up to the lower lamp walls");
});

// 13. 審查發現：一團一團畫（每團先陰影再亮面），後面那團的陰影會壓在前面那團的亮面上，頂部出現灰斑。
//     要先把所有陰影畫完，再畫所有亮面，亮面才會全部在上面。
test("all the grey-blue shadows are drawn first, then all the bright tops over them", () => {
  const view = read("js/gate-mist-view.js");
  const shadePass = view.search(/if \(shaded\) for \(const b of blobs\)[^\n]*SHADE/);
  const brightPass = view.search(/for \(const b of blobs\) \{\s*\n[\s\S]*?BRIGHT/);
  assert.ok(shadePass > 0, "a separate pass for every shadow");
  assert.ok(brightPass > shadePass, "the bright pass comes after it");
});
