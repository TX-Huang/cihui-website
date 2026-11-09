import { test } from "node:test";
import assert from "node:assert/strict";
import { highlightRanges, isHighlighted } from "../js/highlight.js";
import { charAt } from "../js/cloth.js";
import { DEITIES, ORDER } from "../js/deities.js";
import { curtainGrid } from "../js/layout.js";
import { GATE } from "../js/gate.js";

const { cols, rows } = curtainGrid(GATE.door.x1 - GATE.door.x0, GATE.door.y1 - GATE.door.y0);
const total = cols * rows;
const rangesOf = (id) => highlightRanges(DEITIES[id].cloth, DEITIES[id].keys, cols, rows, id);

// 金色的字照閱讀順序（右邊那欄先、由上往下）分成一段一段
function goldRuns(id) {
  const d = DEITIES[id];
  const ranges = rangesOf(id);
  const runs = [];
  let cur = "";
  for (let c = cols - 1; c >= 0; c--) {
    for (let r = 0; r < rows; r++) {
      if (isHighlighted(c, r, cols, rows, ranges)) cur += charAt(d.cloth, c, r, cols, rows);
      else if (cur) {
        runs.push(cur);
        cur = "";
      }
    }
  }
  if (cur) runs.push(cur);
  return runs;
}

test("highlight: each deity has several key sentences, all from its own scripture", () => {
  for (const id of ORDER) {
    const d = DEITIES[id];
    assert.ok(Array.isArray(d.keys) && d.keys.length >= 3, `${id} needs at least 3 key sentences`);
    for (const k of d.keys) assert.ok(d.cloth.includes(k), `${id}: 「${k}」 is not in the scripture`);
  }
});

test("highlight: every gold run is one whole key sentence — nothing random, nothing cut off", () => {
  for (const id of ORDER) {
    const runs = goldRuns(id);
    assert.deepEqual([...runs].sort(), [...DEITIES[id].keys].sort(), `${id}: gold reads ${JSON.stringify(runs)}`);
  }
});

test("highlight: the sentences are scattered, not lined up in the middle", () => {
  for (const id of ORDER) {
    const mids = rangesOf(id).map((r) => (r.start + r.end) / 2 / total);
    const spread = Math.max(...mids) - Math.min(...mids);
    assert.ok(spread > 0.35, `${id}: all sentences bunched together (${spread.toFixed(2)})`);
    // 不是剛好在正中間
    for (const m of mids) assert.ok(Math.abs(m - 0.5) > 0.03, `${id}: a sentence sits dead centre`);
    // 彼此不要黏在一起（至少隔一整欄）
    const sorted = rangesOf(id).sort((a, b) => a.start - b.start);
    for (let i = 1; i < sorted.length; i++) assert.ok(sorted[i].start - sorted[i - 1].end >= rows, `${id}: two sentences touch`);
  }
});

test("highlight: the same deity always gets the same layout (it does not jump around on reload)", () => {
  for (const id of ORDER) assert.deepEqual(rangesOf(id), rangesOf(id));
  // 不同神尊的排法不一樣（不是同一個模子）
  const pattern = (id) => rangesOf(id).map((r) => Math.round((r.start / total) * 10)).join(",");
  assert.ok(new Set(ORDER.map(pattern)).size > 1);
});

test("highlight: a sentence never breaks across two columns (it reads as one straight line)", () => {
  for (const id of ORDER) {
    for (const r of rangesOf(id)) {
      assert.equal(Math.floor(r.start / rows), Math.floor((r.end - 1) / rows), `${id}: sentence at ${r.start} wraps to the next column`);
    }
  }
});

test("highlight: each deity marks its sentences in its own page colour", () => {
  const marks = ORDER.map((id) => DEITIES[id].theme.mark);
  for (const m of marks) assert.match(m, /^#[0-9a-f]{6}$/i);
  assert.equal(new Set(marks).size, ORDER.length, "every deity has a different colour");
  for (const id of ORDER) assert.notEqual(DEITIES[id].theme.mark, DEITIES[id].theme.ink, `${id}: mark looks like normal ink`);
});
