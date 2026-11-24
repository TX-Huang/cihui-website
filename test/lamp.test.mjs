// 光明燈登記頁（lamp.html）和樞理做專屬連結的頁（lamp-link.html）。
// 使用者 2026-11-24：「做一個分頁專門 for 光明燈登記，點進來的人自動填自己的名字，填完之後跳出視窗，
// 讓他選擇是否要按照樞理建議，是就沒事，否的話就讓他選光明燈項目」；選了「每個人一個專屬連結」「存進 Google 試算表」；
// 「光明燈有大有小，每一盞小的或大的有不同名目」；頁面上寫「樞理」。
//
// 規格：
// 1. 樞理在 lamp-link.html 打名字、勾建議的燈，按「產生連結」，得到這個人的專屬連結（可以複製、可以直接用 LINE 傳）。
//    名字沒打、一盞燈都沒勾：不產生，說哪裡沒填。
// 2. 專屬連結 = lamp.html#… ：名字和建議的燈放在 # 後面（不會送到伺服器、不會進網站紀錄），中文也沒問題。
//    連結記的是燈的「大小＋名目的名字」（不是第幾格）：樞理以後改名、換順序，舊連結也不會指錯燈；
//    連結裡的燈現在的名目已經沒有了：丟掉。名字沒有或整個壞掉，就當作沒有連結。
// 3. 點專屬連結進來：名字已經填好（還可以改），下面寫著樞理建議的燈，接著就問「要照樞理的建議點這幾盞燈嗎？」
//    （2026-11-24 使用者：「一開始就要讓他選照樞理建議，還是要自己選，自己選那邊才讓她檢查一次」→ 不用先按「確認」、不跳視窗）
//    - 按「是，照建議登記」：直接登記（往年信眾除了這一下，什麼都不用打）。新信眾的資料沒填好：說哪裡沒填，不送。
//    - 按「否，我自己選」：出現選燈的地方（大燈、小燈各自的名目），先幫他勾好樞理建議的，讓他改；
//      按「下一步：檢查一次」→ 列出姓名、（新信眾的）農曆生日和地址、要點的燈 →「送出登記」才送；「回去修改」回到原本的畫面。
//      至少要勾一盞、資料要填好，才能到檢查那一步。
// 4. 沒有專屬連結的人（或連結裡的燈都已經沒有了）：沒有建議，一打開就是選燈的地方，一樣「下一步：檢查一次」再送出。
// 5. 登記送到 Google 試算表（一列一筆）：時間、姓名、新信眾、農曆生日、地址、照樞理建議（是／否）、登記的燈、樞理建議的燈、編號。
//    - 送出中按鈕不能再按；送好了說「已登記」；沒送出去說沒成功，可以再按一次（同一個編號，試算表不會多一筆）。
//    - 名字只留前 40 個字；試算表那邊把 = + - @ 開頭的字前面加 '（別人不能塞公式進試算表）。
// 6. （2026-11-24 改成第 11 點：名目由樞理自己填）大燈、小燈各最多 6 個名目（使用者：「各6」）。
// 7. 跟其他內頁一樣的選單（這頁不在選單裡，所以沒有標「現在在這頁」）、字型、頁尾。兩頁都不給搜尋引擎收錄。
// 8. 2026-11-24 Codex 審查：
//    - 送過一次（不管成功沒）就固定那一筆：再送一次送的是一模一樣的內容，名字、勾選都鎖住（不會「試算表存舊的、畫面說新的」）。
//    - 試算表查整欄的編號（不是只看最後 500 列），寫完先存好再放開鎖；燈最多 20 盞、每盞最多 40 個字。
//    - 樞理改了名字或勾選：舊的連結馬上收起來，要重按「產生連結」；連結旁邊寫著這個連結是給誰、哪幾盞燈。
//    - 連結裡有名字但沒有認得的燈：只幫他填名字，不說「樞理建議」；# 後面太長（超過 2000 字）當作壞掉。
//    - 同一頁換了 # （貼了另一個人的連結）：整頁重新讀。
//    - 登記好：鍵盤移到「已登記」。（原本的跳出視窗已經拿掉，見第 3 點）
//    - 在名字欄按 Enter 不會送出（避免不小心登記）。
// 9. 2026-11-24 使用者：「往年信眾就可以只給名字，新信眾就要填農曆生日和地址」。
//    - 樞理做連結時勾「新信眾」：連結帶著這個記號。沒有專屬連結的人當作新信眾。
//    - 新信眾：名字下面多出「農曆生日」（民國年、月、日，可以勾閏月）和「地址」，都要填才能往下（說哪裡沒填）。
//      往年信眾：看不到這兩欄，只確認名字。
//    - 生日寫成「民國70年 農曆閏四月初五」；年份從民國 1 年到今年，月 1～12，日 1～30；不對就不送。地址最多 120 字。
//    - 業界比較：業界的表單每個人都要填生日和地址；我們只有新信眾要填，往年信眾還是只要按兩下。
// 10. 2026-11-24 使用者：「新信眾出生的時辰也要，可以勾不知道」。
//    - 農曆生日下面多一個「時辰」選單（子時到亥時，旁邊寫幾點到幾點），旁邊有「不知道」可以勾（勾了選單就不能選）。
//    - 要嘛選一個時辰、要嘛勾不知道，不然不能往下（說「請選出生的時辰，不知道就勾「不知道」」）。
//    - 試算表的農曆生日寫成「民國70年 農曆閏四月初五 子時」或「民國70年 農曆閏四月初五 吉時」（使用者：「不知道到時候就會變成吉時」）。
// 11. 2026-11-24 使用者：「待填不是應該要讓樞理親自填嗎」「要以樞理方便為主」→ 名目由樞理自己填，兩個地方都能改：
//    - 名目存在 Google 試算表的「燈的名目」分頁（第一列：大燈、小燈；下面各最多 6 格）。兩頁打開時都去讀最新的。
//    - 做連結的頁最上面有「燈的名目」：輸入密碼 →「打開編輯」→ 大燈 6 格、小燈 6 格 →「存好」。存好後下面勾燈的地方馬上換新。
//      密碼由樞理自己在試算表的「設定」分頁 B1 打（不用碰程式）；還沒設密碼：說「請先在試算表的「設定」分頁設定密碼」。
//      密碼連錯 10 次：10 分鐘內不能再試（擋亂猜）。
//    - 每個名目最多 20 字；同一種燈不能有兩個一樣的名目；空的格子不算。不對的話說哪裡不對，不存。
//    - 讀不到名目（網路、Google 一時連不上）：說「燈的名目讀不到，請重新整理再試」，不能往下。
//      樞理還沒填任何名目：登記頁說「樞理還沒填好燈的名目」；做連結的頁說「還沒有名目，請先在上面填好」。
//    - 試用模式：試算表還沒開通（js/lamp.js 的 SHEET_URL 是空的）時，兩頁最上面寫「試用模式」：
//      名目只存在這台手機或電腦，密碼是 1234，登記不會真的送出（「已登記」旁邊寫「試用，沒有真的送出」）。開通後試用模式自動消失。
// 12. 2026-11-24 Codex 審查（名目）：
//    - 名目讀好以前不能按「打開編輯」；打開時重新讀一次最新的才放進格子（不會把空格子存回去、洗掉全部名目）。
//    - 按「打開編輯」、「存好」的時候，按鈕和格子先鎖住，回來才放開（連按不會送好幾次、存檔中打的字不會不見）。
//    - 存好名目後，下面已經勾的燈還在的就保持勾著。
//    - 名目不能用 = + - @ 開頭（試算表會當成公式）。
//    - 密碼對了，錯的次數歸零；錯 10 次以後 10 分鐘內都不能試（樞理被擋時說「請 10 分鐘後再試」）。
//    - 登記時，試算表再檢查一次燈還在不在（樞理剛好改了名目）：不在就說「燈的名目剛剛改過，請重新整理再登記」。
//    - 試算表只認得 register、login、setLamps 三種要求，其他的不寫。
//    - 試用模式存不了（私密瀏覽）：說存不了，不假裝存好。
// 13. 2026-11-24 使用者：
//    - 「編輯模式按存好後，應該要縮回去」：名目存好了，編輯的格子收起來（要再改就再按「打開編輯」）。
//    - 「農曆生日年月日最上面的選項不應該出現，直接給一個預設值就好了」：年、月、日沒有「請選」那一格，
//      一打開就是民國60年、正月、初一（時辰還是要選，或勾不知道）。
//    - 「時辰如果選了，但是勾不知道，優先判斷為不知道」：兩個都有的時候，寫「吉時」。
//    - 「登記完為什麼還要有再送一次的選項？」：這是錯。「再送一次」只有沒送出去時才出現；
//      按鈕的樣式（display: inline-block）蓋過了 hidden，所以一直看得到 → 光明燈兩頁裡 hidden 一定藏起來。
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
//   d. 名目樞理自己在做連結的頁改（也可以直接改試算表），不用找人改程式；連結記名字不記格子，改名不會指錯燈。
//      使用者選「以樞理方便為主」。網頁上改是不是真的比改試算表方便，要等樞理用手機實際試過才算證明（Codex 的提醒）；
//      兩邊都能改，所以她覺得試算表比較順手也可以只用試算表。
// - 不做的：線上付款（使用者沒要，樞理自己收）；一個連結登記全家（先一人一個）；登入帳號（多一步，對長輩不友善）；
//   存在伺服器、會過期的連結代碼（要自己的伺服器，這個網站沒有）；擋機器人亂送（小道場風險低；被灌了再加）；
//   銀行等級的密碼（只是防路人亂改名目的小鎖）。
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";

