// 光明燈登記頁（lamp.html）和樞理做專屬連結的頁（lamp-link.html）。
// 使用者 2026-11-24：「做一個分頁專門 for 光明燈登記，點進來的人自動填自己的名字，填完之後跳出視窗，
// 讓他選擇是否要按照樞理建議，是就沒事，否的話就讓他選光明燈項目」；選了「每個人一個專屬連結」「存進 Google 試算表」；
// 「光明燈有大有小，每一盞小的或大的有不同名目」；頁面上寫「樞理」。
//
// 規格：
// 1. 樞理在 lamp-link.html 打名字、勾建議的燈，按「產生連結」，得到這個人的專屬連結（可以複製、可以直接用 LINE 傳）。
//    名字沒打、一盞燈都沒勾：不產生，說哪裡沒填。
// 2. 專屬連結 = lamp.html#… ：名字和建議的燈放在 # 後面（不會送到伺服器、不會進網站紀錄），中文也沒問題。
//    連結被改壞、或寫了不存在的燈：不認得的燈丟掉；名字沒有或整個壞掉，就當作沒有連結。
// 3. 點專屬連結進來：名字已經填好（還可以改），下面寫著樞理建議的燈。按「確認姓名」→ 跳出視窗：
//    「要照樞理的建議點這幾盞燈嗎？」列出燈。
//    - 按「是」：直接登記（這個人除了按兩下，什麼都不用打）。
//    - 按「否」：視窗關掉，出現選燈的地方（大燈、小燈各自的名目），先幫他勾好樞理建議的，讓他改；至少要勾一盞才能送出。
// 4. 沒有專屬連結的人：自己打名字，直接選燈（沒有建議，所以不跳視窗）。
// 5. 登記送到 Google 試算表（一列一筆）：時間、姓名、照樞理建議（是／否）、登記的燈、樞理建議的燈、編號。
//    - 送出中按鈕不能再按；送好了說「已登記」；沒送出去說沒成功，可以再按一次（同一個編號，試算表不會多一筆）。
//    - 試算表網址還沒設定（待填）：說「登記功能還沒開通」，不假裝送出去了。
//    - 名字只留前 40 個字；試算表那邊把 = + - @ 開頭的字前面加 '（別人不能塞公式進試算表）。
// 6. 燈的名目寫在 js/lamp.js 一個地方（大燈、小燈各一串）；道場還沒給的標「待填」。
// 7. 跟其他內頁一樣的選單（這頁不在選單裡，所以沒有標「現在在這頁」）、字型、頁尾。兩頁都不給搜尋引擎收錄。
// 8. 2026-11-24 Codex 審查：
//    - 送過一次（不管成功沒）就固定那一筆：再送一次送的是一模一樣的內容，名字、勾選都鎖住（不會「試算表存舊的、畫面說新的」）。
//    - 試算表查整欄的編號（不是只看最後 500 列），寫完先存好再放開鎖；燈最多 20 盞、每盞最多 40 個字。
//    - 樞理改了名字或勾選：舊的連結馬上收起來，要重按「產生連結」；連結旁邊寫著這個連結是給誰、哪幾盞燈。
//    - 連結裡有名字但沒有認得的燈：只幫他填名字，不說「樞理建議」；# 後面太長（超過 2000 字）當作壞掉。
//    - 同一頁換了 # （貼了另一個人的連結）：整頁重新讀。
//    - 視窗打開時，鍵盤停在標題上（不是停在「是」，連按 Enter 不會不小心登記）；按 Esc 關掉：說「還沒登記」；
//      登記好：鍵盤移到「已登記」。
// 9. 2026-11-24 使用者：「往年信眾就可以只給名字，新信眾就要填農曆生日和地址」。
//    - 樞理做連結時勾「新信眾」：連結帶著這個記號。沒有專屬連結的人當作新信眾。
//    - 新信眾：名字下面多出「農曆生日」（民國年、月、日，可以勾閏月）和「地址」，都要填才能往下（說哪裡沒填）。
//      往年信眾：看不到這兩欄，只確認名字。
//    - 生日寫成「民國70年 農曆閏四月初五」；年份從民國 1 年到今年，月 1～12，日 1～30；不對就不送。地址最多 120 字。
//    - 試算表多三欄：新信眾（是／否）、農曆生日、地址（往年信眾這兩欄空白）。
//    - 業界比較：業界的表單每個人都要填生日和地址；我們只有新信眾要填，往年信眾還是只要按兩下。
// 10. 2026-11-24 使用者：「新信眾出生的時辰也要，可以勾不知道」。
//    - 農曆生日下面多一個「時辰」選單（子時到亥時，旁邊寫幾點到幾點），旁邊有「不知道」可以勾（勾了選單就不能選）。
//    - 要嘛選一個時辰、要嘛勾不知道，不然不能往下（說「請選出生的時辰，不知道就勾「不知道」」）。
//    - 試算表的農曆生日寫成「民國70年 農曆閏四月初五 子時」或「民國70年 農曆閏四月初五 吉時」（使用者：「不知道到時候就會變成吉時」）。
//
// 業界怎麼做、我們怎麼超越
// - 業界：宮廟的線上點燈多半是一張大家都一樣的表單：自己填姓名、出生年月日、住址、自己選燈、付功德金
//   （https://www.edh.tw/article/32910 ；中華電信的光明燈祈福網整合約 20 間廟：https://www.bnext.com.tw/article/60885/ ）。
//   靜態網站寫進 Google 試算表：常見做法是 Google Apps Script 的 doPost 接資料、appendRow 寫一列
//   （https://dev.to/allenarduino/how-to-connect-your-html-form-to-google-sheets-without-a-backend-31bo ）。
// - 我們的：
//   a. 樞理先幫每個人選好，連結帶著名字和建議；照建議的人只要按兩下、不用打字（測試量：有連結時 0 個要打的欄位、2 次點擊）。
//      業界的表單至少要自己填好幾個欄位、自己選燈。（就我所知是新的）
//      這個「兩下」只算點開連結以後；名字和建議是樞理先打好的（工作移到樞理那邊，但樞理本來就要決定建議）。
//   b. 名字放在 # 後面，不放在 ?…（?… 會送到網站伺服器、留在紀錄裡）。這只是不進紀錄，不是保密：
//      拿到連結的人都解得開、改得了，所以連結只當「幫忙填好」，不當身分證明。（業界本來就有的好習慣）
//   c. 每筆有編號，重送不會多一筆；擋試算表公式注入。（業界本來就有的做法，很多教學沒做）
// - 不做的：線上付款（使用者沒要，樞理自己收）；生日、住址欄位（樞理認得這個人；要的話之後加）；
//   一個連結登記全家（先一人一個）；登入帳號（多一步，對長輩不友善）；
//   存在伺服器、會過期的連結代碼（要自己的伺服器，這個網站沒有）；擋機器人亂送（小道場風險低；被灌了再加）。
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";

