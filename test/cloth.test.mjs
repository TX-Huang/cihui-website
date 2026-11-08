import { test } from "node:test";
import assert from "node:assert/strict";
import { createCloth, step, push, charAt } from "../js/cloth.js";

const OPTS = { cols: 10, rows: 12, width: 200, height: 240 };
const SIM = { gravity: 0.2, damping: 0.99, iterations: 5 };

test("top row is pinned and never moves", () => {
  const cloth = createCloth(OPTS);
  const top = cloth.particles.filter((p) => p.row === 0).map((p) => [p.x, p.y]);
  for (let i = 0; i < 120; i++) step(cloth, SIM);
  const after = cloth.particles.filter((p) => p.row === 0).map((p) => [p.x, p.y]);
  assert.deepEqual(after, top);
});

test("free particles sag under gravity", () => {
  const cloth = createCloth(OPTS);
  const p = cloth.particles.find((q) => q.row === OPTS.rows - 1);
  const y0 = p.y;
  for (let i = 0; i < 60; i++) step(cloth, SIM);
  assert.ok(p.y > y0, `expected y > ${y0}, got ${p.y}`);
});

test("vertical links do not stretch far past their max", () => {
  const cloth = createCloth(OPTS);
  for (let i = 0; i < 200; i++) step(cloth, SIM);
  for (const l of cloth.links.filter((k) => k.vertical)) {
    const d = Math.hypot(l.b.x - l.a.x, l.b.y - l.a.y);
    assert.ok(d <= l.max * 1.1, `link too long: ${d} > ${l.max}`);
  }
});

test("push moves near particles away and leaves far ones alone", () => {
  const cloth = createCloth(OPTS);
  const near = cloth.particles.find((p) => p.row === 6 && p.col === 5);
  const far = cloth.particles.find((p) => p.row === 11 && p.col === 0);
  const px = near.x - 5;
  const py = near.y;
  const nearX0 = near.x;
  const farX0 = far.x;
  push(cloth, px, py, 30 * 30, 4);
  step(cloth, { ...SIM, gravity: 0 });
  assert.ok(near.x > nearX0, "near particle should move right, away from the push");
  assert.ok(Math.abs(far.x - farX0) < 1e-9, "far particle should not move");
});

test("charAt writes vertically, right column first, and wraps text", () => {
  // 3 cols x 2 rows; right column reads first, top to bottom
  assert.equal(charAt("一二三四五六", 2, 0, 3, 2), "一");
  assert.equal(charAt("一二三四五六", 2, 1, 3, 2), "二");
  assert.equal(charAt("一二三四五六", 1, 0, 3, 2), "三");
  assert.equal(charAt("一二三四五六", 0, 1, 3, 2), "六");
  assert.equal(charAt("一二", 0, 1, 3, 2), "二"); // wraps
});
