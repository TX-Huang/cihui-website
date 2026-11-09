import { test } from "node:test";
import assert from "node:assert/strict";
import { createSpine, followHead, buildStrip } from "../js/spine.js";

const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
// 相鄰兩段的夾角（弧度，0 = 直線）
function bendAt(pts, i) {
  const a1 = Math.atan2(pts[i - 1].y - pts[i - 2].y, pts[i - 1].x - pts[i - 2].x);
  const a2 = Math.atan2(pts[i].y - pts[i - 1].y, pts[i].x - pts[i - 1].x);
  return Math.abs(Math.atan2(Math.sin(a2 - a1), Math.cos(a2 - a1)));
}

test("createSpine: head at (x,y), body trails straight behind the heading", () => {
  const s = createSpine(10, 5, 100, 50, 0); // 頭朝右
  assert.equal(s.pts.length, 10);
  assert.deepEqual([s.pts[0].x, s.pts[0].y], [100, 50]);
  for (let i = 1; i < 10; i++) {
    assert.ok(Math.abs(dist(s.pts[i], s.pts[i - 1]) - 5) < 1e-9);
    assert.ok(s.pts[i].x < s.pts[i - 1].x, "body should be to the left (behind) of the head");
  }
});

test("followHead: segment lengths stay constant while the head swims a curve", () => {
  const s = createSpine(16, 6, 0, 0, 0);
  for (let k = 1; k <= 200; k++) {
    const a = k * 0.05;
    followHead(s, Math.cos(a) * 80 + k * 0.5, Math.sin(a) * 80, 0.3);
  }
  for (let i = 1; i < 16; i++) {
    assert.ok(Math.abs(dist(s.pts[i], s.pts[i - 1]) - 6) < 1e-6, `segment ${i} length drifted`);
  }
});

test("followHead: a sudden U-turn never bends any joint past maxBend", () => {
  const s = createSpine(12, 6, 0, 0, 0);
  const maxBend = 0.25;
  // 頭往右游一段，再突然往回
  for (let k = 1; k <= 20; k++) followHead(s, k * 3, 0, maxBend);
  for (let k = 1; k <= 20; k++) followHead(s, 60 - k * 3, 2, maxBend);
  for (let i = 2; i < 12; i++) {
    assert.ok(bendAt(s.pts, i) <= maxBend + 1e-6, `joint ${i} bent ${bendAt(s.pts, i)}`);
  }
});

test("followHead: turning makes the body curve (not a rigid stick)", () => {
  const s = createSpine(12, 6, 0, 0, 0);
  for (let k = 1; k <= 30; k++) {
    const a = k * 0.06; // 一直往左轉
    followHead(s, s.pts[0].x + Math.cos(a) * 3, s.pts[0].y + Math.sin(a) * 3, 0.3);
  }
  let total = 0;
  for (let i = 2; i < 12; i++) total += bendAt(s.pts, i);
  assert.ok(total > 0.3, `expected a curved body, total bend ${total}`);
});

test("buildStrip: straight spine, no wave -> ribbon of width 2*halfWidth, head u=1, tail u=0", () => {
  const s = createSpine(5, 10, 100, 100, 0);
  const v = buildStrip(s, { halfWidth: 8, amp: 0, phase: 0, waveK: 3 });
  assert.equal(v.length, 5 * 2 * 4);
  // 每個點兩個頂點：[x, y, u, v]
  const head = [v.slice(0, 4), v.slice(4, 8)];
  assert.ok(Math.abs(head[0][1] - head[1][1]) - 16 < 1e-9 && Math.abs(Math.abs(head[0][1] - head[1][1]) - 16) < 1e-9);
  assert.equal(head[0][2], 1);
  assert.equal(v[(4 * 2) * 4 + 2], 0); // 尾巴 u = 0
  assert.deepEqual([head[0][3], head[1][3]].sort(), [0, 1]);
});

test("buildStrip: the swimming wave moves the tail much more than the head", () => {
  const s = createSpine(16, 6, 0, 0, 0);
  const flat = buildStrip(s, { halfWidth: 8, amp: 0, phase: 0, waveK: 3.4 });
  let headMax = 0;
  let tailMax = 0;
  for (let ph = 0; ph < Math.PI * 2; ph += 0.3) {
    const w = buildStrip(s, { halfWidth: 8, amp: 10, phase: ph, waveK: 3.4 });
    const mid = (arr, i) => (arr[i * 8 + 1] + arr[i * 8 + 5]) / 2; // 第 i 點中線的 y
    headMax = Math.max(headMax, Math.abs(mid(w, 0) - mid(flat, 0)));
    tailMax = Math.max(tailMax, Math.abs(mid(w, 15) - mid(flat, 15)));
  }
  assert.ok(headMax < 0.5, `head moved ${headMax}`);
  assert.ok(tailMax > 7, `tail moved only ${tailMax}`);
});

