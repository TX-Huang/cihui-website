// 首頁（月白版、道場門）的珠簾改成金色發光的光簾，收在兩旁、中間露出神壇。
// 使用者 2026-11-17：道場門「看起來有點醜」→ 選 B（整個門重畫成跟桃樹、山一樣的畫風，AI Video 做）
// ＋ A 的部分也要：珠簾改成新首頁那種金色發光的光簾、收在兩旁讓中間露出神壇；白牆貼上真的「瑤池」「無極」（AI Video 做）。
//
// 規格：
// 1. 月白版（道場門）的珠簾：金色發光的字、淡淡的深金邊、光暈，重要的句子更亮；串字的細金線。
//    跟新首頁的光簾同一個畫法（js/light-curtain.js，程式只有一份）。
// 2. 收在兩旁：中間幾串很短、越往兩邊越長、最外面整串；左右對稱。
// 3. 中間露出神壇：掛好以後，神壇上方（x 760–850）的每一串，最低的字都停在紅匾上緣附近（y 600 以內），
//    神像（y 628–660）、紅匾、供桌都露出來。
// 4. 每一串越往下越淡，但不會完全不見。
// 5. 四位神明都一樣（各用自己的經文、各自的重要句子）；油畫版的廟門照舊（墨色字、整片掛滿）。
// 6. 字距跟新首頁的光簾差不多（一串隔 26、一個字隔 17，設計座標），比原本的珠簾鬆：光暈才不會糊成一片金色方塊；
//    每個字的光暈只畫在自己的格子裡（不會滲到旁邊的字）。字是 14px（原本的墨色字 12px）。
// 7. 重要的句子只會落在看得到的那一段（收起來藏住的部分不會有金色句子），而且每一句都在、整句不切半。
//    做法：每位神明的經文從哪個字開始掛可以挪（還是同一篇經文、同樣的順序），挑一個讓每一句都落在看得到的地方的起點。
//    新首頁的光簾也一樣。
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { strandRows, glyphAlpha, paintLightGlyph } from "../js/light-curtain.js";
import * as opening from "../js/opening.js";
import { GATE, gateFor } from "../js/gate.js";
import { gridFor, lightGrid, curtainGrid } from "../js/layout.js";
import { placeSutra, isHighlighted } from "../js/highlight.js";
import { charAt } from "../js/cloth.js";
import { DEITIES, ORDER } from "../js/deities.js";
import { createCloth, step } from "../js/cloth.js";

const read = (f) => readFileSync(new URL(`../${f}`, import.meta.url), "utf8");
const SIM = { gravity: 0.2, damping: 0.985, iterations: 5 }; // js/main.js 的珠簾物理（test/gate-dojo.test.mjs 確認一樣）