const read = (f) => readFileSync(new URL(`../${f}`, import.meta.url), "utf8");
const exists = (f) => existsSync(new URL(`../${f}`, import.meta.url));
const load = async () => (exists("js/lamp.js") ? import("../js/lamp.js") : {});
const loadStore = async () => (exists("js/lamp-store.js") ? import("../js/lamp-store.js") : {});
const page = exists("lamp.html") ? read("lamp.html") : "";
const maker = exists("lamp-link.html") ? read("lamp-link.html") : "";
const view = exists("js/lamp-view.js") ? read("js/lamp-view.js") : "";
const makerView = exists("js/lamp-link-view.js") ? read("js/lamp-link-view.js") : "";
const gs = exists("tools/lamp-sheet.gs") ? read("tools/lamp-sheet.gs") : "";

const CAT = { big: ["光明", "事業"], small: ["健康", "學業"] };

test("6/11. the catalogue: big and small lamps, at most 6 names each, tidy names, labels from the key", async () => {
  const { SIZES, MAX_PER_SIZE, cleanCatalog, lampKey, lampLabel, keysOf } = await load();
  assert.deepEqual(SIZES, { big: "大燈", small: "小燈" });
  assert.equal(MAX_PER_SIZE, 6, "使用者：「各6」");
  assert.deepEqual(cleanCatalog({ big: [" 光明 ", "", "光明", "事業"], small: ["健康"] }), { big: ["光明", "事業"], small: ["健康"] }, "trimmed, blanks and repeats dropped");
  assert.equal(cleanCatalog({ big: Array.from({ length: 9 }, (_, i) => `燈${i}`), small: [] }).big.length, 6, "at most 6");
  assert.deepEqual(cleanCatalog(null), { big: [], small: [] }, "nothing: empty lists");
  assert.equal(cleanCatalog({ big: ["x".repeat(30)], small: [] }).big[0].length, 20, "names cut at 20");
  assert.equal(lampKey("big", "光明"), "big:光明");
  assert.equal(lampLabel("big:光明"), "大燈・光明");
  assert.equal(lampLabel("small:健康"), "小燈・健康");
  assert.equal(lampLabel("huge:光明"), null);
  assert.equal(lampLabel("big:"), null);
  assert.deepEqual(keysOf(CAT), ["big:光明", "big:事業", "small:健康", "small:學業"]);
});

