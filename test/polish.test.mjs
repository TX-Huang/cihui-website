// 內頁照 unslop 的檢查清單小修（關於道場、法會活動、服務、相簿共用 pages.css）：
// 1. 標題不用最粗的字（最多 600），靠大小分主次；小標字距不要拉太開
// 2. 間距對齊 4 的倍數（選單是跟首頁共用的樣式，不算）
// 3. 膠囊不要到處都是：「待確認」「待填」改成安靜的小字
// 4. 頁首不要一大片空白：矮一點，標題靠左，跟內文對齊
// 5. 只有一個進場動畫（頁首的字淡淡浮上來一次），捲動時不再每段都動
// 重點畫面：
// 6. 關於道場：主祀金母一張大卡、三位陪祀一排小卡，各配首頁已經有的圖（青鳥、鳳凰、金蓮、稻穗）
// 7. 法會活動：「農曆一年」橫軸，十二個月排開，每個聖誕蓋一個朱紅小印（確認過是實心印，待確認是虛線印）；
//    印不會疊在一起；朱紅色的字在紙上要讀得清楚
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { deityCards, yearTimeline, MONTHS } from "../js/page-parts.js";
import { DEITIES } from "../js/deities.js";
import { EVENTS } from "../js/events.js";

const read = (f) => readFileSync(new URL(`../${f}`, import.meta.url), "utf8");
const INNER = ["about.html", "events.html", "services.html", "gallery.html"];
const css = read("pages.css");
// 每一條規則（選擇器 + 內容），不含 @media 外框；先拿掉註解，註解才不會被當成選擇器的一部分
const bare = css.replace(/\/\*[\s\S]*?\*\//g, "");
const rules = [...bare.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((m) => ({ sel: m[1].trim(), body: m[2] }));
const shared = (sel) => /\.pill|\.topbar/.test(sel); // 跟首頁共用的選單

test("type: no heavy headings (at most 600), small labels are not widely tracked", () => {
  for (const r of rules) {
    if (shared(r.sel)) continue;
    for (const w of r.body.matchAll(/font-weight:\s*(\d+)/g)) assert.ok(Number(w[1]) <= 600, `${r.sel}: weight ${w[1]}`);
  }
  const eyebrow = rules.find((r) => r.sel === ".eyebrow");
  const ls = Number(eyebrow?.body.match(/letter-spacing:\s*([\d.]+)em/)?.[1] ?? 0);
  assert.ok(ls <= 0.15, `eyebrow tracking ${ls}em`);
});

test("spacing sits on a 4 px grid (2 px nudges allowed)", () => {
  for (const r of rules) {
    if (shared(r.sel)) continue;
    for (const d of r.body.matchAll(/(margin[a-z-]*|padding[a-z-]*|gap|inset):\s*([^;]+);/g)) {
      for (const px of d[2].matchAll(/(-?\d+(?:\.\d+)?)px/g)) {
        const v = Math.abs(Number(px[1]));
        assert.ok(v <= 2 || v % 4 === 0, `${r.sel} ${d[1]}: ${v}px`);
      }
    }
  }
});

test("fewer pills: the 待確認 and 待填 marks are quiet text, not capsules", () => {
  for (const sel of [".pending", ".todo-tag"]) {
    const r = rules.find((x) => x.sel === sel);
    assert.ok(r, sel);
    assert.doesNotMatch(r.body, /999px/, `${sel} is not a pill`);
  }
});

test("the page head is compact and left-aligned with the text below (no big empty band)", () => {
  const hero = rules.find((r) => r.sel === ".hero");
  assert.ok(Number(hero.body.match(/max-height:\s*(\d+)px/)?.[1]) <= 360, "short");
  assert.doesNotMatch(hero.body, /text-align:\s*center/);
  const text = rules.find((r) => r.sel === ".hero-text");
  assert.match(text.body, /max-width:\s*720px/, "same column as the content");
});

test("one entrance only: the page title rises once on load; nothing moves on scroll", () => {
  for (const f of INNER) assert.doesNotMatch(read(f), /class="[^"]*\breveal\b/, `${f}: no scroll reveals`);
  assert.doesNotMatch(read("js/page.js"), /IntersectionObserver/, "no scroll watcher");
  const text = rules.find((r) => r.sel === ".hero-text");
  const ms = Number(text.body.match(/animation:\s*\w+\s+(\d+)ms/)?.[1]);
  assert.ok(ms >= 800, `rises slowly (${ms} ms)`);
  const reduced = css.slice(css.indexOf("@media (prefers-reduced-motion: reduce)"));
  assert.match(reduced, /\.hero-text\s*\{[^}]*animation:\s*none/, "reduced motion: no entrance");
});

test("about: the main deity gets one large card, the three others a row of small ones, each with its own picture", () => {
  const cards = deityCards(DEITIES);
  assert.deepEqual(
    cards.map((c) => [c.id, c.main]),
    [
      ["jinmu", true],
      ["xuannu", false],
      ["nezha", false],
      ["tudi", false]
    ]
  );
  const pics = { jinmu: "青鳥", xuannu: "鳳凰", nezha: "金蓮", tudi: "稻穗" };
  for (const c of cards) {
    assert.equal(c.img, `assets/elements/card-${c.id}.webp`);
    assert.ok(existsSync(new URL(`../${c.img}`, import.meta.url)), `${c.img} exists`);
    assert.equal(c.picture, pics[c.id]);
    assert.equal(c.role, c.main ? "主祀" : "陪祀");
    assert.equal(c.href, `index.html#${c.id}`);
  }
});

test("events: a lunar year runs left to right with twelve months, and every festival is a seal on it", () => {
  assert.deepEqual(MONTHS, ["正", "二", "三", "四", "五", "六", "七", "八", "九", "十", "冬", "臘"]);
  for (const width of [640, 320]) {
    const tl = yearTimeline(EVENTS, width);
    assert.equal(tl.months.length, 12);
    tl.months.forEach((m, i) => assert.ok(Math.abs(m.x - ((i + 0.5) / 12) * width) < 1e-9, `month ${m.label} centred in its slot`));
    assert.equal(tl.seals.length, EVENTS.length);
    for (const s of tl.seals) {
      assert.ok(s.x - tl.size / 2 >= 0 && s.x + tl.size / 2 <= width, `${width}: ${s.name} inside`);
      assert.equal([...s.char].length, 1, "one character on the seal");
      assert.equal(s.pending, true, "all still waiting for the temple, so all dashed");
    }
    // 同一排的印不能疊在一起（二月初二、二月十五靠很近，要上下錯開）
    for (const a of tl.seals)
      for (const b of tl.seals) {
        if (a === b || a.row !== b.row) continue;
        assert.ok(Math.abs(a.x - b.x) >= tl.size, `${width}: ${a.name} and ${b.name} overlap`);
      }
  }
  const t = yearTimeline([{ name: "甲", seal: "甲", month: 7, day: 18, confirmed: true }], 600);
  assert.equal(t.seals[0].pending, false, "confirmed: a solid seal");
  assert.ok(Math.abs(t.seals[0].x - ((6 + 17 / 30) / 12) * 600) < 1e-9, "placed by month and day");
});

test("the seal red reads clearly as text on the paper and with white text on it", () => {
  const v = (name) => css.match(new RegExp(`--${name}:\\s*(#[0-9a-f]{6})`, "i"))?.[1];
  const lum = (hex) => {
    const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((x) => (x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4));
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  };
  const ratio = (a, b) => {
    const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
    return (x + 0.05) / (y + 0.05);
  };
  assert.ok(v("seal"), "--seal is defined");
  assert.ok(ratio(v("seal"), v("paper")) >= 4.5, "on paper");
  assert.ok(ratio(v("seal"), "#ffffff") >= 4.5, "white on the seal");
});
