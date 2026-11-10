// 內頁（關於道場、法會活動、服務）的規格：
// 1. 三頁上方都有同一條選單：慈惠道場（回首頁）、關於道場、法會活動、服務；現在在哪一頁要標出來
// 2. 法會日期寫在 js/events.js，一行一場（以後改這個檔就好）；頁面照農曆月日排好，
//    日期寫成「農曆七月十八」；還沒跟道場確認的標「待確認」
// 3. 道場還沒給的內容一律放進「待填」框，不會看起來像真的資料
// 4. 動畫優雅：段落捲到時慢慢浮上來；要求減少動畫就直接顯示
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { lunarDate, eventRows, EVENTS } from "../js/events.js";

const PAGES = { "about.html": "關於道場", "events.html": "法會活動", "services.html": "服務" };
const read = (f) => readFileSync(new URL(`../${f}`, import.meta.url), "utf8");

test("every inner page has the same menu, and marks the page you are on", () => {
  for (const [file, label] of Object.entries(PAGES)) {
    const html = read(file);
    assert.match(html, /<html lang="zh-Hant">/, `${file}: language`);
    assert.match(html, /name="viewport"/, `${file}: phone-friendly`);
    assert.match(html, /<link rel="stylesheet" href="pages.css"/, `${file}: shared style`);
    assert.match(html, new RegExp(`<title>${label} — 慈惠道場</title>`), `${file}: title`);
    const nav = html.match(/<nav class="pill"[\s\S]*?<\/nav>/)?.[0] ?? "";
    assert.match(nav, /<a class="brand" href="index.html">慈惠道場<\/a>/, `${file}: back to the home page`);
    for (const [f, l] of Object.entries(PAGES)) {
      const current = f === file ? ' aria-current="page"' : "";
      assert.ok(nav.includes(`<a href="${f}"${current}>${l}</a>`), `${file}: link to ${l}${current ? " (marked current)" : ""}`);
    }
    assert.equal((nav.match(/aria-current/g) || []).length, 1, `${file}: only one page marked`);
    assert.match(html, /<script type="module" src="js\/page.js"><\/script>/, `${file}: gentle reveal script`);
  }
});

test("lunar dates are written the traditional way", () => {
  assert.equal(lunarDate(1, 1), "農曆正月初一");
  assert.equal(lunarDate(2, 2), "農曆二月初二");
  assert.equal(lunarDate(2, 15), "農曆二月十五");
  assert.equal(lunarDate(7, 18), "農曆七月十八");
  assert.equal(lunarDate(9, 9), "農曆九月初九");
  assert.equal(lunarDate(5, 10), "農曆五月初十");
  assert.equal(lunarDate(3, 20), "農曆三月二十");
  assert.equal(lunarDate(5, 23), "農曆五月廿三");
  assert.equal(lunarDate(12, 30), "農曆十二月三十");
  assert.equal(lunarDate(11, 11), "農曆十一月十一");
});

test("events come from one list, sorted through the lunar year; unconfirmed ones say so", () => {
  const rows = eventRows([
    { name: "乙", month: 9, day: 9, confirmed: true },
    { name: "甲", month: 2, day: 15, confirmed: false },
    { name: "丙", month: 2, day: 2, confirmed: true, note: "頭牙" }
  ]);
  assert.deepEqual(
    rows.map((r) => [r.date, r.name, r.pending]),
    [
      ["農曆二月初二", "丙", false],
      ["農曆二月十五", "甲", true],
      ["農曆九月初九", "乙", false]
    ]
  );
  assert.equal(rows[0].note, "頭牙");
  assert.equal(rows[1].note, "");
});

test("the four deities' birthdays are on the list, all still waiting for the temple to confirm", () => {
  const names = EVENTS.map((e) => e.name).join("、");
  for (const d of ["瑤池金母", "九天玄女", "中壇元帥", "福德正神"]) assert.ok(names.includes(d), d);
  assert.ok(EVENTS.every((e) => e.confirmed === false), "nothing is marked confirmed until the temple says so");
});

test("anything the temple has not given yet sits in a clearly marked 待填 box", () => {
  for (const file of Object.keys(PAGES)) {
    const html = read(file);
    const boxes = html.match(/<div class="todo[^"]*"[^>]*>[\s\S]*?<\/div>/g) || [];
    assert.ok(boxes.length >= 1, `${file}: has 待填 boxes`);
    for (const b of boxes) assert.match(b, /待填/, `${file}: every box says 待填`);
  }
  const css = read("pages.css");
  assert.match(css, /\.todo\s*\{[^}]*dashed/, "待填 boxes have a dashed border");
});

test("reveal animation is slow, and off when the visitor asks for less motion", () => {
  const css = read("pages.css");
  const m = css.match(/\.js \.reveal\s*\{[^}]*transition:[^;]*opacity (\d+)ms/);
  assert.ok(m && Number(m[1]) >= 800, "rises slowly (≥ 0.8 s)");
  const block = (name) => css.slice(css.indexOf(name)).split(/\n@media|\n@keyframes/)[0];
  assert.match(block("@media (prefers-reduced-motion: reduce)"), /\.reveal\s*\{[^}]*opacity:\s*1/, "reduced motion: shown at once");
  assert.match(block("@media print"), /\.reveal\s*\{[^}]*opacity:\s*1/, "printing: everything is shown");
});

// 5. 就算程式檔壞掉（例如改 events.js 時打錯一個逗號），內容也不能一直是空白：
//    頁面先等 page.js 說「好了」，等不到就把隱藏拿掉
test("if the page script breaks, the text still shows up instead of staying blank", () => {
  for (const file of Object.keys(PAGES)) {
    const html = read(file);
    const head = html.slice(0, html.indexOf("</head>"));
    assert.match(head, /setTimeout\([\s\S]*__pageReady[\s\S]*classList\.remove\("js"\)/, `${file}: safety timer in the head`);
  }
  assert.match(read("js/page.js"), /window\.__pageReady = true/, "page.js says it is ready");
});

// 6. 重要的字要讀得清楚：跟底色的對比至少 4.5（WCAG AA）；金色只拿來畫線，字用深一點的金
test("important text is easy to read (contrast at least 4.5 against the paper)", () => {
  const css = read("pages.css");
  const v = (name) => css.match(new RegExp(`--${name}:\\s*(#[0-9a-f]{6})`, "i"))?.[1];
  const lum = (hex) => {
    const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((x) => (x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4));
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  };
  const ratio = (a, b) => {
    const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
    return (x + 0.05) / (y + 0.05);
  };
  for (const name of ["text", "text-soft", "gold-text"]) {
    const c = v(name);
    assert.ok(c, `--${name} is a solid colour`);
    assert.ok(ratio(c, v("paper")) >= 4.5, `--${name} contrast ${ratio(c, v("paper")).toFixed(2)}`);
  }
  assert.doesNotMatch(css, /color:\s*var\(--gold\)/, "the light gold is never used for text");
});

test("the page title is inside the main content (screen readers jumping to main still hear it)", () => {
  for (const file of Object.keys(PAGES)) assert.match(read(file), /<main>[\s\S]*<h1>[\s\S]*<\/main>/, file);
});

test("a typo in a festival date is caught instead of printing a wrong date", () => {
  for (const [m, d] of [[0, 1], [13, 1], [1, 0], [1, 31], [1.5, 2]]) {
    assert.throws(() => lunarDate(m, d), RangeError, `${m}/${d}`);
  }
});
