// 比較用的「油畫版」首頁：網址加 ?look=oil（月白油畫）或 ?look=oil-red（朱紅油畫），
// 大門、背景、開場的雲換成油畫風（AI Video 做的圖，放 assets/oil/）
// 不加網址就是現在的月白版，什麼都不變。
// - <html data-look="oil|oil-red">：開頭的小程式看網址決定（要在畫面出來之前，不然會先閃一下月白版）
// - 大門的圖和位置資料（門洞、匾額、青鳥停的點）每一版各一份
// - 背景：CSS 換圖；湖面（WebGL）讀同一張圖
// - 開場：三張圖換成油畫版
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { GATE, gateFor, lookAssets, LOOK } from "../js/gate.js";

const html = readFileSync("index.html", "utf8");
const css = readFileSync("style.css", "utf8");

test("without ?look=oil nothing changes: moon-white gate, background and intro", () => {
  assert.equal(LOOK, "moon");
  assert.equal(GATE.src, "assets/gate-grand.webp");
  assert.deepEqual(gateFor("moon"), GATE);
  assert.deepEqual(gateFor("nonsense"), GATE);
  const a = lookAssets("moon");
  assert.equal(a.bg, "assets/bg-yaochi.webp");
  assert.equal(a.earth, "assets/intro-earth.webp");
  assert.equal(a.clouds, "assets/intro-clouds.webp");
  assert.equal(a.clouds2, "assets/intro-clouds-2.webp");
});

test("the oil look has its own gate image and its own door, plaque and perch positions", () => {
  const g = gateFor("oil");
  assert.equal(g.src, "assets/oil/gate.webp");
  for (const k of ["w", "h", "door", "plaque", "centerBay", "perches"]) assert.ok(g[k] !== undefined, k);
  assert.notEqual(g, GATE, "a separate object, not the moon one");
  const a = lookAssets("oil");
  for (const k of ["bg", "earth", "clouds", "clouds2"]) assert.match(a[k], /^assets\/oil\//, k);
});

test("the red oil look: its own gate and background, same positions and intro as the white oil look", () => {
  const r = gateFor("oil-red");
  assert.equal(r.src, "assets/oil/gate-red.webp");
  assert.deepEqual(r.door, gateFor("oil").door, "same mask, same doorway");
  assert.deepEqual(r.perches, gateFor("oil").perches);
  assert.equal(lookAssets("oil-red").bg, "assets/oil/bg-red.webp");
  assert.equal(lookAssets("oil-red").earth, lookAssets("oil").earth);
  assert.match(css, /\[data-look="oil-red"\][^{]*\.sky-img\s*\{[^}]*assets\/oil\/bg-red\.webp/);
});

test("the page picks the look from the address before anything is shown", () => {
  const head = html.slice(0, html.indexOf("</head>"));
  assert.match(head, /look/);
  assert.match(head, /oil-red/);
  // 大門和開場的圖：油畫版在載入前就換掉
  const swap = html.slice(html.indexOf('class="intro-earth"'));
  assert.match(swap, /dataset\.look/);
  assert.match(swap, /gate-red\.webp/);
});

test("the oil look swaps the background in CSS", () => {
  assert.match(css, /\[data-look="oil"\][^{]*\.sky-img\s*\{[^}]*assets\/oil\/bg\.webp/);
});

test("the lake reads the same background as the page", () => {
  const lake = readFileSync("js/lake-view.js", "utf8");
  assert.doesNotMatch(lake, /im\.src = "assets\/bg-yaochi\.webp"/);
  assert.match(lake, /lookAssets\(LOOK\)\.bg/);
});
