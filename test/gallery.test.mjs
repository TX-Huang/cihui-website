// 相簿（gallery.html）：用古代畫卷的方式呈現
// 1. 電腦：一卷橫向的手卷。跟古畫一樣從右往左看——第一本相簿在最右邊，往左捲動看下去
//    每本相簿開頭有一欄直排的題字（相簿名稱、日期），後面是照片；照片同樣高、保留原本的長寬比
//    相簿內照片間距小，相簿跟相簿之間空大一點（像畫卷上的段落）
// 2. 手機：改成直立的掛軸，從上往下看，照片寬度跟紙一樣寬
// 3. 點照片放大看：左右切換、到頭會繞回來；Esc 或點外面關掉
// 4. 打開頁面時畫卷慢慢展開（約 1.6 秒）；要求減少動畫就直接攤開
// 5. 還沒有照片：畫卷上放一個「待填」框
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { scrollLayout, stepIndex, wheelPixels } from "../js/scroll.js";
import { ALBUMS } from "../js/gallery.js";

const read = (f) => readFileSync(new URL(`../${f}`, import.meta.url), "utf8");
const photo = (w, h) => ({ src: "x.webp", thumb: "x-t.webp", w, h, alt: "" });
const albums = [
  { title: "瑤池金母聖誕", date: "農曆七月十八", photos: [photo(1600, 1067), photo(1067, 1600), photo(1600, 900)] },
  { title: "道場一景", date: "", photos: [photo(1200, 1200), photo(1600, 1067)] }
];
const overlap = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

test("hand scroll (desktop): read right to left, the first album at the right end; titles first; photos share a height", () => {
  const H = 360;
  const L = scrollLayout(albums, { mode: "hand", size: H });
  const items = L.items;
  const titles = items.filter((i) => i.kind === "title");
  const photos = items.filter((i) => i.kind === "photo");
  assert.equal(titles.length, 2);
  assert.equal(photos.length, 5);
  const right = (i) => i.x + i.w;
  assert.ok(right(titles[0]) >= Math.max(...items.map(right)) - 1e-9, "the first album's title is at the right end");
  // 閱讀順序：每一個都在前一個的左邊
  for (let k = 1; k < items.length; k++) assert.ok(right(items[k]) <= items[k - 1].x + 1e-9, `item ${k} is left of item ${k - 1}`);
  for (const p of photos) {
    assert.equal(p.h, H);
    const src = albums[p.album].photos[p.index];
    assert.ok(Math.abs(p.w / p.h - src.w / src.h) < 1e-9, "keeps its shape");
  }
  for (const a of items) for (const b of items) if (a !== b) assert.ok(!overlap(a, b), "nothing overlaps");
  // 相簿內的間距 < 相簿之間的間距
  const inner = photos[0].x - right(photos[1]);
  const between = photos[2].x - right(titles[1]);
  assert.ok(between > inner, `albums are separated (${between} > ${inner})`);
  assert.ok(Math.abs(L.length - (Math.max(...items.map(right)) + L.margin)) < 1e-9 && Math.min(...items.map((i) => i.x)) >= L.margin - 1e-9, "margins at both ends");
});

test("hanging scroll (phones): top to bottom, photos as wide as the paper", () => {
  const W = 320;
  const L = scrollLayout(albums, { mode: "hang", size: W });
  const items = L.items;
  for (let k = 1; k < items.length; k++) assert.ok(items[k].y >= items[k - 1].y + items[k - 1].h - 1e-9, `item ${k} below item ${k - 1}`);
  for (const p of items.filter((i) => i.kind === "photo")) {
    assert.equal(p.w, W);
    const src = albums[p.album].photos[p.index];
    assert.ok(Math.abs(p.w / p.h - src.w / src.h) < 1e-9);
  }
});

test("an empty album list still makes a short scroll (for the 待填 note)", () => {
  const L = scrollLayout([], { mode: "hand", size: 360 });
  assert.equal(L.items.length, 0);
  assert.ok(L.length > 0);
});

test("the viewer steps through photos and wraps around", () => {
  assert.equal(stepIndex(0, 5, 1), 1);
  assert.equal(stepIndex(4, 5, 1), 0);
  assert.equal(stepIndex(0, 5, -1), 4);
  assert.equal(stepIndex(2, 1, 1), 0);
});