test("one shared light curtain: the new homepage and the dojo gate use the same shape and the same glyph painter", () => {
  assert.equal(opening.strandRows, strandRows, "the new homepage's opening uses it");
  assert.equal(opening.glyphAlpha, glyphAlpha);
  assert.match(read("js/opening-view.js"), /paintLightGlyph\(/, "the new homepage paints its characters with it");
  assert.match(read("js/main.js"), /from "\.\/light-curtain\.js"/, "the homepage too");
});

test("tied back: short in the middle, longer towards the sides, full at the edges, the same on both sides", () => {
  for (const short of [undefined, 0.18]) {
    const cols = 26;
    const rows = 29;
    const lens = Array.from({ length: cols }, (_, c) => strandRows(c, cols, rows, short));
    const mid = Math.floor((cols - 1) / 2);
    assert.equal(lens[0], rows, "the outermost strand is full length");
    assert.ok(lens[mid] <= rows * (short ?? 0.32) + 1, `the middle is short (${lens[mid]} of ${rows})`);
    for (let c = 0; c < cols; c++) assert.equal(lens[c], lens[cols - 1 - c], "mirror");
    for (let c = 1; c <= mid; c++) assert.ok(lens[c] <= lens[c - 1], `shorter towards the middle (col ${c})`);
  }
  assert.equal(strandRows(12, 26, 29), Math.round(29 * (0.32 + 0.68 * (Math.abs(12 / 25 - 0.5) * 2) ** 2)), "the new homepage's shape is unchanged");
});

test("each strand fades towards its end, but never disappears", () => {
  assert.equal(glyphAlpha(0, 20), 1);
  let prev = 1;
  for (let r = 0; r <= 20; r++) {
    const a = glyphAlpha(r, 20);
    assert.ok(a <= prev && a >= 0.25);
    prev = a;
  }
});

test("each character: gold with a glow and a faint dark-gold edge; the key lines brighter", () => {
  const calls = (hot) => {
    const log = [];
    const g = new Proxy(
      {},
      {
        set(o, k, v) {
          log.push([k, v]);
          o[k] = v;
          return true;
        },
        get(o, k) {
          if (k in o) return o[k];
          return (...args) => log.push([k, ...args]);
        }
      }
    );
    paintLightGlyph(g, "道", hot, 30);
    return log;
  };
  for (const hot of [false, true]) {
    const log = calls(hot);
    const set = (k) => log.filter((e) => e[0] === k).map((e) => e[1]);
    assert.equal(log.filter((e) => e[0] === "strokeText").length, 1, "one dark-gold edge");
    assert.equal(log.filter((e) => e[0] === "fillText").length, 2, "a glowing fill, then a crisp fill on top");
    assert.deepEqual(set("strokeStyle"), ["rgba(110, 70, 20, 0.55)"]);
    assert.ok(set("shadowBlur").includes(hot ? 12 : 8), "glow");
    assert.equal(set("shadowBlur").at(-1), 0, "the glow is switched off afterwards (does not leak into the next character)");
    assert.deepEqual(set("fillStyle"), [hot ? "#fff6dc" : "#ffd98a"], hot ? "key lines: almost white gold" : "gold");
    const at = log.find((e) => e[0] === "fillText");
    assert.deepEqual(at.slice(1, 4), ["道", 15, 15.5], "centred in its cell");
  }
});

test("the dojo gate's curtain is the light curtain, tied back; the oil looks keep the old ink curtain", () => {
  assert.equal(GATE.curtain, "light");
  assert.ok(GATE.tieBack > 0 && GATE.tieBack < 0.32, "tied back further than the new homepage's (the altar must show)");
  for (const look of ["oil", "oil-red"]) {
    assert.equal(gateFor(look).curtain, undefined, `${look}: ink, hung full`);
  }
  const main = read("js/main.js");
  assert.match(main, /const LIGHT = GATE\.curtain === "light";/);
  assert.match(main, /p\.visible = LIGHT \? strandRows\(p\.col, COLS, ROWS, GATE\.tieBack\) : ROWS;/, "tied back only for the light curtain");
  assert.match(main, /if \(p\.row >= p\.visible[^)]*\) continue;/, "the hidden ends are not drawn");
  assert.match(main, /globalAlpha = LIGHT \? glyphAlpha\(p\.row, p\.visible\) : 1;/, "the light strands fade towards their ends");
  assert.match(main, /paintLightGlyph\(atlasCtx, ch, hot, GLYPH\)/, "light characters go into the atlas too (fast to draw)");
  assert.match(main, /atlasCtx\.rect\(0, 0, GLYPH, GLYPH\);\s*atlasCtx\.clip\(\);\s*paintLightGlyph/, "each glow stays inside its own cell");
  assert.match(main, /const FONT = `600 \$\{LIGHT \? 14 : 12\}px/, "14px for the light characters");
  assert.match(main, /const \{ cols: COLS, rows: ROWS \} = gridFor\(GATE\);/, "the grid follows the curtain style");
});

test("hanging at rest, the middle strands stop above the altar: the statues and the red plaque show", () => {
  const d = GATE.door;
  const w = d.x1 - d.x0;
  const { cols, rows } = gridFor(GATE);
  const cloth = createCloth({ cols, rows, width: w, height: d.y1 - d.y0 });
  for (let i = 0; i < 600; i++) step(cloth, SIM);
  const at = (c, r) => cloth.particles[c * rows + r];
  let checked = 0;
  for (let c = 0; c < cols; c++) {
    const x = d.x0 + (c * w) / (cols - 1);
    if (x < 760 || x > 850) continue;
    const vis = strandRows(c, cols, rows, GATE.tieBack);
    const y = d.y0 + at(c, vis - 1).y;
    assert.ok(y <= 600, `strand over the altar (x ${x.toFixed(0)}) ends at y ${y.toFixed(0)}, above the statues`);
    checked++;
  }
  assert.ok(checked >= 3, `several strands cross the altar (${checked})`);
  // 兩邊還是很長：最外面的一串垂到地板邊緣附近
  const outer = d.y0 + at(0, rows - 1).y;
  assert.ok(outer >= GATE.opening.y1 - 40, `the outer strands still hang to the floor (y ${outer.toFixed(0)})`);
});

test("light curtain spacing: looser than the old ink curtain, like the new homepage's", () => {
  for (const [w, h] of [[371, 428], [600, 500], [200, 300]]) {
    const g = lightGrid(w, h);
    assert.ok(Math.abs(w / g.cols - 26) < 4, `${w}: ${(w / g.cols).toFixed(1)} between strands`);
    assert.ok(Math.abs(h / g.rows - 17) < 2, `${h}: ${(h / g.rows).toFixed(1)} between characters`);
  }
  const d = GATE.door;
  assert.deepEqual(gridFor(GATE), lightGrid(d.x1 - d.x0, d.y1 - d.y0), "the dojo gate: light grid");
  const o = gateFor("oil");
  assert.deepEqual(gridFor(o), curtainGrid(o.door.x1 - o.door.x0, o.door.y1 - o.door.y0), "the oil temple: the old grid");
});

test("key sentences land only where they can be seen (never in the tied-back, hidden part)", () => {
  const { cols, rows } = gridFor(GATE);
  const visible = (c) => strandRows(c, cols, rows, GATE.tieBack);
  for (const id of ORDER) {
    const d = DEITIES[id];
    const { text, ranges } = placeSutra(d.cloth, d.keys, cols, rows, id, visible);
    assert.equal(Array.from(text).length, Array.from(d.cloth).length, `${id}: the same scripture`);
    assert.ok((text + text).includes(d.cloth), `${id}: only the starting point moved (same order)`);
    assert.equal(ranges.length, d.keys.length, `${id}: every key sentence has a place`);
    for (let c = 0; c < cols; c++) {
      for (let r = visible(c); r < rows; r++) assert.ok(!isHighlighted(c, r, cols, rows, ranges), `${id}: gold at col ${c} row ${r} is hidden`);
    }
    // 金色的字讀起來剛好是那幾句（整句、不切半）
    const runs = ranges.map((g) => {
      let s = "";
      for (let i = g.start; i < g.end; i++) s += charAt(text, cols - 1 - Math.floor(i / rows), i % rows, cols, rows);
      return s;
    });
    assert.deepEqual([...runs].sort(), [...d.keys].sort(), `${id}: gold reads ${JSON.stringify(runs)}`);
    assert.deepEqual(placeSutra(d.cloth, d.keys, cols, rows, id, visible), { text, ranges }, `${id}: the same every time`);
  }
  // 新首頁的大小也都放得下
  for (const [vw, vh] of [[1280, 800], [390, 844], [1920, 1080]]) {
    const L = opening.curtainLayout(vw, vh);
    for (const id of ["jinmu"]) {
      const d = DEITIES[id];
      const { ranges } = placeSutra(d.cloth, d.keys, L.cols, L.rows, id, (c) => strandRows(c, L.cols, L.rows));
      assert.equal(ranges.length, d.keys.length, `new homepage ${vw}×${vh}: every key sentence shows`);
    }
  }
  // 網頁真的這樣用（加上一句話開頭的起點）：見下面「the scripture is moved only to the start of a clause」
});

// ── 2026-11-17 審查後 ──
// 8. 光簾收起來藏住的珠子不能撥、不能抓、不會響（神壇前面空空的地方，滑鼠移過去不會有反應）。
// 9. 經文挪起點時，只從一句話的開頭開始（不會從「解脫亦易」中間的「脫」開始）。
// 10. 進場時響的三聲，照珠簾有幾串來挑（不會超出範圍、音不會變高）。
// 11. 光暈的大小不管螢幕清晰度都一樣（畫的時候放大多少倍，光暈也放大多少倍）。

test("hidden (tied-back) beads cannot be pushed, grabbed or rung", async () => {
  const { nearest, push: pushCloth } = await import("../js/cloth.js");
  const cloth = createCloth({ cols: 3, rows: 4, width: 40, height: 60 });
  const shown = (p) => p.row < 2;
  const hiddenBead = cloth.particles.find((p) => p.col === 1 && p.row === 3);
  assert.equal(nearest(cloth, hiddenBead.x, hiddenBead.y, 400, shown)?.p.row ?? -1, -1, "nothing visible near a hidden bead");
  assert.ok(nearest(cloth, hiddenBead.x, hiddenBead.y, 400)?.p === hiddenBead, "without the filter it is still found (old curtains)");
  const before = { x: hiddenBead.x, y: hiddenBead.y };
  pushCloth(cloth, hiddenBead.x - 3, hiddenBead.y, 30 * 30, 4, shown);
  step(cloth, { gravity: 0, damping: 1, iterations: 0 });
  assert.deepEqual({ x: hiddenBead.x, y: hiddenBead.y }, before, "a hidden bead is not pushed");
  const main = read("js/main.js");
  assert.match(main, /const shown = \(p\) => p\.row < p\.visible;/);
  assert.match(main, /nearest\(cloth, x, y, CHIME_R2, shown\)/, "chimes ring only for visible beads");
  assert.match(main, /nearest\(cloth, x, y, GRAB_R2, shown\)/, "only visible beads can be grabbed");
  assert.match(main, /push\(cloth, x, y, TOUCH_R2, TOUCH_FORCE, shown\)/);
  assert.match(read("js/opening-view.js"), /push\(curtain\.cloth, [^;]*\(p\) => p\.row < p\.visible\)/, "the new homepage too");
});

test("the scripture is moved only to the start of a clause", async () => {
  const { SUTRA } = await import("../js/deities.js");
  assert.equal(
    SUTRA,
    "解脫非難難在定慧身心大定便生智慧智慧既生解脫亦易欲明解脫先除六賊耳不聽聲目不視色身不觸污意不著物鼻不妄嗅口不貪食六賊既空五蘊自明受想行識如鏡見形五蘊自明三家會合精氣與神長養活潑上下流通何難解脫　",
    "金母's text itself is unchanged"
  );
  for (const id of ORDER) {
    const d = DEITIES[id];
    const n = Array.from(d.cloth).length;
    assert.ok(Array.isArray(d.starts) && d.starts[0] === 0, `${id}: clause starts begin at 0`);
    for (let i = 1; i < d.starts.length; i++) assert.ok(d.starts[i] > d.starts[i - 1] && d.starts[i] < n, `${id}: sorted, inside the text`);
  }
  const at = (id, s) => Array.from(DEITIES[id].cloth).slice(s).join("");
  for (const [id, clause] of [["jinmu", "難在定慧"], ["jinmu", "解脫亦易"], ["jinmu", "六賊既空"], ["tudi", "本境真君"], ["tudi", "引人拓植"], ["nezha", "三年六月始出世"], ["xuannu", "無心者謂之過"]]) {
    assert.ok(DEITIES[id].starts.some((s) => at(id, s).startsWith(clause)), `${id}: 「${clause}」 starts a clause`);
  }
  assert.ok(!DEITIES.jinmu.starts.some((s) => at("jinmu", s).startsWith("脫亦易")), "never in the middle of 解脫亦易");
  // 首頁、新首頁：挪過以後一定是從某一句的開頭開始，而且每一句重要的句子都看得到
  const check = (cols, rows, vis, label) => {
    for (const id of ORDER) {
      const d = DEITIES[id];
      const { text, ranges } = placeSutra(d.cloth, d.keys, cols, rows, id, vis, d.starts);
      assert.ok(d.starts.some((s) => at(id, s) + Array.from(d.cloth).slice(0, s).join("") === text), `${label} ${id}: starts at a clause`);
      assert.equal(ranges.length, d.keys.length, `${label} ${id}: every key sentence shows`);
    }
  };
  const { cols, rows } = gridFor(GATE);
  check(cols, rows, (c) => strandRows(c, cols, rows, GATE.tieBack), "homepage");
  for (const [vw, vh] of [[1280, 800], [1920, 1080], [390, 844], [360, 640], [844, 390]]) {
    const L = opening.curtainLayout(vw, vh);
    check(L.cols, L.rows, (c) => strandRows(c, L.cols, L.rows), `new homepage ${vw}×${vh}`);
  }
  assert.match(read("js/main.js"), /placeSutra\(d\.cloth, d\.keys, COLS, ROWS, d\.id, \(c\) => strandRows\(c, COLS, ROWS, GATE\.tieBack\), d\.starts\)/);
  assert.match(read("js/opening-view.js"), /placeSutra\(sutra\.cloth, sutra\.keys, L\.cols, L\.rows, sutra\.id, \(c\) => strandRows\(c, L\.cols, L\.rows\), sutra\.starts\)/);
});

test("the welcome chimes are picked from the curtain's own strands", () => {
  const main = read("js/main.js");
  assert.doesNotMatch(main, /\[2, 9, 16\]/, "no columns that only fit the old 26-strand curtain");
  assert.match(main, /\[0\.08, 0\.36, 0\.64\]\.map\(\(f\) => Math\.round\(f \* \(COLS - 1\)\)\)/);
});

test("the glow is the same size on every screen (it grows with the drawing scale)", () => {
  const fake = (scale) => {
    const blur = [];
    const g = { getTransform: () => ({ a: scale, b: 0 }), strokeText() {}, fillText() {} };
    Object.defineProperty(g, "shadowBlur", { set: (v) => blur.push(v), get: () => blur.at(-1) });
    return { g, blur };
  };
  for (const scale of [1, 2, 2.5]) {
    for (const hot of [false, true]) {
      const { g, blur } = fake(scale);
      paintLightGlyph(g, "道", hot, 30);
      assert.equal(blur[0], (hot ? 12 : 8) * scale, `scale ${scale}, ${hot ? "key line" : "normal"}`);
      assert.equal(blur.at(-1), 0);
    }
  }
});
