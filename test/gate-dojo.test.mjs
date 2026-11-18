// 首頁（月白版）的大門換成道場門。
// 使用者 2026-11-16：「舊的版本，首頁的廟門需要改成同樣風格的道場」；第一版「神壇不見了、側面不像照片裡的建築」→
// 第二版照真的道場照片（assets/raw/dojo-photos/hall-1.jpg）從入口往裡看 →「邊界感太重」→ 第三版拿掉外面的厚白框 →「可以」。
//
// 規格：
// 1. 月白版首頁的大門圖換成 assets/gate-dojo.webp（AI Video 做的第三版去背）：從入口往裡看，兩面斜斜的白牆、
//    一層層木條框、走廊兩旁的光明燈牆，最裡面看得到神壇；沒有屋瓦、沒有燈籠。
// 2. 圖是透明背景：建築以外看得到後面的天空和山；圖檔小（1.5 MB 以內），寬至少 1776（設計寬 1600）。
// 3. 設計座標：寬 1600、高 1067（跟圖的比例一樣）。
// 4.（2026-11-17 起改成 4b）珠簾掛在走廊口：左右在走廊兩旁的燈牆之間（x 611–982，跟原本廟門的門洞一樣寬，所以桃樹的位置不用變；
//    改成填滿整個木框門口的話，手機上桃樹只剩 48px 寬）。門口不是透明的（後面畫著走廊和神壇），
//    珠簾的字一樣間距（格子跟著門口大小，見 js/layout.js）。
//    2026-11-16 審查後：最上面一排字整個露在最裡面那層木框下面（y 456）；珠簾被重力拉長以後，剛好垂到門口地板的邊（y 944，
//    台階從這裡開始），不會在地板中間被攔腰切斷。
// 5. 匾在入口橫樑下那塊空白的木匾上：中心 (801, 372)、300×82，「慈惠道場」疊在上面。
// 6. 青鳥停在最外面木條橫樑的頂邊（2026-11-17 湖邊版：y 240，橫樑兩端被霧吃掉，清楚的那段是 x 566–1032）：左右各兩隻、臉朝中間；匾的上緣（y 331）也可以停兩隻。
// 7. 手機：中間那段（x 441–1161：木框加一點白牆）塞滿畫面寬度。
// 8. 油畫版（?look=oil、?look=oil-red）還是原本的廟門圖，位置數字照舊，不受影響。
// 9. 桃樹還是站在門口右邊、整棵在畫面裡（test/peach.test.mjs 照新的門口位置檢查）。
// 10. 道場門的門口不是透明的，所以珠簾畫在大門圖的前面（原本的廟門是從透明的門洞看到後面的珠簾；油畫版照舊）。
//     換場時模糊的大門還是蓋在最上面（珠簾那時候跟清楚的大門一起淡掉）。
// 4b. 2026-11-17 使用者：「珠簾拉出來匾額那層」：珠簾往前掛在有匾的那一層木框裡，左右剛好填滿那層木框的門口
//     （x 486–1118），上緣在匾的下面（匾的下緣 y 413，最上面一排字整個露在匾下面），垂好剛好到地板邊緣（y 944）。
//     門比較寬：手機上桃樹會站在門口右前方，蓋到珠簾右邊一點（桃樹畫在大門前面，點樹不會拉到珠簾，見 test/peach.test.mjs）。
// 11. 珠簾只畫在那一層木框的門口裡（x 486–1118、y 414–944）：拉著晃出去、往上拉的部分，像是被木框擋住
//     （不會跑到白牆上、不會蓋到匾，也不會在看不到的直線上突然斷掉）；最下面在地板邊緣前慢慢淡掉。
//     油畫版的廟門照舊（珠簾在拱門後面，本來就被擋住）。
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, statSync } from "node:fs";
import { GATE, gateFor } from "../js/gate.js";
import { gridFor } from "../js/layout.js";

const file = (f) => new URL(`../${f}`, import.meta.url);
const html = readFileSync(file("index.html"), "utf8");

// WebP（VP8X）檔頭：有沒有透明、寬、高
function webpInfo(path) {
  const b = readFileSync(file(path));
  assert.equal(b.toString("latin1", 0, 4), "RIFF");
  assert.equal(b.toString("latin1", 8, 16), "WEBPVP8X", `${path}: extended WebP (has an alpha flag)`);
  return { alpha: (b[20] & 0x10) !== 0, w: 1 + b.readUIntLE(24, 3), h: 1 + b.readUIntLE(27, 3) };
}