test("11. 樞理's edit of the names is checked before it is saved", async () => {
  const { checkCatalogEdit } = await load();
  assert.deepEqual(checkCatalogEdit({ big: [" 光明", "", "事業"], small: ["健康"] }), { error: null, catalog: { big: ["光明", "事業"], small: ["健康"] } });
  assert.equal(checkCatalogEdit({ big: ["光明", "光明 "], small: [] }).error, "same", "two of the same name");
  assert.equal(checkCatalogEdit({ big: ["x".repeat(21)], small: [] }).error, "long", "longer than 20");
  assert.equal(checkCatalogEdit({ big: Array.from({ length: 7 }, (_, i) => `燈${i}`), small: [] }).error, "many", "more than 6");
  assert.equal(checkCatalogEdit({ big: [], small: ["健康", "健康"] }).error, "same", "small lamps too");
  for (const bad of ["=光明", "+光明", "-光明", "@光明"]) assert.equal(checkCatalogEdit({ big: [bad], small: [] }).error, "symbol", `12. ${bad}: not like a formula`);
});

test("2. the personal link carries the name and suggestions after #, Chinese included; broken links are handled", async () => {
  const { encodeLink, decodeLink, knownLamps } = await load();
  const s = ["big:光明", "small:健康"];
  const hash = encodeLink({ name: "王小明", suggested: s });
  assert.match(hash, /^#[A-Za-z0-9_-]+$/, "safe in a URL, after #");
  assert.doesNotMatch(hash, /王/, "not readable as plain text in the link");
  assert.deepEqual(decodeLink(hash), { name: "王小明", suggested: s, newcomer: false });
  // 被改壞
  assert.equal(decodeLink(""), null);
  assert.equal(decodeLink("#"), null);
  assert.equal(decodeLink("#!!!"), null);
  assert.equal(decodeLink("#" + "a".repeat(30)), null);
  assert.deepEqual(decodeLink(encodeLink({ name: " 林 ", suggested: ["big:光明", "huge:x", 5, "big:光明"] })), { name: "林", suggested: ["big:光明"], newcomer: false }, "bad lamps dropped, no repeats, name trimmed");
  assert.equal(decodeLink(encodeLink({ name: "   ", suggested: s })), null, "no name: no link");
  assert.equal(decodeLink(encodeLink({ name: "x".repeat(60), suggested: s })).name.length, 40, "names are cut at 40");
  assert.equal(decodeLink("#" + "A".repeat(2001)), null, "8. a huge # is treated as broken");
  // 11. 名目改了：連結裡已經沒有的燈丟掉
  assert.deepEqual(knownLamps(["big:光明", "big:舊名", "small:健康"], CAT), ["big:光明", "small:健康"]);
});

test("1. making a link: needs a name and at least one lamp from the current names", async () => {
  const { makeLink, decodeLink } = await load();
  const base = "https://example.test/cihui/lamp-link.html";
  const ok = makeLink({ name: "陳大文", suggested: ["big:光明"], base, catalog: CAT });
  assert.equal(ok.error, null);
  assert.match(ok.url, /^https:\/\/example\.test\/cihui\/lamp\.html#[A-Za-z0-9_-]+$/, "points at lamp.html next to the maker page");
  assert.match(ok.line, /^https:\/\/line\.me\/R\/msg\/text\/\?/, "can be sent with LINE");
  assert.ok(decodeURIComponent(ok.line).includes(ok.url), "the LINE message holds the link");
  assert.equal(makeLink({ name: " ", suggested: ["big:光明"], base, catalog: CAT }).error, "name");
  assert.equal(makeLink({ name: "陳大文", suggested: [], base, catalog: CAT }).error, "lamps");
  assert.equal(makeLink({ name: "陳大文", suggested: ["big:沒有這個"], base, catalog: CAT }).error, "lamps", "only current names");
  assert.equal(decodeLink(new URL(makeLink({ name: "新", suggested: ["big:光明"], newcomer: true, base, catalog: CAT }).url).hash).newcomer, true, "9. carries 新信眾");
});

test("5. what goes to the sheet: one tidy row, retry-safe id, nothing broken", async () => {
  const { buildEntry, SHEET_URL } = await load();
  assert.equal(typeof SHEET_URL, "string");
  const e = buildEntry({ name: " 王小明 ", lamps: ["big:光明", "small:健康"], suggested: ["big:光明"], id: "abc-1", catalog: CAT });
  assert.deepEqual(e, { action: "register", id: "abc-1", name: "王小明", newcomer: false, birth: "", address: "", followed: false, lamps: ["大燈・光明", "小燈・健康"], suggested: ["大燈・光明"] });
  assert.equal(buildEntry({ name: "王", lamps: ["small:健康", "big:光明"], suggested: ["big:光明", "small:健康"], id: "x", catalog: CAT }).followed, true, "same lamps in another order: followed");
  assert.equal(buildEntry({ name: "王", lamps: ["big:光明"], suggested: [], id: "x", catalog: CAT }).followed, false, "no suggestion: not 'followed'");
  assert.equal(buildEntry({ name: "", lamps: ["big:光明"], suggested: [], id: "x", catalog: CAT }), null, "no name: nothing to send");
  assert.equal(buildEntry({ name: "王", lamps: ["big:沒有"], suggested: [], id: "x", catalog: CAT }), null, "no real lamp: nothing to send");
});

test("9-10. newcomers also give their lunar birthday, hour and address; returning followers only the name", async () => {
  const { buildEntry, lunarBirth, HOURS } = await load();
  assert.equal(lunarBirth({ year: 70, month: 4, day: 5, leap: true, hour: 1, maxYear: 115 }), "民國70年 農曆閏四月初五 子時");
  assert.equal(lunarBirth({ year: 115, month: 12, day: 30, leap: false, hour: 12, maxYear: 115 }), "民國115年 農曆十二月三十 亥時");
  assert.equal(lunarBirth({ year: 70, month: 4, day: 5, hourUnknown: true, maxYear: 115 }), "民國70年 農曆四月初五 吉時");
  assert.equal(lunarBirth({ year: 70, month: 4, day: 5, hour: 3, hourUnknown: true, maxYear: 115 }), "民國70年 農曆四月初五 吉時", "13. picked an hour but ticked 不知道: 不知道 wins");
  for (const hour of [undefined, 0, 13, 1.5]) assert.equal(lunarBirth({ year: 70, month: 4, day: 5, hour, maxYear: 115 }), null, `10. hour ${hour}: must pick one or tick 不知道`);
  for (const bad of [{ year: 0, month: 1, day: 1, hour: 1 }, { year: 116, month: 1, day: 1, hour: 1 }, { year: 70, month: 13, day: 1, hour: 1 }, { year: 70, month: 1, day: 31, hour: 1 }, { year: "七十", month: 1, day: 1, hour: 1 }, {}])
    assert.equal(lunarBirth({ ...bad, maxYear: 115 }), null, JSON.stringify(bad));
  assert.deepEqual(HOURS.map((h) => h.name), ["子時", "丑時", "寅時", "卯時", "辰時", "巳時", "午時", "未時", "申時", "酉時", "戌時", "亥時"]);
  assert.equal(HOURS[0].time, "晚上11點～凌晨1點");
  assert.equal(HOURS[6].time, "中午11點～下午1點");
  const birth = { year: 70, month: 4, day: 5, leap: false, hour: 7 };
  const base = { name: "新", lamps: ["big:光明"], suggested: [], id: "n1", catalog: CAT };
  const n = buildEntry({ ...base, newcomer: true, birth, address: " 台北市中正區 " });
  assert.equal(n.newcomer, true);
  assert.equal(n.birth, "民國70年 農曆四月初五 午時");
  assert.equal(n.address, "台北市中正區");
  assert.equal(buildEntry({ ...base, newcomer: true, birth, address: "  " }), null, "newcomer without address: not sent");
  assert.equal(buildEntry({ ...base, newcomer: true, birth: { year: 70, month: 13, day: 1, hour: 1 }, address: "台北" }), null, "bad birthday: not sent");
  assert.equal(buildEntry({ ...base, newcomer: true, birth, address: "地".repeat(200) }).address.length, 120);
  const r = buildEntry({ ...base, newcomer: false, birth, address: "台北" });
  assert.equal(r.birth, "", "returning followers: no birthday sent");
  assert.equal(r.address, "", "returning followers: no address sent");
});

test("11. reading and saving through the sheet, or the 試用模式 before it is set up", async () => {
  const { createStore } = await loadStore();
  assert.equal(typeof createStore, "function");
  const { DEMO_PASSWORD } = await load();
  // 試用模式：網址是空的
  const box = new Map();
  const storage = { getItem: (k) => box.get(k) ?? null, setItem: (k, v) => box.set(k, String(v)) };
  const demo = createStore({ url: "", storage });
  assert.equal(demo.demo, true);
  const first = await demo.loadCatalog();
  assert.equal(first.big.length, 6, "試用: six 待填 places to start");
  assert.match(first.big[0], /待填/);
  assert.equal(DEMO_PASSWORD, "1234");
  assert.deepEqual(await demo.checkPassword("0000"), { ok: false, error: "password" });
  assert.deepEqual(await demo.checkPassword("1234"), { ok: true });
  assert.equal((await demo.saveCatalog("0000", CAT)).ok, false, "wrong password: not saved");
  assert.deepEqual(await demo.saveCatalog("1234", CAT), { ok: true });
  assert.deepEqual(await demo.loadCatalog(), CAT, "試用: kept on this device");
  assert.deepEqual(await demo.register({ action: "register", id: "x" }), { ok: true, demo: true }, "試用: nothing is really sent");
  // 12. 存不了（私密瀏覽）：不假裝存好
  const broken = createStore({ url: "", storage: { getItem: () => null, setItem: () => { throw new Error("full"); } } });
  assert.deepEqual(await broken.saveCatalog("1234", CAT), { ok: false, error: "storage" });
  assert.deepEqual(await createStore({ url: "", storage: null }).saveCatalog("1234", CAT), { ok: false, error: "storage" });
  // 開通以後：照網址跟試算表講話
  const calls = [];
  const fetchFn = async (url, opts = {}) => {
    calls.push({ url, method: opts.method ?? "GET", body: opts.body ? JSON.parse(opts.body) : null });
    const reply = url.includes("action=lamps") ? { ok: true, big: [" 光明 ", "光明"], small: ["健康"] } : { ok: true };
    return { json: async () => reply };
  };
  const real = createStore({ url: "https://script.test/exec", fetchFn, storage });
  assert.equal(real.demo, false);
  assert.deepEqual(await real.loadCatalog(), { big: ["光明"], small: ["健康"] }, "tidied after reading");
  assert.deepEqual(calls.at(-1), { url: "https://script.test/exec?action=lamps", method: "GET", body: null });
  await real.checkPassword("pw");
  assert.deepEqual(calls.at(-1).body, { action: "login", password: "pw" });
  await real.saveCatalog("pw", CAT);
  assert.deepEqual(calls.at(-1).body, { action: "setLamps", password: "pw", big: CAT.big, small: CAT.small });
  await real.register({ action: "register", id: "r1" });
  assert.deepEqual(calls.at(-1), { url: "https://script.test/exec", method: "POST", body: { action: "register", id: "r1" } });
});

test("3-4. the page: name filled from the link, choose 照建議 or 自己選 right away, review only when choosing yourself", () => {
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
  assert.match(page, /<script type="module" src="js\/lamp-view.js"><\/script>/);
  assert.doesNotMatch(page, /師姐/, "the page says 樞理");
  assert.match(page, /<input[^>]*id="lampName"[^>]*autocomplete="name"/, "a name box");
  // 一開始就選：照建議、自己選（沒有「確認」按鈕、沒有跳出視窗）
  assert.doesNotMatch(page, /<dialog/, "no pop-up window any more");
  assert.doesNotMatch(page, /id="lampConfirm"/, "no 確認 button first");
  const choice = page.match(/<div class="lamp-suggest" id="lampSuggest" hidden>[\s\S]*?<\/div>\s*<\/div>/)?.[0] ?? "";
  assert.match(choice, /要照樞理的建議點這幾盞燈嗎？/, "the question sits with the suggestion");
  assert.match(choice, /id="lampYes"[^>]*>是，照建議登記/);
  assert.match(choice, /id="lampNo"[^>]*>否，我自己選/);
  // 自己選：選燈 → 檢查一次 → 送出
  assert.match(page, /<section id="lampChooser" hidden>[\s\S]*id="lampNext"[^>]*>下一步：檢查一次/);
  assert.match(page, /<section id="lampReview" hidden>[\s\S]*<h2 id="lampReviewTitle" tabindex="-1">請檢查一次<\/h2>[\s\S]*id="lampSend"[^>]*>送出登記[\s\S]*id="lampBack"[^>]*>回去修改/);
  // 程式
  assert.match(view, /decodeLink\(location\.hash\)/, "reads the link");
  assert.match(view, /\$\("lampYes"\)\.addEventListener\("click", \(\) => \{[\s\S]{0,200}missingField\(\)[\s\S]{0,200}submit\(suggested\)/, "yes: check the details, then register right away");
  assert.match(view, /\$\("lampNo"\)\.addEventListener\("click", showChooser\)/, "no: choose lamps");
  assert.match(view, /\$\("lampNext"\)\.addEventListener\("click", showReview\)/, "next: review");
  assert.match(view, /function showReview\(\)[\s\S]{0,600}buildEntry\(/, "the review shows exactly what will be sent");
  assert.match(view, /\$\("lampSend"\)\.addEventListener\("click", \(\) => submit\(pickedLamps/, "送出登記 sends the picked lamps");
  assert.match(view, /\$\("lampBack"\)\.addEventListener\("click", backToEdit\)/);
  assert.match(view, /if \(!suggested\.length\) showChooser\(\)/, "4. no suggestion: the chooser is there from the start");
  assert.match(view, /renderLampTicks\(box, catalog, suggested\)/, "the suggestion is ticked to start with");
  assert.match(read("js/lamp-parts.js"), /tick\.checked = checked\.includes\(tick\.value\)/);
  assert.doesNotMatch(view, /key === "Enter"/, "Enter in the name box does not register");
  // 9-10. 新信眾的欄位
  assert.match(page, /<div class="lamp-newcomer" id="lampNewcomer" hidden>/, "the extra fields wait");
  for (const id of ["lampYear", "lampMonth", "lampDay", "lampHour"]) assert.match(page, new RegExp(`<select[^>]*id="${id}"`), id);
  assert.match(page, /<input[^>]*type="checkbox"[^>]*id="lampLeap"/, "leap month");
  assert.match(page, /<input[^>]*type="checkbox"[^>]*id="lampHourUnknown"[^>]*>\s*不知道/, "a 不知道 tick");
  assert.match(page, /<input[^>]*id="lampAddress"[^>]*autocomplete="street-address"/);
  assert.match(view, /\$\("lampHour"\)\.disabled = \$\("lampHourUnknown"\)\.checked/, "ticking 不知道 turns the menu off");
  assert.match(view, /請選出生的時辰，不知道就勾「不知道」/);
  // 13. 年月日沒有「請選」那一格，一打開就有預設值；時辰還是要選
  assert.match(view, /const BIRTH_DEFAULT = \{ year: 60, month: 1, day: 1 \};/);
  assert.doesNotMatch(view, /"民國　年"|option\(\$\("lampMonth"\), "", |option\(\$\("lampDay"\), "", /, "no empty first choice for year, month, day");
  assert.match(view, /option\(\$\("lampHour"\), "", "時辰"\)/, "the hour still needs picking");
  assert.match(view, /\$\("lampYear"\)\.value = BIRTH_DEFAULT\.year/);
  assert.match(view, /const newcomer = link \? link\.newcomer : true;/, "no link: treated as a newcomer");
  assert.match(view, /\$\("lampNewcomer"\)\.hidden = !newcomer/);
  assert.match(view, /請填農曆生日/);
  assert.match(view, /請填地址/);
});

test("5/8. sending: one press, frozen retry, clear result; the page's review fixes", () => {
  assert.match(view, /store\.register\(frozen\)/, "a retry sends exactly the same");
  assert.match(view, /frozen \?\?= entry/, "the first sent entry is kept");
  assert.match(view, /\.disabled = busy/);
  assert.match(view, /setBusy\(true\);[\s\S]{0,80}送出中/, "no double presses while sending");
  assert.match(view, /已登記/);
  assert.match(view, /沒有送出去/);
  assert.match(view, /randomUUID/, "one id per registration, kept for a retry");
  assert.match(view, /function lockForm\(\)[\s\S]{0,300}nameInput\.disabled = true/, "name and ticks are locked once sent");
  assert.match(view, /addEventListener\("hashchange", \(\) => location\.reload\(\)\)/);
  assert.match(view, /\$\("lampDoneTitle"\)\.focus\(\)/, "after registering, focus moves to the result");
  assert.match(view, /\$\("lampReviewTitle"\)\.focus\(\)/, "the review gets the focus");
  // 13. 「再送一次」平常藏著：按鈕的 display 不能蓋過 hidden
  assert.match(page, /<button class="lamp-btn" id="lampRetry" type="button" hidden>再送一次<\/button>/);
  assert.match(read("pages.css"), /\.lamp \[hidden\]\s*\{\s*display:\s*none !important;/, "hidden always hides on the lamp pages");
  assert.match(view, /suggested\.length \? "樞理已經幫您填好名字/, "only says 樞理 suggested when there is a suggestion");
});

test("11. both pages read the names from the sheet, say when they can't, and show 試用模式", () => {
  for (const [name, html, js] of [["lamp", page, view], ["maker", maker, makerView]]) {
    assert.match(html, /<p class="lamp-demo" id="lampDemo" hidden>[^<]*試用模式/, `${name}: a 試用模式 note`);
    assert.match(js, /createStore\(\)/, `${name}: one place to read and save`);
    assert.match(js, /\$\("lampDemo"\)\.hidden = !store\.demo/, `${name}: the note only in 試用模式`);
    assert.match(js, /await store\.loadCatalog\(\)/, `${name}: reads the names first`);
    assert.match(js, /燈的名目讀不到，請重新整理再試/, `${name}: says when it can't`);
  }
  assert.match(view, /樞理還沒填好燈的名目/);
  assert.match(view, /knownLamps\(link\?\.suggested/, "old links only keep lamps that still exist");
  assert.match(view, /試用，沒有真的送出/, "試用: says nothing was sent");
});

test("1/11. the link maker page for 樞理: names editor behind a password, then make links", () => {
  assert.ok(maker, "lamp-link.html exists");
  assert.match(maker, /<meta name="robots" content="noindex"/);
  assert.match(maker, /<title>做光明燈專屬連結 — 慈惠道場<\/title>/);
  assert.match(maker, /<script type="module" src="js\/lamp-link-view.js"><\/script>/);
  assert.doesNotMatch(maker, /師姐/);
  assert.match(maker, /<input[^>]*type="checkbox"[^>]*id="makeNew"/, "9. 樞理 can mark a newcomer");
  assert.match(maker, /<input[^>]*type="password"[^>]*id="namesPassword"/, "a password box");
  assert.match(maker, /id="namesOpen"[^>]*>打開編輯/);
  assert.match(maker, /id="namesSave"[^>]*>存好/);
  assert.ok(maker.indexOf('id="namesPassword"') < maker.indexOf('id="makeName"'), "the names editor is at the top");
  assert.match(makerView, /makeLink\(/);
  assert.match(makerView, /clipboard\.writeText/, "copy the link");
  assert.match(makerView, /newcomer: \$\("makeNew"\)\.checked/);
  assert.match(makerView, /addEventListener\("input", hideOut\)/, "changing the name or ticks hides the old link");
  assert.match(makerView, /makeFor/, "says who the link is for");
  assert.match(makerView, /store\.checkPassword\(/);
  assert.match(makerView, /checkCatalogEdit\(/, "checks the names before saving");
  assert.match(makerView, /store\.saveCatalog\(/);
  assert.match(makerView, /請先在試算表的「設定」分頁設定密碼/);
  assert.match(makerView, /還沒有名目，請先在上面填好/);
  assert.match(makerView, /renderTicks\(\)/, "after saving, the ticks show the new names");
  assert.match(makerView, /renderTicks\(\);[^\n]*\n\s*\$\("namesEditor"\)\.hidden = true;/, "13. after saving, the editor folds away");
  // 12. Codex
  assert.match(maker, /id="namesOpen"[^>]*disabled/, "can't open the editor before the names are read");
  assert.match(makerView, /\$\("namesOpen"\)\.disabled = false/);
  assert.match(makerView, /async function openEditor\(\)[\s\S]{0,300}catalog = await store\.loadCatalog\(\)/, "reads the latest names before filling the boxes");
  assert.match(makerView, /if \(busy\) return;/, "no double presses");
  assert.match(makerView, /function setEditorBusy\(on\)[\s\S]{0,300}input\.disabled = on/, "the boxes are locked while saving");
  assert.match(makerView, /const keep = pickedLamps\(\$\("lampGroups"\)\)/, "ticks that still exist stay ticked");
  assert.match(makerView, /symbol:/, "says why a name can't start with = + - @");
  assert.match(makerView, /storage:/, "試用: says when it can't save");
  assert.match(view, /燈的名目剛剛改過，請重新整理再登記/, "the sheet says the names changed");
});

test("5/8/11. the Google Sheet script", () => {
  assert.ok(gs, "tools/lamp-sheet.gs exists");
  assert.match(gs, /function doPost\(e\)/);
  assert.match(gs, /function doGet\(e\)/, "11. the pages read the names");
  assert.match(gs, /LockService/, "two people at once don't overwrite each other");
  assert.match(gs, /appendRow\(/);
  assert.match(gs, /\^\[=\+\\-@\]/, "formula injection is blocked");
  assert.match(gs, /createTextOutput\(JSON\.stringify/, "answers so the page knows it worked");
  assert.match(gs, /createTextFinder\(id\)\.matchEntireCell\(true\)/, "checks every id, not the last 500");
  assert.match(gs, /SpreadsheetApp\.flush\(\)/);
  assert.match(gs, /lamps\.length > 20/);
  assert.match(gs, /\["時間", "姓名", "新信眾", "農曆生日", "地址", "照樞理建議", "登記的燈", "樞理建議的燈", "編號"\]/);
  // 11. 名目、密碼
  assert.match(gs, /const NAMES = "燈的名目"/);
  assert.match(gs, /const SETTINGS = "設定"/);
  assert.match(gs, /getRange\("B1"\)/, "the password is in 設定!B1");
  assert.match(gs, /action === "setLamps"/);
  assert.match(gs, /action === "login"/);
  assert.match(gs, /CacheService/, "10 wrong passwords: wait 10 minutes");
  assert.match(gs, /MAX_PER_SIZE = 6/);
  // 12. Codex
  assert.match(gs, /cache\.remove\("bad-tries"\)/, "a correct password clears the count");
  assert.match(gs, /if \(action === "register"\) return register\(data\);\s*return answer\(\{ ok: false, error: "unknown" \}\)/, "only three kinds of request");
  assert.match(gs, /error: "names changed"/, "registration checks the lamps against the current names");
  assert.match(gs, /\^\[=\+\\-@\][\s\S]{0,40}return null|startsLikeFormula/, "names can't start like a formula");
});
