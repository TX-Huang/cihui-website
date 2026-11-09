import { test } from "node:test";
import assert from "node:assert/strict";
import { introFrame, shouldPlayIntro, INTRO_MS, SKIP_TO } from "../js/intro.js";

// 開場：夜裡的凡間 → 鏡頭往上升、穿過雲海 → 雲散開，看到瑤池和大門
const at = (t) => introFrame(t);

test("intro: it starts in the human world at night, the site still hidden", () => {
  const f = at(0);
  assert.equal(f.earth.opacity, 1);
  assert.equal(f.night.opacity, 1, "night backdrop hides the site");
  assert.equal(f.front.opacity, 0, "no clouds in front yet");
  assert.equal(f.done, false);
});

test("intro: the camera rises — the world below keeps sliding down", () => {
  let prev = -Infinity;
  for (let t = 0; t <= INTRO_MS; t += 50) {
    const y = at(t).earth.y;
    assert.ok(y >= prev - 1e-9, `earth moved back up at ${t}ms`);
    prev = y;
  }
  assert.ok(at(INTRO_MS * 0.5).earth.y > 30, "by halfway the world is well below");
});

test("intro: in the middle we pass through the clouds (screen covered)", () => {
  let covered = false;
  for (let t = 0; t <= INTRO_MS; t += 25) {
    const f = at(t);
    if (f.front.opacity >= 0.95 && f.veil.opacity >= 0.6) covered = true;
  }
  assert.ok(covered, "there must be a moment fully inside the clouds");
});

test("intro: clouds in front come closer (keep growing) while we fly through", () => {
  let prev = 0;
  for (let t = 0; t <= INTRO_MS; t += 50) {
    const s = at(t).front.scale;
    assert.ok(s >= prev - 1e-9, `front clouds shrank at ${t}ms`);
    prev = s;
  }
});

test("intro: the site is never shown before we are inside the clouds", () => {
  for (let t = 0; t <= INTRO_MS; t += 25) {
    const f = at(t);
    const cover = Math.max(f.night.opacity, f.front.opacity * 0.9, f.veil.opacity);
    if (t < INTRO_MS * 0.55) assert.ok(cover > 0.9, `site peeks through at ${t}ms`);
  }
});

test("intro: at the end everything is gone and the site sits at its normal size", () => {
  const f = at(INTRO_MS);
  assert.equal(f.done, true);
  for (const k of ["earth", "back", "front", "veil", "night"]) assert.equal(f[k].opacity, 0, `${k} still visible`);
  assert.equal(f.site.scale, 1);
  assert.equal(f.site.opacity, 1);
  assert.deepEqual(at(INTRO_MS + 5000), f, "stays finished");
});

test("intro: skipping jumps past the cloud whiteout and still ends cleanly", () => {
  assert.ok(SKIP_TO > INTRO_MS * 0.55 && SKIP_TO < INTRO_MS);
  const f = at(SKIP_TO);
  assert.ok(f.night.opacity < 0.05, "night is already gone");
});

test("intro: who sees it", () => {
  const base = { seen: false, reduceMotion: false, hash: "" };
  assert.equal(shouldPlayIntro(base), true, "first visit");
  assert.equal(shouldPlayIntro({ ...base, hash: "#jinmu" }), true, "home link");
  assert.equal(shouldPlayIntro({ ...base, seen: true }), false, "already seen this visit");
  assert.equal(shouldPlayIntro({ ...base, reduceMotion: true }), false, "reduced motion");
  assert.equal(shouldPlayIntro({ ...base, hash: "#tudi" }), false, "deep link to another deity");
});
