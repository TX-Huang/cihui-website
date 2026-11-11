// 蟠桃樹 → QR：「花瓣飄落、墨點暈開」
// 1. 樹一直在（不變淡），點了先輕輕搖一下（像一陣風），0.6 秒內停下來
// 2. 每格一片桃花瓣：從樹冠被吹起，翻轉、左右飄，落到自己的格子上
// 3. 落下之後才像墨滴一樣暈開成深色方格，花瓣同時淡掉；最後每格都是完整的方格
// 每格移動不跳（≤ 25 像素）、整段 2.5 秒、t=1 時 QR 完整
import { test } from "node:test";
import assert from "node:assert/strict";
import { treeRect, qrBox, assignParticles, petalPose, treeSway, DURATION } from "../js/peach.js";
import { LINE_QR } from "../js/line-qr.js";

const ASPECT = 694 / 1000;
const VW = 1440;
const VH = 900;
const tree = treeRect(VW, VH, ASPECT);
const box = qrBox(LINE_QR.length, tree, VW, VH);
function seeded(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}
const random = seeded(9);
const pts = Array.from({ length: 900 }, () => ({ x: 0.2 + random() * 0.6, y: 0.05 + random() * 0.5, color: [240, 200, 205] }));
const parts = assignParticles(LINE_QR, pts, random);
const frames = (fn) => Array.from({ length: DURATION + 1 }, (_, f) => fn(f / DURATION));

test("petals: the tree only sways a little at the start, then is still", () => {
  const sw = frames((t) => treeSway(t));
  assert.equal(sw[0], 0);
  assert.ok(Math.max(...sw.map(Math.abs)) > 0.005 && Math.max(...sw.map(Math.abs)) <= 0.03, "a gentle sway");
  assert.ok(sw.slice(Math.ceil(DURATION * 0.24)).every((a) => Math.abs(a) < 1e-9), "still after 0.6 s");
  for (let i = 1; i < sw.length; i++) assert.ok(Math.abs(sw[i] - sw[i - 1]) <= 0.004, "no jerk");
});

test("petals: each petal leaves the crown, tumbles and drifts, lands on its module, then soaks in like ink", () => {
  for (const p of parts.slice(0, 60)) {
    const seq = frames((t) => petalPose(p, t, tree, box));
    const start = { x: tree.x + p.sx * tree.w, y: tree.y + p.sy * tree.h };
    const cell = { x: box.x0 + (p.col + 0.5) * box.m, y: box.y0 + (p.row + 0.5) * box.m };
    assert.equal(seq[0].alpha, 0, "hidden in the tree at first");
    assert.ok(Math.hypot(seq[0].x - start.x, seq[0].y - start.y) < 1e-6, "starts on the crown");
    const end = seq.at(-1);
    assert.ok(Math.hypot(end.x - cell.x, end.y - cell.y) < 1e-6, "lands on its module");
    assert.equal(end.ink, 1, "fully inked");
    assert.equal(end.alpha, 0, "the petal itself has soaked in");
    let swayed = 0;
    let turned = 0;
    for (let i = 1; i < seq.length; i++) {
      const a = seq[i - 1];
      const b = seq[i];
      assert.ok(Math.hypot(b.x - a.x, b.y - a.y) <= 25, "never jumps");
      assert.ok(b.ink >= a.ink, "ink only spreads");
      if (b.ink > 0) assert.ok(Math.hypot(b.x - cell.x, b.y - cell.y) < 1e-6, "ink starts only after landing");
      turned = Math.max(turned, Math.abs(b.angle - seq[0].angle));
      swayed = Math.max(swayed, b.drift);
    }
    assert.ok(turned >= Math.PI, "tumbles on the way");
    assert.ok(swayed >= 6, `drifts side to side (${swayed.toFixed(1)} px)`);
  }
});

// 4. 卡片放在樹的左邊（樹大部分看得到，才看得出花瓣從樹上飄過去），
//    但不蓋到珠簾門洞；手機還是放在畫面中間
test("on desktops the card sits beside the tree (most of the tree stays visible), clear of the doorway", async () => {
  const { fitGate } = await import("../js/layout.js");
  const { GATE } = await import("../js/gate.js");
  for (const [vw, vh] of [[1280, 720], [1440, 900], [1920, 1080], [2560, 1440]]) {
    const tr = treeRect(vw, vh, ASPECT);
    const b = qrBox(LINE_QR.length, tr, vw, vh);
    const s = fitGate(vw, vh, GATE);
    const doorRight = vw / 2 + (GATE.door.x1 - GATE.w / 2) * s;
    assert.ok(b.card.x >= doorRight + 12 - 1e-9, `${vw}x${vh}: clear of the doorway`);
    const covered = Math.max(0, b.card.x + b.card.w - tr.x);
    assert.ok(covered <= tr.w * 0.6, `${vw}x${vh}: covers ${Math.round((covered / tr.w) * 100)}% of the tree's width`);
    assert.ok(b.card.y >= 64 && b.card.y + b.card.h <= vh, `${vw}x${vh}: on screen, below the menu`);
  }
  const phone = qrBox(LINE_QR.length, treeRect(390, 844, ASPECT), 390, 844);
  assert.ok(Math.abs(phone.card.x + phone.card.w / 2 - 195) <= 1, "phones: centred (to the whole pixel)");
});