test("the moon-white homepage shows the dojo gate, a see-through cut-out of the right shape", () => {
  assert.equal(GATE.src, "assets/gate-dojo.webp");
  const info = webpInfo(GATE.src);
  assert.ok(info.alpha, "transparent around the building (the sky and mountains show)");
  assert.ok(info.w >= 1776, `sharp enough (${info.w} px wide)`);
  assert.ok(Math.abs(info.w / info.h - GATE.w / GATE.h) < 0.005, `design size ${GATE.w}×${GATE.h} has the picture's shape (${info.w}×${info.h})`);
  assert.equal(GATE.w, 1600);
  assert.equal(GATE.h, 1067);
  assert.ok(statSync(file(GATE.src)).size <= 1.5 * 1024 * 1024, "small file");
  const img = html.match(/<img[^>]*id="gateImg"[^>]*>/)?.[0] ?? "";
  assert.match(img, new RegExp(`src="${GATE.src}"`), "the page loads it straight away (no swap after loading)");
});

test("the curtain hangs across the corridor between the lamp walls (light-curtain spacing, see test/light-curtain.test.mjs)", () => {
  assert.deepEqual(GATE.door, { x0: 536, x1: 1068, y0: 421, y1: 880 });
  // 最外面兩串（加上字的半寬 7）整個在木框裡，也不蓋到內側白牆上的「無極」（左 x 470–525、右 x 1081–1135）
  assert.ok(GATE.door.x0 - 7 > 525 && GATE.door.x1 + 7 < 1081, "the outer strands keep clear of 無極");
  assert.ok(GATE.door.x0 - 7 >= GATE.opening.x0 && GATE.door.x1 + 7 <= GATE.opening.x1, "no strand is cut by the frame while hanging still");
  assert.ok(GATE.door.x0 > GATE.centerBay.x0 && GATE.door.x1 < GATE.centerBay.x1, "inside the part phones always show");
});

test("the 慈惠道場 plaque sits on the blank wooden board under the entrance beam", () => {
  assert.deepEqual(GATE.plaque, { cx: 801, cy: 372, w: 300, h: 82 });
  assert.ok(GATE.plaque.cy + GATE.plaque.h / 2 < GATE.door.y0, "above the doorway");
});

test("the birds perch on the top edge of the wooden beam (two each side, facing in) and on the plaque", () => {
  const beam = GATE.perches.filter((p) => p.y === 240);
  assert.equal(beam.length, 4, "four on the beam");
  for (const p of beam) assert.ok(p.x >= 566 + 20 && p.x <= 1032 - 20, `x ${p.x} is on the clear stretch of beam, not in the mist`);
  const left = beam.filter((p) => p.x < 800);
  const right = beam.filter((p) => p.x > 800);
  assert.equal(left.length, 2);
  assert.equal(right.length, 2);
  assert.ok(left.every((p) => p.face === 1) && right.every((p) => p.face === -1), "all face the middle");
  const plaque = GATE.perches.filter((p) => p.y === GATE.plaque.cy - GATE.plaque.h / 2);
  assert.equal(plaque.length, 2, "two on the top of the plaque");
  for (const p of plaque) assert.ok(Math.abs(p.x - GATE.plaque.cx) < GATE.plaque.w / 2 - 20, "on the plaque, not past its ends");
  assert.equal(GATE.perches.length, 6);
});

test("phones: the wooden doorway and a little of the white walls fill the width", () => {
  assert.deepEqual(GATE.centerBay, { x0: 441, x1: 1161 });
});

test("the oil looks keep the old temple gate and its own numbers", () => {
  for (const look of ["oil", "oil-red"]) {
    const g = gateFor(look);
    assert.deepEqual(g.door, { x0: 611, x1: 982, y0: 440, y1: 912 }, `${look}: old doorway`);
    assert.deepEqual(g.plaque, { cx: 800, cy: 373, w: 319, h: 83 });
    assert.equal(g.h, 1070);
    assert.equal(g.perches[0].y, 403, "old roof-ridge perches");
  }
});

