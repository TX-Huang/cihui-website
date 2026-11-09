import { test } from "node:test";
import assert from "node:assert/strict";
import { highlightRange, isHighlighted } from "../js/highlight.js";
import { charAt } from "../js/cloth.js";
import { DEITIES, ORDER } from "../js/deities.js";
import { curtainGrid } from "../js/layout.js";
import { GATE } from "../js/gate.js";

const { cols, rows } = curtainGrid(GATE.door.x1 - GATE.door.x0, GATE.door.y1 - GATE.door.y0);

// 珠簾上變成金色的字，照閱讀順序（右邊那欄先、由上往下）讀出來
function goldText(d) {
  const range = highlightRange(d.cloth, d.key, cols, rows);
  const out = [];
  for (let c = cols - 1; c >= 0; c--) {
    for (let r = 0; r < rows; r++) {
      if (isHighlighted(c, r, cols, rows, range)) out.push(charAt(d.cloth, c, r, cols, rows));
    }
  }
  return out.join("");
}

test("highlight: each deity's key sentence comes from its own scripture", () => {
  for (const id of ORDER) {
    const d = DEITIES[id];
    assert.ok(d.key && d.key.length >= 5, `${id} has no key sentence`);
    assert.ok(d.cloth.includes(d.key), `${id}: 「${d.key}」 is not in the scripture`);
  }
});

test("highlight: the gold beads spell exactly the key sentence, once — nothing random", () => {
  for (const id of ORDER) {
    const d = DEITIES[id];
    assert.equal(goldText(d), d.key, `${id}: gold beads read 「${goldText(d)}」`);
  }
});

test("highlight: the gold sentence sits near the middle of the curtain (easy to see)", () => {
  for (const id of ORDER) {
    const d = DEITIES[id];
    const { start, end } = highlightRange(d.cloth, d.key, cols, rows);
    const mid = (start + end) / 2 / (cols * rows);
    assert.ok(mid > 0.25 && mid < 0.75, `${id}: sentence at ${(mid * 100).toFixed(0)}% of the curtain`);
  }
});
