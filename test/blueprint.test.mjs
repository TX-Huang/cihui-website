// 服務頁＝「從容修行的年度藍圖」（素材：assets/raw/LINE_NOTE_261115_1～10.jpg，道場的簡報）。
// 使用者 2026-11-15 選了「一年的旅程」：從上往下捲，就是從元旦走到年底。
//
// 規格：
// 1. 順序：理念 → 三層護持 → 元旦・光明燈 → 新春・祭改 → 核心交集（兩團光合在一起） → 農曆八月・蟠桃盛會 → 不定期・母娘聖誕與週年慶 → 全年平安藍圖 →
//    預約與聯絡（還沒給，維持「待填」）
// 2. 價錢只寫在 js/blueprint.js 一個地方，跟簡報一樣：
//    小燈 $1,200、大燈 $3,600；祭改 $700，加選 祈還福 $800、補運 $300、補家運 $300、補考運 $300、補財庫 $1,100。
//    網頁上直接寫出來（沒有 JavaScript 也看得到），而且要跟 js/blueprint.js 一致
// 3. 祭改小問答：勾自己的情況，對應的加選項目亮起來；基本的祭改一定有；下面寫合計。
//    什麼都不勾＝$700；勾「學子」和「從商」＝ 祭改＋補考運＋補財庫＝$2,100
// 4. 旁邊有一條「一年」細線，標著元旦、新春、八月、不定期；捲到哪一站亮到哪一站。
//    背景顏色跟著季節慢慢換（兩站之間平滑地混，不會一下切過去）
// 5. 三層護持：中間是核心項目、中圈是自由參加、外圈是隨喜功德；點哪一圈（或它的名字）那一圈就亮起來（說明一直都看得到）
// 6. 光明燈：按「點燈」，燈約 2.5 秒慢慢亮起來；舊年運勢線往下、新年運勢線往上，在元旦交會。
//    這只是示意，要寫清楚（不能讓人以為已經登記點燈）
// 7. 核心交集：光明燈（金）和祭改（粉）兩團光，捲到這一段時慢慢靠在一起
// 9. 沒有 JavaScript 時，只有互動才有用的東西（合計、點燈按鈕、「點一圈」的提示）不顯示，其他內容照樣看得到
// 10. 用語照簡報原文（2026-11-15 審查：「核心交集」不叫「兩盞光合一」，「一家之主代表祈求」不加字）
// 8. 動畫都很慢、很順（優雅不躁動）；要求減少動畫時不動。
//    這一頁是內頁「捲動時不動」的例外（使用者要互動、動畫）；動畫寫在 js/blueprint-view.js，不放進共用的 js/page.js
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { LAMPS, JIEGAI_BASE, JIEGAI_ADDONS, STOPS, jiegaiPlan, money, seasonMix, railStop, tierAt, lampGlow, LIGHT_MS, handover, mergeAt } from "../js/blueprint.js";

const read = (f) => readFileSync(new URL(`../${f}`, import.meta.url), "utf8");
const html = read("services.html");

test("prices match the temple's slides, in one place", () => {
  assert.deepEqual(
    LAMPS.map((l) => [l.name, l.price]),
    [
      ["小燈", 1200],
      ["大燈", 3600]
    ]
  );
  assert.deepEqual([JIEGAI_BASE.name, JIEGAI_BASE.price], ["祭改", 700]);
  assert.deepEqual(
    JIEGAI_ADDONS.map((a) => [a.name, a.price]),
    [
      ["祈還福", 800],
      ["補運", 300],
      ["補家運", 300],
      ["補考運", 300],
      ["補財庫", 1100]
    ]
  );
});

test("money is written like the slides", () => {
  assert.equal(money(700), "$700");
  assert.equal(money(1200), "$1,200");
  assert.equal(money(12000), "$12,000");
});

test("祭改 quiz: the base is always in; picked situations add their item; the total adds up", () => {
  const none = jiegaiPlan([]);
  assert.deepEqual(none.items.map((i) => i.name), ["祭改"]);
  assert.equal(none.total, 700);
  const two = jiegaiPlan(["bucaiku", "bukaoyun"]);
  assert.deepEqual(two.items.map((i) => i.name), ["祭改", "補考運", "補財庫"], "always in the slide's order");
  assert.equal(two.total, 2100);
  const all = jiegaiPlan(JIEGAI_ADDONS.map((a) => a.id));
  assert.equal(all.total, 700 + 800 + 300 + 300 + 300 + 1100);
  assert.equal(jiegaiPlan(["buyun", "buyun", "nope"]).total, 1000, "duplicates and unknown ids are ignored");
});

