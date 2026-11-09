import { test } from "node:test";
import assert from "node:assert/strict";
import { placeOnLine, createTail, stepTail, finQuad, tailStrip, rigidLine, padRect } from "../js/koi-parts.js";
import { createSpine, waveLine, buildStrip } from "../js/spine.js";

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
  // 圖 40 x 12，pivot 在 (5, 2)；轉 90 度（往下）、根部在 (10, 20)
  const q = finQuad({ x: 10, y: 20 }, Math.PI / 2, { pivot: [5, 2], w: 40, h: 12 }, 1);
  const corners = [0, 1, 2, 3].map((i) => [q[i * 4], q[i * 4 + 1], q[i * 4 + 2], q[i * 4 + 3]]);
  // 轉 90 度：圖的 +x 變成畫面 +y，圖的 +y 變成畫面 -x
  const expect = [
    [10 + 2, 20 - 5, 0, 0], // 左上 (-5, -2)
    [10 + 2, 20 + 35, 1, 0], // 右上 (35, -2)
    [10 - 10, 20 - 5, 0, 1], // 左下 (-5, 10)
    [10 - 10, 20 + 35, 1, 1] // 右下 (35, 10)
  ];
  corners.forEach((c, i) => c.forEach((v, j) => assert.ok(Math.abs(v - expect[i][j]) < 1e-9, `corner ${i}[${j}] = ${v}, want ${expect[i][j]}`)));
});

test("placeOnLine: s walks along the points (s = 0.25 on 41 points is point 10)", () => {
  const arc = Array.from({ length: 41 }, (_, i) => {
    const a = (i / 40) * 1.2;
    return { x: Math.cos(a) * 200, y: Math.sin(a) * 200 };
  });
  const p = placeOnLine(arc, 0.25, 0, 240);
  assert.ok(dist(p, arc[10]) < 1e-6, `landed ${dist(p, arc[10]).toFixed(3)}px off`);
  // 往頭的方向 = 從第 11 點指向第 10 點那一段
  const want = Math.atan2(arc[10].y - arc[11].y, arc[10].x - arc[11].x);
  assert.ok(Math.abs(angDiff(p.angle, want)) < 1e-9);
});

test("placeOnLine: fins stay at the same spot of the body picture while the body waves", () => {
  // 身體的圖照「第幾個點」貼（u = 1 - i/(n-1)），所以鰭也要照同樣的算法放，不然擺動時鰭會在身上滑
  const sp = createSpine(16, 100 / 15, 0, 0, 0);
  for (const phase of [0, 1.5, 3, 4.5]) {
    const opts = { halfWidth: 1, amp: 18, phase, waveK: 3.6, subdiv: 4 };
    const line = waveLine(sp, opts);
    const v = buildStrip(sp, { ...opts, line });
    const n = v.length / 8;
    for (const s of [0.3, 0.6, 0.8]) {
      const f = s * (n - 1);
      const i = Math.floor(f);
      const t = f - i;
      const mid = (k) => ({ x: (v[k * 8] + v[k * 8 + 4]) / 2, y: (v[k * 8 + 1] + v[k * 8 + 5]) / 2 });
      const a = mid(i);
      const b = mid(Math.min(n - 1, i + 1));
      const m = { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
      const p = placeOnLine(line, s, 0, 100);
      assert.ok(dist(p, m) < 0.05, `s=${s} phase=${phase}: fin ${dist(p, m).toFixed(2)}px off its spot`);
    }
  }
});

test("rigidLine: the 2D fallback body is a straight line, so fins attach to the body actually drawn", () => {
  const line = rigidLine({ x: 50, y: 10 }, Math.PI / 6, 120, 9);
  assert.equal(line.length, 9);
  assert.ok(dist(line[0], { x: 50, y: 10 }) < 1e-9, "starts at the head");
  for (let i = 1; i < 9; i++) {
    assert.ok(Math.abs(dist(line[i], line[i - 1]) - 15) < 1e-9);
    const a = Math.atan2(line[i - 1].y - line[i].y, line[i - 1].x - line[i].x);
    assert.ok(Math.abs(angDiff(a, Math.PI / 6)) < 1e-9, "every segment points at the heading");
  }
});

test("padRect: shadow uses a bigger area (the blur spills past the part), pivot shifted to match", () => {
  const r = padRect({ rect: [100, 50, 40, 12], pivot: [5, 2] }, 14);
  assert.deepEqual(r.rect, [86, 36, 68, 40]);
  assert.deepEqual(r.pivot, [19, 16]);
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
