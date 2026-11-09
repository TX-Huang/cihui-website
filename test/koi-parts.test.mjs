import { test } from "node:test";
import assert from "node:assert/strict";
import { placeOnLine, createTail, stepTail, finQuad, tailStrip } from "../js/koi-parts.js";

const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const angDiff = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));

// 一條往右的直線中線（頭在右邊 x=100，身體往左到 x=0）
const straight = Array.from({ length: 21 }, (_, i) => ({ x: 100 - i * 5, y: 0 }));

test("placeOnLine: a point part-way along the body, pushed sideways", () => {
  const p = placeOnLine(straight, 0.5, 0.1, 100);
  assert.ok(Math.abs(p.x - 50) < 1e-6);
  assert.ok(Math.abs(p.y - 10) < 1e-6, "d > 0 means the image's lower side (+y when heading right)");
  assert.ok(Math.abs(p.angle) < 1e-9, "heading right");
});

test("placeOnLine: on a bent body the fin stays attached at the same distance", () => {
  const arc = Array.from({ length: 41 }, (_, i) => {
    const a = (i / 40) * 1.2; // 彎成一段圓弧
    return { x: Math.cos(a) * 200, y: Math.sin(a) * 200 };
  });
  for (const s of [0.1, 0.3, 0.6, 0.9]) {
    const on = placeOnLine(arc, s, 0, 240);
    const off = placeOnLine(arc, s, 0.08, 240);
    assert.ok(Math.abs(dist(on, off) - 0.08 * 240) < 1e-6, `fin drifted at s=${s}`);
    assert.ok(Math.abs(angDiff(on.angle, off.angle)) < 1e-9);
  }
});

test("finQuad: a rigid fin rotates around its root, size unchanged", () => {
  const q = finQuad({ x: 10, y: 20 }, Math.PI / 2, { pivot: [5, 2], w: 40, h: 12 }, 1);
  // 4 個角：[x, y, u, v] × 4
  const c = (i) => ({ x: q[i * 4], y: q[i * 4 + 1] });
  assert.ok(Math.abs(dist(c(0), c(1)) - 40) < 1e-9 || Math.abs(dist(c(0), c(2)) - 40) < 1e-9);
  // 圖上 pivot 那一點要剛好落在根部 (10, 20)
  const u = 5 / 40;
  const v = 2 / 12;
  // 雙線性內插四個角
  const P = (a, b, t) => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
  const top = P(c(0), c(1), u);
  const bottom = P(c(2), c(3), u);
  const at = P(top, bottom, v);
  assert.ok(Math.abs(at.x - 10) < 1e-9 && Math.abs(at.y - 20) < 1e-9, `pivot landed at ${at.x},${at.y}`);
});

function swim(tail, steps, angleAt) {
  for (let k = 0; k < steps; k++) {
    const a = angleAt(k);
    stepTail(tail, { x: k * 2 * Math.cos(a), y: k * 2 * Math.sin(a), angle: a });
  }
}

test("tail: stays attached and keeps its length", () => {
  const tail = createTail(8, 10, { x: 0, y: 0, angle: 0 });
  swim(tail, 200, (k) => Math.sin(k * 0.05) * 0.6);
  const base = tail.pts[0];
  const last = { x: 199 * 2 * Math.cos(Math.sin(199 * 0.05) * 0.6), y: 199 * 2 * Math.sin(Math.sin(199 * 0.05) * 0.6) };
  assert.ok(dist(base, last) < 1e-6, "root follows the body");
  for (let i = 1; i < 8; i++) assert.ok(Math.abs(dist(tail.pts[i], tail.pts[i - 1]) - 10) < 1e-6);
});

test("tail: lags behind like silk — a sudden turn reaches the tip only later", () => {
  const tail = createTail(8, 10, { x: 0, y: 0, angle: 0 });
  swim(tail, 60, () => 0); // 先直直游，尾巴拉直
  const tipAngle = () => {
    const p = tail.pts;
    return Math.atan2(p[p.length - 2].y - p[p.length - 1].y, p[p.length - 2].x - p[p.length - 1].x);
  };
  // 身體突然轉 0.6 弧度，之後維持
  let x = 118;
  let y = 0;
  const turned = [];
  for (let k = 0; k < 90; k++) {
    x += 2 * Math.cos(0.6);
    y += 2 * Math.sin(0.6);
    stepTail(tail, { x, y, angle: 0.6 });
    turned.push(tipAngle());
  }
  assert.ok(turned[2] < 0.6 * 0.5, `tip already turned ${turned[2].toFixed(2)} after 3 frames`);
  assert.ok(Math.abs(turned[89] - 0.6) < 0.08, `tip never caught up: ${turned[89].toFixed(2)}`);
});

test("tail: never folds — each joint bends at most maxBend", () => {
  const tail = createTail(8, 10, { x: 0, y: 0, angle: 0 }, { maxBend: 0.15 });
  swim(tail, 300, (k) => (k % 40 < 20 ? 1 : -1) * 1.2); // 一直急轉
  const p = tail.pts;
  for (let i = 2; i < p.length; i++) {
    const a1 = Math.atan2(p[i - 1].y - p[i - 2].y, p[i - 1].x - p[i - 2].x);
    const a2 = Math.atan2(p[i].y - p[i - 1].y, p[i].x - p[i - 1].x);
    assert.ok(Math.abs(angDiff(a2, a1)) <= 0.15 + 1e-6, `joint ${i} bent ${angDiff(a2, a1).toFixed(3)}`);
  }
});

test("tailStrip: ribbon along the tail, root u=1 tip u=0, up/down widths kept", () => {
  const tail = createTail(5, 10, { x: 0, y: 0, angle: 0 });
  const v = tailStrip(tail, 6, 4);
  assert.equal(v.length, 5 * 2 * 4);
  assert.equal(v[2], 1, "root u = 1");
  assert.equal(v[(4 * 2) * 4 + 2], 0, "tip u = 0");
  // 直直往右：up 是 -y 那一邊（v = 0）、down 是 +y（v = 1）
  assert.ok(Math.abs(v[1] - -6) < 1e-9 && v[3] === 0);
  assert.ok(Math.abs(v[5] - 4) < 1e-9 && v[7] === 1);
});
