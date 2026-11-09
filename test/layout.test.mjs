import { test } from "node:test";
import assert from "node:assert/strict";
import { fitGate, curtainGrid } from "../js/layout.js";
import { GATE } from "../js/gate.js";

// 三開間大門：整座門在桌機要完整看得到；手機看不下整座，就放大看中間那一間
const desktop = [
  [1440, 900],
  [1920, 1080],
  [1280, 720],
  [2560, 1440]
];

test("layout: on desktop the whole three-bay gate fits on screen", () => {
  for (const [vw, vh] of desktop) {
    const s = fitGate(vw, vh, GATE);
    assert.ok(GATE.w * s <= vw, `${vw}x${vh}: gate ${Math.round(GATE.w * s)}px wider than screen`);
    assert.ok(GATE.h * s <= vh, `${vw}x${vh}: gate ${Math.round(GATE.h * s)}px taller than screen`);
    assert.ok(s <= 1.3, "never blown up past 1.3x");
  }
});

test("layout: on desktop the gate is big (grand), filling most of the height", () => {
  for (const [vw, vh] of desktop) {
    const s = fitGate(vw, vh, GATE);
    const fill = Math.max((GATE.h * s) / vh, (GATE.w * s) / vw);
    assert.ok(fill > 0.85, `${vw}x${vh}: gate only fills ${(fill * 100).toFixed(0)}%`);
  }
});

test("layout: on a phone the central bay fills the width and is fully visible", () => {
  for (const [vw, vh] of [[390, 844], [360, 740], [430, 932]]) {
    const s = fitGate(vw, vh, GATE);
    const bay = (GATE.centerBay.x1 - GATE.centerBay.x0) * s;
    assert.ok(bay <= vw, `${vw}x${vh}: central bay ${Math.round(bay)}px is cut off`);
    assert.ok(bay >= vw * 0.85, `${vw}x${vh}: central bay only ${Math.round(bay)}px wide`);
    assert.ok(GATE.h * s <= vh * 0.9, `${vw}x${vh}: gate too tall for the phone`);
  }
});

test("layout: curtain beads keep the same spacing as before, whatever the door size", () => {
  // 舊的門：427 x 633 用 30 x 43 顆
  const old = { col: 427 / 30, row: 633 / 43 };
  for (const [w, h] of [[386, 498], [427, 633], [520, 700]]) {
    const { cols, rows } = curtainGrid(w, h);
    assert.ok(Math.abs(w / cols - old.col) / old.col < 0.06, `${w}x${h}: column spacing ${(w / cols).toFixed(1)}`);
    assert.ok(Math.abs(h / rows - old.row) / old.row < 0.06, `${w}x${h}: row spacing ${(h / rows).toFixed(1)}`);
  }
  assert.deepEqual(curtainGrid(427, 633), { cols: 30, rows: 43 }, "old door gives the old grid");
});