test("the page: unrolls slowly once, not at all with reduced motion; a 待填 note while there are no photos", () => {
  const css = read("pages.css");
  const unroll = css.match(/\.scroll-paper\s*\{[^}]*animation:\s*unroll\s+(\d+)ms/);
  assert.ok(unroll && Number(unroll[1]) >= 1200, "unrolls over at least 1.2 s");
  assert.match(css, /@keyframes unroll/);
  const reduced = css.slice(css.indexOf("@media (prefers-reduced-motion: reduce)"));
  assert.match(reduced, /\.scroll-paper[^{]*\{[^}]*animation:\s*none/, "reduced motion: already open");
  const html = read("gallery.html");
  assert.match(html, /<div class="todo[^"]*"[^>]*>[\s\S]*?待填[\s\S]*?<\/div>/, "a 待填 note");
  assert.ok(Array.isArray(ALBUMS));
  assert.match(html, /<dialog[^>]*class="viewer"/, "a photo viewer");
});

// 6. 滾輪：滾輪往下＝往左捲；Firefox 用「行」算也要換成像素；按著 Ctrl（放大縮小網頁）、橫向滑動就不接手
test("wheel: down scrolls the hand scroll leftward, line/page units become pixels, ctrl-zoom and sideways swipes are left alone", () => {
  assert.equal(wheelPixels({ deltaY: 100, deltaX: 0, deltaMode: 0 }, 1000), 100);
  assert.equal(wheelPixels({ deltaY: 3, deltaX: 0, deltaMode: 1 }, 1000), 48, "3 lines ≈ 48 px");
  assert.equal(wheelPixels({ deltaY: 1, deltaX: 0, deltaMode: 2 }, 1000), 900, "a page ≈ 90% of the view");
  assert.equal(wheelPixels({ deltaY: 100, deltaX: 0, deltaMode: 0, ctrlKey: true }, 1000), null, "ctrl + wheel zooms the page");
  assert.equal(wheelPixels({ deltaY: 10, deltaX: 80, deltaMode: 0 }, 1000), null, "sideways trackpad swipe scrolls natively");
});

// 7. 手機掛軸的下軸：平常就停在卷子下緣（不是靠動畫搬過去，減少動畫時才不會不見）；
//    展開時滾下去的那根軸不能把頁面撐長（卷子外面的部分裁掉）
test("phones: the bottom roller rests at the bottom even without animation, and never stretches the page", () => {
  const css = read("pages.css");
  const phone = css.slice(css.indexOf("@media (max-width: 720px)"));
  assert.match(phone, /\.rod-lane\s*\{[^}]*transform:\s*translateY\(100%\)/, "rests at the bottom");
  assert.match(css, /\n\.scroll\s*\{[^}]*overflow:\s*clip/, "the moving roller is clipped to the scroll");
  assert.doesNotMatch(css, /overflow-clip-margin/, "no clip margin (it would make the page wider)");
});

// 8. 畫卷用 AI 生成的圖（紙和裱綾、捲起來的軸、掛軸上下端），不再用程式畫的漸層（太平、太假）
test("the scroll is built from the generated pictures, not CSS-drawn gradients", async () => {
  const { existsSync } = await import("node:fs");
  for (const f of ["paper.webp", "paper-v.webp", "end.webp", "hang-top.webp", "hang-bottom.webp"]) {
    assert.ok(existsSync(new URL(`../assets/scroll/${f}`, import.meta.url)), f);
  }
  const html = read("gallery.html");
  assert.ok((html.match(/<img[^>]*src="assets\/scroll\/end\.webp"[^>]*aria-hidden="true"/g) || []).length >= 2, "rolled ends on both sides");
  assert.match(html, /src="assets\/scroll\/hang-top\.webp"/);
  assert.match(html, /src="assets\/scroll\/hang-bottom\.webp"/);
  const css = read("pages.css").replace(/\/\*[\s\S]*?\*\//g, "");
  assert.match(css, /\.scroll-paper\s*\{[^}]*url\("assets\/scroll\/paper\.webp"\)/, "paper texture on desktop");
  assert.match(css.slice(css.indexOf("@media (max-width: 720px)")), /url\("assets\/scroll\/paper-v\.webp"\)/, "paper texture on phones");
  for (const m of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    if (/rod|scroll|end|hang/.test(m[1])) assert.doesNotMatch(m[2], /linear-gradient/, `${m[1].trim()}: no drawn gradients`);
  }
});
