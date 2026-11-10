// 虎爺（福德正神頁的彩蛋）的規格：
// 1. 小小的趴在右下角的稻穗裡，整隻在畫面內
// 2. 點牠：慢慢抬起頭（約 1.2 秒），停一下（約 2 秒），再慢慢趴回去；6 秒內回到原本的樣子
// 3. 點別的地方：不會動
// 4. 動作平順：角度每格變化很小、沒有跳；抬頭途中再點一次，不會從頭再來（不會抖）
// 5. 換到別的神明：跟稻穗一起淡掉
import { test } from "node:test";
import assert from "node:assert/strict";
import { createTiger, stepTiger, tigerBox, tigerPose } from "../js/tiger.js";

const W = 1440;
const H = 900;
const env = (over = {}) => ({ w: W, h: H, active: true, click: null, ...over });
const center = (b) => ({ x: (b.x0 + b.x1) / 2, y: (b.y0 + b.y1) / 2 });

test("it lies small in the bottom-right corner, fully on screen", () => {
  for (const [w, h] of [
    [1440, 900],
    [390, 844],
    [1920, 1080]
  ]) {
    const b = tigerBox(w, h);
    assert.ok(b.x0 > w * 0.6 && b.x1 < w, `right side, on screen (${b.x0.toFixed(0)}–${b.x1.toFixed(0)} of ${w})`);
    assert.ok(b.y0 > h * 0.7 && b.y1 <= h, `bottom, on screen (${b.y0.toFixed(0)}–${b.y1.toFixed(0)} of ${h})`);
    const bw = b.x1 - b.x0;
    assert.ok(bw >= 60 && bw <= Math.max(60, w * 0.1), `small (${bw.toFixed(0)} px wide)`);
  }
});

test("clicking it: it slowly lifts its head, holds, and lies back down", () => {
  const t = createTiger();
  const b = tigerBox(W, H);
  stepTiger(t, env());
  stepTiger(t, env({ click: center(b) }));
  const lifts = [];
  for (let i = 0; i < 60 * 6; i++) {
    stepTiger(t, env());
    lifts.push(tigerPose(t).lift);
  }
  const top = lifts.findIndex((l) => l >= 0.999);
  assert.ok(top >= 50 && top <= 90, `fully lifted after ~1.2 s (frame ${top})`);
  const held = lifts.filter((l) => l >= 0.999).length;
  assert.ok(held >= 100, `holds for about 2 s (${held} frames)`);
  assert.equal(lifts.at(-1), 0, "back to rest within 6 s");
  const p = tigerPose({ ...t, lift: 1 });
  assert.ok(p.angle < -0.03 && p.rise > 0, "lifted = head tilted up and slightly raised");
});

test("clicking elsewhere does nothing", () => {
  const t = createTiger();
  stepTiger(t, env());
  stepTiger(t, env({ click: { x: W * 0.3, y: H * 0.5 } }));
  for (let i = 0; i < 120; i++) {
    stepTiger(t, env());
    assert.equal(tigerPose(t).lift, 0);
  }
});

test("smooth: no jumps, and a second click while it is moving does not restart it", () => {
  const t = createTiger();
  const c = center(tigerBox(W, H));
  stepTiger(t, env());
  stepTiger(t, env({ click: c }));
  let last = tigerPose(t);
  for (let i = 0; i < 60 * 6; i++) {
    stepTiger(t, env({ click: i === 30 || i === 200 ? c : null }));
    const p = tigerPose(t);
    assert.ok(Math.abs(p.angle - last.angle) <= 0.0025, `frame ${i}: angle step ${Math.abs(p.angle - last.angle).toFixed(4)}`);
    assert.ok(p.lift >= last.lift - 0.05 || t.state === "down", "never drops suddenly");
    last = p;
  }
});

test("it fades with the page", () => {
  const t = createTiger();
  for (let i = 0; i < 100; i++) stepTiger(t, env());
  assert.equal(t.alpha, 1);
  let n = 0;
  while (t.alpha > 0 && n < 500) {
    stepTiger(t, env({ active: false }));
    n++;
  }
  assert.ok(n >= 45, `fades over ${n} frames`);
});