test("the page follows the year, and the content is in the page itself (works without JavaScript)", () => {
  const order = ["理念", "三層護持", "光明燈", "祭改", "核心交集", "蟠桃", "聖誕", "全年", "預約與聯絡"];
  const heads = [...html.matchAll(/<h2[^>]*>([^<]*)<\/h2>/g)].map((m) => m[1]);
  let at = -1;
  for (const key of order) {
    const i = heads.findIndex((h, k) => k > at && h.includes(key));
    assert.ok(i > at, `「${key}」 comes next (headings: ${heads.join(" / ")})`);
    at = i;
  }
  // 每一列：項目和它的價錢在同一列（對調價錢會被抓到）
  const lampRows = html.match(/<ul class="price-list">[\s\S]*?<\/ul>/)?.[0].match(/<li>[\s\S]*?<\/li>/g) || [];
  assert.equal(lampRows.length, LAMPS.length, "one row per lamp");
  LAMPS.forEach((l, i) => {
    assert.ok(lampRows[i].includes(`>${l.name}<`) && lampRows[i].includes(`>${money(l.price)}<`), `${l.name} row says ${money(l.price)}`);
  });
  const base = html.match(/<p class="quiz-base">[\s\S]*?<\/p>/)?.[0] ?? "";
  assert.ok(base.includes(`>${JIEGAI_BASE.name}<`) && base.includes(`>${money(JIEGAI_BASE.price)}<`) && base.includes(JIEGAI_BASE.desc), "base row");
  const labels = html.match(/<label>[\s\S]*?<\/label>/g) || [];
  assert.equal(labels.length, JIEGAI_ADDONS.length, "one quiz row per add-on");
  JIEGAI_ADDONS.forEach((a, i) => {
    const row = labels[i];
    assert.match(row, new RegExp(`<input[^>]*type="checkbox"[^>]*value="${a.id}"`), `${a.name}: its own box`);
    assert.ok(row.includes(`>${a.who}<`), `${a.name}: says who it is for (${a.who})`);
    assert.ok(row.includes(`>${a.name}<`) && row.includes(`>${money(a.price)}<`), `${a.name} row says ${money(a.price)}`);
  });
  assert.match(html, /aria-live="polite"/, "the total is announced when it changes");
  assert.match(html, /<div class="todo[^"]*"[^>]*>[\s\S]*?預約[\s\S]*?<\/div>/, "booking is still a 待填 box");
  assert.match(html, /<script type="module" src="js\/blueprint-view.js"><\/script>/);
  assert.doesNotMatch(read("js/page.js"), /blueprint/, "the shared page script stays calm");
});

test("wording follows the slides", () => {
  assert.equal(JIEGAI_ADDONS.find((a) => a.id === "bujiayun").who, "一家之主代表祈求");
  assert.doesNotMatch(html, /兩盞光合一/);
  const lamp = html.match(/<figure class="lamp"[\s\S]*?<\/figure>/)?.[0] ?? "";
  assert.match(lamp, /示意/, "lighting the lamp here is only a demo, and says so");
});

test("without JavaScript, the bits that only work with it are hidden; the rest is all there", () => {
  const classes = (cls) => [...html.matchAll(/class="([^"]*)"/g)].map((m) => m[1].split(/\s+/)).filter((c) => c.includes(cls));
  for (const cls of ["quiz-total", "lamp-button"]) assert.ok(classes(cls).length && classes(cls).every((c) => c.includes("js-only")), `${cls} is js-only`);
  assert.match(html, /class="js-only"[^>]*>[^<]*點一圈/, "the 點一圈 hint is js-only");
  assert.match(read("pages.css"), /\.journey:not\(\.is-live\)\s+\.js-only\s*\{[^}]*display:\s*none/);
});

test("the rail lights the stop you are at (none before the first)", () => {
  const marks = [1000, 2000, 3000, 4000];
  const vh = 800;
  assert.equal(railStop(100, marks, vh), -1, "still in the intro");
  assert.equal(railStop(1000, marks, vh), 0);
  assert.equal(railStop(1400, marks, vh), 0, "closer to the first stop");
  assert.equal(railStop(1600, marks, vh), 1, "closer to the second stop");
  assert.equal(railStop(9000, marks, vh), 3, "past the last stop");
});