const read = (f) => readFileSync(new URL(`../${f}`, import.meta.url), "utf8");
const exists = (f) => existsSync(new URL(`../${f}`, import.meta.url));
const load = async () => (exists("js/lamp.js") ? import("../js/lamp.js") : {});
const page = exists("lamp.html") ? read("lamp.html") : "";
const maker = exists("lamp-link.html") ? read("lamp-link.html") : "";
const view = exists("js/lamp-view.js") ? read("js/lamp-view.js") : "";
const makerView = exists("js/lamp-link-view.js") ? read("js/lamp-link-view.js") : "";
const gs = exists("tools/lamp-sheet.gs") ? read("tools/lamp-sheet.gs") : "";

test("6. lamp names live in one list: big and small lamps, each with their own names", async () => {
  const { LAMPS, lampLabel } = await load();
  assert.ok(LAMPS?.big?.items?.length && LAMPS?.small?.items?.length, "大燈、小燈 each have names");
  assert.equal(LAMPS.big.label, "大燈");
  assert.equal(LAMPS.small.label, "小燈");
  const ids = [...LAMPS.big.items, ...LAMPS.small.items].map((i) => i.id);
  assert.equal(new Set(ids).size, ids.length, "every lamp has its own id");
  for (const i of LAMPS.big.items) assert.match(i.id, /^big-/);
  for (const i of LAMPS.small.items) assert.match(i.id, /^small-/);
  assert.equal(lampLabel(LAMPS.big.items[0].id), `大燈・${LAMPS.big.items[0].name}`);
  assert.equal(lampLabel("nope"), null);
});