test("the curtain hangs in front of the dojo gate (its doorway is not see-through); the oil looks keep it behind the temple arch", () => {
  const css = readFileSync(file("style.css"), "utf8");
  const esc = (s) => s.replace(/[.#[\]"=]/g, (c) => "\\" + c);
  const z = (sel) => Number(css.match(new RegExp(String.raw`(^|\n)` + esc(sel) + String.raw`\s*\{[^}]*z-index:\s*(\d+)`))?.[2]);
  assert.ok(z("#cloth") > z(".gate-img"), `dojo: curtain (${z("#cloth")}) in front of the gate (${z(".gate-img")})`);
  assert.ok(z("#cloth") < z(".gate-blur"), "the blurred gate still covers everything during a scene change");
  assert.ok(z('[data-look] #cloth') < z(".gate-img"), "oil looks: behind the temple arch, seen through its open doorway");
});

// js/main.js 的珠簾物理（main.js 沒有匯出；下面確認兩邊一樣）
const SIM = { gravity: 0.2, damping: 0.985, iterations: 5 };

test("the curtain shows only inside the innermost wooden doorway: swung or pulled parts look hidden by the frame", () => {
  const O = GATE.opening;
  assert.deepEqual(O, { x0: 486, x1: 1118, y0: 414, y1: 944 });
  const d = GATE.door;
  assert.ok(O.x0 < d.x0 && O.x1 > d.x1, "room inside the frame to swing; swung further, strands disappear behind its posts");
  assert.ok(d.y0 - 6 >= O.y0, "the top row of characters is fully below the wooden header");
  assert.ok(O.y0 > GATE.plaque.cy + GATE.plaque.h / 2, "pulled up, it can never cover the plaque");
  const main = readFileSync(file("js/main.js"), "utf8");
  assert.match(main, /const O = GATE\.opening;/);
  assert.match(main, /clipPath = `inset\(\$\{O\.y0 - top\}px \$\{left \+ CANVAS_W - O\.x1\}px \$\{top \+ CANVAS_H - O\.y1\}px \$\{O\.x0 - left\}px\)`/, "clipped to the doorway on all four sides");
  assert.match(main, /const fade = `linear-gradient\(to bottom, #000 \$\{O\.y1 - top - FLOOR_FADE\}px, transparent \$\{O\.y1 - top\}px\)`;\s*canvas\.style\.maskImage = fade;/, "fades out just before the floor edge");
  assert.match(main, /webkitMaskImage/, "Safari too");
  assert.match(main, /const SIM = \{ gravity: 0\.2, damping: 0\.985, iterations: 5 \};/, "same physics as this test");
  for (const look of ["oil", "oil-red"]) assert.equal(gateFor(look).opening, undefined, `${look}: the temple arch hides it, no clipping`);
});

test("hanging at rest, the curtain reaches the doorway floor edge (not cut through the middle of the floor)", async () => {
  const { createCloth, step } = await import("../js/cloth.js");
  const d = GATE.door;
  const { cols, rows } = gridFor(GATE);
  const cloth = createCloth({ cols, rows, width: d.x1 - d.x0, height: d.y1 - d.y0 });
  for (let i = 0; i < 600; i++) step(cloth, SIM);
  const bottom = cloth.particles.filter((p) => p.row === rows - 1);
  const y = d.y0 + bottom.reduce((s, p) => s + p.y, 0) / bottom.length;
  assert.ok(y <= GATE.opening.y1 + 8, `the last row (y ${y.toFixed(0)}) is not cut off: it ends at the floor edge ${GATE.opening.y1}`);
  assert.ok(y >= GATE.opening.y1 - 40, `and it nearly reaches it (y ${y.toFixed(0)}), so the fade hides the last row softly`);
});

test("phones: the wider dojo curtain lets the peach tree stand in front of its right edge (the tree is drawn above the gate)", () => {
  assert.equal(GATE.treeOverDoor, true);
  for (const look of ["oil", "oil-red"]) assert.equal(gateFor(look).treeOverDoor, undefined, `${look}: the old rule`);
  const css = readFileSync(file("style.css"), "utf8");
  const z = (sel) => Number(css.match(new RegExp(String.raw`(^|\n)\.` + sel + String.raw`\s*\{[^}]*z-index:\s*(\d+)`))?.[2]);
  assert.ok(z("peach") > z("stage"), "the tree is in front of the gate");
  assert.match(readFileSync(file("js/peach.js"), "utf8"), /GATE\.treeOverDoor/);
});