test("the year rail has the four stops in order", () => {
  assert.deepEqual(STOPS.map((s) => s.when), ["元旦", "新春", "農曆八月", "不定期"]);
  for (const s of STOPS) assert.match(html, new RegExp(`data-stop="${s.id}"`), `${s.when} section is marked`);
});

test("season colours blend smoothly from stop to stop (no jumps)", () => {
  const marks = [100, 600, 1100, 1600];
  assert.deepEqual(seasonMix(0, marks), { a: 0, b: 0, w: 0 }, "before the first stop");
  assert.deepEqual(seasonMix(5000, marks), { a: 3, b: 3, w: 0 }, "after the last stop");
  const mid = seasonMix(350, marks);
  assert.equal(mid.a, 0);
  assert.equal(mid.b, 1);
  assert.ok(Math.abs(mid.w - 0.5) < 1e-9, "halfway is an even mix");
  // 一路捲下去，「現在混到哪」一直往前、沒有跳
  let prev = 0;
  for (let y = 0; y <= 1800; y += 5) {
    const m = seasonMix(y, marks);
    const pos = m.a + m.w * (m.b - m.a);
    assert.ok(pos >= prev - 1e-9, `moves forward at ${y}`);
    assert.ok(pos - prev < 0.05, `no jump at ${y}`);
    prev = pos;
  }
});

test("three tiers: centre is core, middle ring is free to join, outer ring is 隨喜", () => {
  const R = 200;
  assert.equal(tierAt(0, 0, R), "core");
  assert.equal(tierAt(40, 30, R), "core");
  assert.equal(tierAt(0, 110, R), "free");
  assert.equal(tierAt(-120, -90, R), "joy");
  assert.equal(tierAt(0, 230, R), null, "outside the rings");
});

test("lighting the lamp is slow and smooth (about 2.5 s), never overshoots", () => {
  assert.ok(LIGHT_MS >= 2000 && LIGHT_MS <= 3200, `${LIGHT_MS} ms`);
  assert.equal(lampGlow(0), 0);
  assert.equal(lampGlow(LIGHT_MS), 1);
  assert.equal(lampGlow(LIGHT_MS * 3), 1);
  let prev = 0;
  for (let t = 0; t <= LIGHT_MS; t += 16) {
    const g = lampGlow(t);
    assert.ok(g >= prev && g <= 1, `rises at ${t}`);
    assert.ok(g - prev < 0.03, `no jump at ${t}`);
    prev = g;
  }
  assert.ok(lampGlow(160) < 0.02, "starts gently");
});

test("handover curves: last year's energy falls, the new year's rises, they cross at 元旦 (the middle)", () => {
  const { old, fresh } = handover(40);
  assert.equal(old.length, 41);
  for (let i = 1; i <= 40; i++) {
    assert.ok(old[i] <= old[i - 1], "old falls");
    assert.ok(fresh[i] >= fresh[i - 1], "new rises");
  }
  assert.ok(old[0] > 0.8 && fresh[0] < 0.2);
  assert.ok(old[40] < 0.2 && fresh[40] > 0.8);
  assert.ok(Math.abs(old[20] - fresh[20]) < 1e-9, "cross in the middle");
});

test("the two lights drift together slowly as you reach that part", () => {
  assert.equal(mergeAt(0), 1, "apart before");
  assert.equal(mergeAt(1), 0, "together after");
  assert.equal(mergeAt(-1), 1);
  assert.equal(mergeAt(2), 0);
  let prev = 1;
  for (let p = 0; p <= 1; p += 0.01) {
    const d = mergeAt(p);
    assert.ok(d <= prev && prev - d < 0.03, `smooth at ${p.toFixed(2)}`);
    prev = d;
  }
});

test("motion: reduced-motion visitors get no animation on this page", () => {
  const css = read("pages.css");
  const reduced = css.slice(css.indexOf("@media (prefers-reduced-motion: reduce)"));
  assert.match(reduced, /\.year-rail[^{]*\{[^}]*transition:\s*none/, "the rail does not fade");
  assert.match(reduced, /\.ring-joy::after[^{]*\{[^}]*animation:\s*none/, "the orbiting light stands still");
  const view = read("js/blueprint-view.js");
  assert.match(view, /prefers-reduced-motion/, "the script checks it too");
});