test("2. the personal link carries the name and suggestions after #, Chinese included; broken links are handled", async () => {
  const { LAMPS, encodeLink, decodeLink } = await load();
  const s = [LAMPS.big.items[0].id, LAMPS.small.items[0].id];
  const hash = encodeLink({ name: "王小明", suggested: s });
  assert.match(hash, /^#[A-Za-z0-9_-]+$/, "safe in a URL, after #");
  assert.doesNotMatch(hash, /王/, "not readable as plain text in the link");
  assert.deepEqual(decodeLink(hash), { name: "王小明", suggested: s, newcomer: false });
  // 被改壞
  assert.equal(decodeLink(""), null);
  assert.equal(decodeLink("#"), null);
  assert.equal(decodeLink("#!!!"), null);
  assert.equal(decodeLink("#" + "a".repeat(30)), null);
  assert.deepEqual(decodeLink(encodeLink({ name: " 林 ", suggested: [s[0], "big-999", s[0]] })), { name: "林", suggested: [s[0]], newcomer: false }, "unknown lamps dropped, no repeats, name trimmed");
  assert.equal(decodeLink(encodeLink({ name: "   ", suggested: s })), null, "no name: no link");
  assert.equal(decodeLink(encodeLink({ name: "x".repeat(60), suggested: s })).name.length, 40, "names are cut at 40");
  assert.equal(decodeLink("#" + "A".repeat(2001)), null, "8. a huge # is treated as broken");
});

test("8. review fixes on the page: frozen retry, hash change, dialog focus, Esc, done focus", () => {
  assert.match(view, /frozen \?\?= entry/, "the first sent entry is kept");
  assert.match(view, /fetch\(SHEET_URL, \{ method: "POST", body: JSON\.stringify\(frozen\) \}\)/, "a retry sends exactly the same");
  assert.match(view, /function lockForm\(\)[\s\S]{0,300}nameInput\.disabled = true/, "name and ticks are locked once sent");
  assert.match(view, /addEventListener\("hashchange", \(\) => location\.reload\(\)\)/);
  assert.match(page, /<h2 id="lampAskTitle" tabindex="-1" autofocus>/, "the window opens on its title, not on 是");
  assert.match(view, /ask\.addEventListener\("cancel"[\s\S]{0,200}還沒登記/, "Esc says nothing was registered");
  assert.match(view, /\$\("lampDoneTitle"\)\.focus\(\)/, "after registering, focus moves to the result");
  assert.match(view, /suggested\.length \? "樞理已經幫您填好名字/, "only says 樞理 suggested when there is a suggestion");
});

test("8. review fixes on the link maker: no stale link", () => {
  assert.match(makerView, /addEventListener\("input", hideOut\)/, "changing the name or ticks hides the old link");
  assert.match(makerView, /makeFor/, "says who the link is for");
});

test("8. review fixes in the sheet script: whole-column repeat check, flush, sizes", () => {
  assert.match(gs, /createTextFinder\(id\)\.matchEntireCell\(true\)/, "checks every id, not the last 500");
  assert.match(gs, /SpreadsheetApp\.flush\(\)/);
  assert.match(gs, /lamps\.length > 20/);
});

test("1. making a link: needs a name and at least one lamp, otherwise says what is missing", async () => {
  const { LAMPS, makeLink } = await load();
  const s = [LAMPS.big.items[0].id];
  const base = "https://example.test/cihui/lamp-link.html";
  const ok = makeLink({ name: "陳大文", suggested: s, base });
  assert.equal(ok.error, null);
  assert.match(ok.url, /^https:\/\/example\.test\/cihui\/lamp\.html#[A-Za-z0-9_-]+$/, "points at lamp.html next to the maker page");
  assert.match(ok.line, /^https:\/\/line\.me\/R\/msg\/text\/\?/, "can be sent with LINE");
  assert.ok(decodeURIComponent(ok.line).includes(ok.url), "the LINE message holds the link");
  assert.equal(makeLink({ name: " ", suggested: s, base }).error, "name");
  assert.equal(makeLink({ name: "陳大文", suggested: [], base }).error, "lamps");
});

test("5. what goes to the sheet: one tidy row, retry-safe id, nothing broken", async () => {
  const { LAMPS, buildEntry, SHEET_URL } = await load();
  assert.equal(typeof SHEET_URL, "string");
  const a = LAMPS.big.items[0].id;
  const b = LAMPS.small.items[0].id;
  const e = buildEntry({ name: " 王小明 ", lamps: [a, b], suggested: [a], id: "abc-1" });
  assert.deepEqual(e, { id: "abc-1", name: "王小明", newcomer: false, birth: "", address: "", followed: false, lamps: [`大燈・${LAMPS.big.items[0].name}`, `小燈・${LAMPS.small.items[0].name}`], suggested: [`大燈・${LAMPS.big.items[0].name}`] });
  assert.equal(buildEntry({ name: "王", lamps: [b, a], suggested: [a, b], id: "x" }).followed, true, "same lamps in another order: followed");
  assert.equal(buildEntry({ name: "王", lamps: [a], suggested: [], id: "x" }).followed, false, "no suggestion: not 'followed'");
  assert.equal(buildEntry({ name: "", lamps: [a], suggested: [], id: "x" }), null, "no name: nothing to send");
  assert.equal(buildEntry({ name: "王", lamps: ["big-999"], suggested: [], id: "x" }), null, "no real lamp: nothing to send");
});

test("3-4. the page: name filled from the link, a yes/no window, the lamp chooser", () => {
  assert.ok(page, "lamp.html exists");
  assert.match(page, /<html lang="zh-Hant">/);
  assert.match(page, /name="viewport"/);
  assert.match(page, /<meta name="robots" content="noindex"/, "7. not on search engines");
  assert.match(page, /<title>光明燈登記 — 慈惠道場<\/title>/);
  assert.match(page, /<link rel="stylesheet" href="pages.css"/);
  assert.match(page, /<main>[\s\S]*<h1>光明燈登記<\/h1>[\s\S]*<\/main>/);
  const nav = page.match(/<nav class="pill"[\s\S]*?<\/nav>/)?.[0] ?? "";
  assert.match(nav, /<a class="brand" href="index.html">慈惠道場<\/a>/, "7. same menu");
  assert.doesNotMatch(nav, /aria-current/, "7. this page is not in the menu");
  assert.match(page, /崇羲篆體[\s\S]*CC BY-ND 3\.0 TW/, "7. same footer credit");
  assert.match(page, /<input[^>]*id="lampName"[^>]*autocomplete="name"/, "a name box");
  assert.match(page, /<dialog[^>]*id="lampAsk"/, "the yes/no window");
  assert.match(page, /要照樞理的建議點這幾盞燈嗎？/);
  assert.match(page, /id="lampYes"[^>]*>是/);
  assert.match(page, /id="lampNo"[^>]*>否/);
  assert.match(page, /id="lampChooser"[^>]*hidden/, "the chooser waits");
  assert.match(page, /<script type="module" src="js\/lamp-view.js"><\/script>/);
  assert.doesNotMatch(page, /師姐/, "the page says 樞理");
  // 畫面程式
  assert.match(view, /decodeLink\(location\.hash\)/, "reads the link");
  assert.match(view, /\.showModal\(\)/, "opens the window");
  assert.match(view, /lampYes[\s\S]{0,200}submit\(/, "yes: register right away");
  assert.match(view, /lampNo[\s\S]{0,300}showChooser\(/, "no: choose lamps");
  assert.match(view, /checked = suggested\.includes/, "the suggestion is ticked to start with");
});

test("5. sending: one press, clear result, an honest message when the sheet is not set up", () => {
  assert.match(view, /fetch\(SHEET_URL/, "sends to the sheet");
  assert.match(view, /\.disabled = busy/);
  assert.match(view, /setBusy\(true\);[\s\S]{0,80}送出中/, "no double presses while sending");
  assert.match(view, /已登記/);
  assert.match(view, /沒有送出去/);
  assert.match(view, /if \(!SHEET_URL\)[\s\S]{0,200}登記功能還沒開通/, "not set up yet: says so");
  assert.match(view, /randomUUID/, "one id per registration, kept for a retry");
});

test("1. the link maker page for 樞理", () => {
  assert.ok(maker, "lamp-link.html exists");
  assert.match(maker, /<meta name="robots" content="noindex"/);
  assert.match(maker, /<title>做光明燈專屬連結 — 慈惠道場<\/title>/);
  assert.match(maker, /<script type="module" src="js\/lamp-link-view.js"><\/script>/);
  assert.match(makerView, /makeLink\(/);
  assert.match(makerView, /clipboard\.writeText/, "copy the link");
  assert.doesNotMatch(maker, /師姐/);
});

test("5. the Google Sheet script: one row per registration, no repeats, no formulas", () => {
  assert.ok(gs, "tools/lamp-sheet.gs exists");
  assert.match(gs, /function doPost\(e\)/);
  assert.match(gs, /LockService/, "two people at once don't overwrite each other");
  assert.match(gs, /appendRow\(/);
  assert.match(gs, /\^\[=\+\\-@\]/, "formula injection is blocked");
  assert.match(gs, /createTextOutput\(JSON\.stringify/, "answers so the page knows it worked");
});

test("9. newcomers also give their lunar birthday and address; returning followers only the name", async () => {
  const { LAMPS, encodeLink, decodeLink, makeLink, buildEntry, lunarBirth } = await load();
  const a = LAMPS.big.items[0].id;
  // 連結帶「新信眾」
  assert.equal(decodeLink(encodeLink({ name: "新", suggested: [a], newcomer: true })).newcomer, true);
  assert.equal(decodeLink(encodeLink({ name: "舊", suggested: [a] })).newcomer, false);
  assert.equal(decodeLink(makeLink({ name: "新", suggested: [a], newcomer: true, base: "https://x.test/lamp-link.html" }).url.replace(/^[^#]*/, "")).newcomer, true);
  // 生日的寫法
  assert.equal(lunarBirth({ year: 70, month: 4, day: 5, leap: true, hour: 1, maxYear: 115 }), "民國70年 農曆閏四月初五 子時");
  assert.equal(lunarBirth({ year: 115, month: 12, day: 30, leap: false, hour: 12, maxYear: 115 }), "民國115年 農曆十二月三十 亥時");
  assert.equal(lunarBirth({ year: 70, month: 4, day: 5, hourUnknown: true, maxYear: 115 }), "民國70年 農曆四月初五 吉時");
  for (const hour of [undefined, 0, 13, 1.5]) assert.equal(lunarBirth({ year: 70, month: 4, day: 5, hour, maxYear: 115 }), null, `10. hour ${hour}: must pick one or tick 不知道`);
  for (const bad of [{ year: 0, month: 1, day: 1, hour: 1 }, { year: 116, month: 1, day: 1, hour: 1 }, { year: 70, month: 13, day: 1, hour: 1 }, { year: 70, month: 1, day: 31, hour: 1 }, { year: "七十", month: 1, day: 1, hour: 1 }, {}])
    assert.equal(lunarBirth({ ...bad, maxYear: 115 }), null, JSON.stringify(bad));
  // 送出去的一筆
  const birth = { year: 70, month: 4, day: 5, leap: false, hour: 7 };
  const n = buildEntry({ name: "新", lamps: [a], suggested: [], id: "n1", newcomer: true, birth, address: " 台北市中正區 " });
  assert.equal(n.newcomer, true);
  assert.equal(n.birth, "民國70年 農曆四月初五 午時");
  assert.equal(n.address, "台北市中正區");
  assert.equal(buildEntry({ name: "新", lamps: [a], suggested: [], id: "n1", newcomer: true, birth, address: "  " }), null, "newcomer without address: not sent");
  assert.equal(buildEntry({ name: "新", lamps: [a], suggested: [], id: "n1", newcomer: true, birth: { year: 70, month: 13, day: 1 }, address: "台北" }), null, "newcomer with a bad birthday: not sent");
  assert.equal(buildEntry({ name: "新", lamps: [a], suggested: [], id: "n1", newcomer: true, birth, address: "地".repeat(200) }).address.length, 120);
  const r = buildEntry({ name: "舊", lamps: [a], suggested: [], id: "r1", newcomer: false, birth, address: "台北" });
  assert.equal(r.birth, "", "returning followers: no birthday sent");
  assert.equal(r.address, "", "returning followers: no address sent");
  // 頁面
  assert.match(page, /<div class="lamp-newcomer" id="lampNewcomer" hidden>/, "the extra fields wait");
  for (const id of ["lampYear", "lampMonth", "lampDay"]) assert.match(page, new RegExp(`<select[^>]*id="${id}"`), id);
  assert.match(page, /<input[^>]*type="checkbox"[^>]*id="lampLeap"/, "leap month");
  assert.match(page, /<input[^>]*id="lampAddress"[^>]*autocomplete="street-address"/);
  // 10. 時辰
  const { HOURS } = await load();
  assert.deepEqual(HOURS.map((h) => h.name), ["子時", "丑時", "寅時", "卯時", "辰時", "巳時", "午時", "未時", "申時", "酉時", "戌時", "亥時"]);
  assert.equal(HOURS[0].time, "晚上11點～凌晨1點");
  assert.equal(HOURS[6].time, "中午11點～下午1點");
  assert.match(page, /<select[^>]*id="lampHour"/, "a 時辰 menu");
  assert.match(page, /<input[^>]*type="checkbox"[^>]*id="lampHourUnknown"[^>]*>\s*不知道/, "a 不知道 tick");
  assert.match(view, /\$\("lampHour"\)\.disabled = \$\("lampHourUnknown"\)\.checked/, "ticking 不知道 turns the menu off");
  assert.match(view, /請選出生的時辰，不知道就勾「不知道」/);
  assert.match(view, /const newcomer = link \? link\.newcomer : true;/, "no link: treated as a newcomer");
  assert.match(view, /\$\("lampNewcomer"\)\.hidden = !newcomer/);
  assert.match(view, /請填農曆生日/);
  assert.match(view, /請填地址/);
  // 樞理的頁
  assert.match(maker, /<input[^>]*type="checkbox"[^>]*id="makeNew"/, "樞理 can mark a newcomer");
  assert.match(makerView, /newcomer: \$\("makeNew"\)\.checked/);
  // 試算表
  assert.match(gs, /\["時間", "姓名", "新信眾", "農曆生日", "地址", "照樞理建議", "登記的燈", "樞理建議的燈", "編號"\]/);
});
