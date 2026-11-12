// 重要的字用毛筆字（Yuji Boku，Google Fonts，SIL OFL 授權，可以商用）：
// 1. 首頁的神明大標題、內頁的頁面標題和段落標題、神明卡片的名字、法會名稱、相簿的題字
// 2. 這套字是日本書法家的字，繁體字大多有，但缺「眾、腳」（日文寫成「衆、脚」）：
//    用毛筆字的文字都要在下面「確認過」的字裡面（2026-11-12 在瀏覽器逐字檢查過）。
//    以後加新標題，用到沒確認過的字，這個測試會擋下來，先去檢查再加進清單
// 3. 毛筆字只有一種粗細：不能讓瀏覽器自己加粗（會變醜），一律 400
// 4. 每一頁都從 Google Fonts 載入這套字（只下載用到的字，很小）；缺字時退回原本的宋體
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DEITIES } from "../js/deities.js";
import { EVENTS } from "../js/events.js";

const read = (f) => readFileSync(new URL(`../${f}`, import.meta.url), "utf8");
const VERIFIED = "關於道場緣起供奉神明照片法會活動聖誕固定報名方式最新公告服務項目預約與聯絡費用相簿瑤池金母九天玄女中壇元帥福德正慈惠主祀陪";
const MISSING = "眾腳";
const INNER = ["about.html", "events.html", "services.html", "gallery.html"];

test("every text shown in the brush font only uses characters checked to exist in Yuji Boku", () => {
  let text = "";
  for (const f of INNER) for (const m of read(f).matchAll(/<h[12][^>]*>([^<]*)<\/h[12]>/g)) text += m[1];
  for (const d of Object.values(DEITIES)) text += d.title + d.name;
  for (const e of EVENTS) text += e.name;
  for (const ch of text.replace(/\s/g, "")) {
    assert.ok(!MISSING.includes(ch), `「${ch}」 is missing from Yuji Boku`);
    assert.ok(VERIFIED.includes(ch), `「${ch}」 has not been checked in Yuji Boku yet`);
  }
});

test("the brush font is used for the important text, at its only weight (no fake bold), falling back to the serif", () => {
  const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "");
  const pages = strip(read("pages.css"));
  assert.match(pages, /--brush:\s*"Yuji Boku",\s*var\(--serif\)/, "--brush falls back to the serif");
  const rule = pages.match(/([^{}]*)\{([^{}]*font-family:\s*var\(--brush\)[^{}]*)\}/);
  assert.ok(rule, "a brush rule exists");
  for (const sel of [".hero h1", "h2", ".card-name", ".event-name", ".scroll-title strong"]) {
    assert.ok(rule[1].split(",").map((s) => s.trim()).includes(sel), `${sel} uses the brush font`);
  }
  assert.match(rule[2], /font-weight:\s*400/);
  assert.match(rule[2], /font-synthesis:\s*none/);
  // 後面的規則不能再把這些字設成粗體或換回宋體
  for (const m of pages.matchAll(/([^{}]*)\{([^{}]*)\}/g)) {
    const sels = m[1].split(",").map((s) => s.trim());
    if (!sels.some((s) => [".hero h1", "h2", ".card-name", ".event-name", ".scroll-title strong", ".card-main .card-name"].includes(s))) continue;
    if (m.index === rule.index) continue;
    assert.doesNotMatch(m[2], /font-weight:\s*[5-9]00/, `${m[1].trim()}: no bold on brush text`);
    assert.doesNotMatch(m[2], /font-family:/, `${m[1].trim()}: does not switch the font back`);
  }
  const home = strip(read("style.css"));
  const title = home.match(/\n\.title\s*\{([^}]*)\}/)?.[1] ?? "";
  assert.match(title, /font-family:\s*"Yuji Boku",\s*var\(--serif\)/, "home page deity title");
  assert.doesNotMatch(title, /font-weight:\s*[5-9]00/, "home title: no fake bold");
});

test("every page loads the brush font from Google Fonts", () => {
  for (const f of ["index.html", ...INNER]) {
    assert.match(read(f), /fonts\.googleapis\.com\/css2\?[^"]*family=Yuji\+Boku/, f);
  }
});