// 魚身的輪廓要是平滑的曲線，不能看得出一節一節的折角
// （脊椎只有 16 點，每節最多彎 0.22 弧度；直接連起來，折角就看得到）
function curvedFish(dir = 1) {
  const L = 160;
  const n = 16;
  const s = createSpine(n, (L * 1.16) / (n - 1), 0, 0, 0);
  for (let k = 1; k <= 120; k++) {
    const a = dir * k * 0.12;
    followHead(s, s.pts[0].x + Math.cos(a) * 3, s.pts[0].y + Math.sin(a) * 3, 0.22);
  }
  return { s, L };
}
// 帶子某一邊（side 0 / 1）的輪廓上，最大的「折角」有幾像素：
// 折角角度 × 旁邊較短那段的長度 ≈ 折角凸出來多少。小於 1 像素就看不出來。
function maxCornerPx(v, side) {
  const p = [];
  for (let i = 0; i < v.length / 8; i++) p.push([v[i * 8 + side * 4], v[i * 8 + side * 4 + 1]]);
  let worst = 0;
  for (let i = 2; i < p.length; i++) {
    const ax = p[i - 1][0] - p[i - 2][0];
    const ay = p[i - 1][1] - p[i - 2][1];
    const bx = p[i][0] - p[i - 1][0];
    const by = p[i][1] - p[i - 1][1];
    const ang = Math.abs(Math.atan2(ax * by - ay * bx, ax * bx + ay * by));
    worst = Math.max(worst, ang * Math.min(Math.hypot(ax, ay), Math.hypot(bx, by)));
  }
  return worst;
}

test("buildStrip: with subdivision the outline is a smooth curve (no visible joints)", () => {
  for (const dir of [1, -1]) {
    const { s, L } = curvedFish(dir);
    for (let ph = 0; ph < Math.PI * 2; ph += 0.4) {
      const v = buildStrip(s, { halfWidth: L * 0.3, amp: L * 0.13, phase: ph, waveK: 3.6, subdiv: 4 });
      assert.equal(v.length, (15 * 4 + 1) * 8, "16 spine points x 4 subdivisions -> 61 pairs");
      for (const side of [0, 1]) {
        const c = maxCornerPx(v, side);
        assert.ok(c < 1.2, `side ${side} has a ${c.toFixed(2)}px corner at phase ${ph.toFixed(1)} (dir ${dir})`);
      }
    }
  }
});

test("buildStrip: subdivision keeps the head and tail ends in place", () => {
  const { s } = curvedFish();
  const opts = { halfWidth: 2, amp: 0, phase: 0, waveK: 3.6 }; // 很窄：不會被急彎收窄，只比中線
  const a = buildStrip(s, opts);
  const b = buildStrip(s, { ...opts, subdiv: 4 });
  for (const [ia, ib] of [[0, 0], [15, 60]]) {
    const ma = [(a[ia * 8] + a[ia * 8 + 4]) / 2, (a[ia * 8 + 1] + a[ia * 8 + 5]) / 2];
    const mb = [(b[ib * 8] + b[ib * 8 + 4]) / 2, (b[ib * 8 + 1] + b[ib * 8 + 5]) / 2];
    assert.ok(Math.hypot(ma[0] - mb[0], ma[1] - mb[1]) < 1e-3);
    assert.equal(a[ia * 8 + 2], b[ib * 8 + 2], "u (head=1, tail=0) unchanged");
  }
});

// 實際魚的比例：脊椎 16 點、總長約 1.16L、半寬約 0.3L（含魚鰭與留邊）
test("buildStrip: a fish at maximum bend plus swimming wave never folds over itself", () => {
  const L = 160;
  const n = 16;
  const total = L * 1.16;
  const halfWidth = L * 0.3;
  for (const dir of [1, -1]) {
  const s = createSpine(n, total / (n - 1), 0, 0, 0);
  // 一直急轉彎（左轉、右轉各一次），讓每一節都彎到最大
  for (let k = 1; k <= 120; k++) {
    const a = dir * k * 0.12;
    followHead(s, s.pts[0].x + Math.cos(a) * 3, s.pts[0].y + Math.sin(a) * 3, 0.22);
  }
  for (const subdiv of [1, 4])
  for (let ph = 0; ph < Math.PI * 2; ph += 0.2) {
    const v = buildStrip(s, { halfWidth, amp: L * 0.13, phase: ph, waveK: 3.6, subdiv });
    // 每一格四邊形（第 i、i+1 點的左右頂點）都要同一個方向，不能有翻面的
    let sign = 0;
    for (let i = 0; i < v.length / 8 - 1; i++) {
      const a = [v[i * 8], v[i * 8 + 1]];
      const b = [v[i * 8 + 4], v[i * 8 + 5]];
      const c = [v[(i + 1) * 8 + 4], v[(i + 1) * 8 + 5]];
      const d = [v[(i + 1) * 8], v[(i + 1) * 8 + 1]];
      // 兩個三角形的方向
      for (const [p, q, r] of [[a, b, c], [a, c, d]]) {
        const cross = (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]);
        if (Math.abs(cross) < 1e-6) continue;
        const sg = Math.sign(cross);
        if (sign === 0) sign = sg;
        assert.equal(sg, sign, `quad ${i} folded at phase ${ph.toFixed(1)} (dir ${dir})`);
      }
    }
  }
  }
});
