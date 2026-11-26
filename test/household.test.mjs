// 光明燈「一戶一個連結」（lamp-admin.html、household.html）。計算在 js/household.js。
// 2026-11-26 使用者：
//   「Excel 匯入信眾與家戶資料 → 系統自動建立各戶登記資料 → 產生專屬登記與付款連結
//    （須網頁註記，使用信用卡將自動於金流網頁上 +2.8% 手續費；轉帳可直接點擊即可複製匯款帳號）
//    → 信眾核對資料是否正確，點選確認即為同意 → 選擇支付方式並付款 → 核對款項並更新登記狀態」
//   價錢：大燈 3600、小燈 1200（原本說 1800，看到實際資料後確認是 1200）。戶號用 H001（第 6 點）。一戶一個連結。先做轉帳，綠界之後接。祭改「也要做，但不是這次，功能可以先做好」。
//   Excel：標題「（空白）生日 時辰 光明燈項目 生肖 祭改項目 地址 收費日 金額 總計」；一盞燈一列；
//   「每列都寫地址，同地址就是一家，甚至有的地址不一樣，只有順序排在一起」。
//
// 規格：
// 1. 匯入：找有「地址」或「光明燈」的標題列；名字那欄沒標題就當第一欄；名字空白的列 = 上一個人的下一盞燈。
// 2. 分戶先猜：地址換了（不算空白、臺/台）就是下一戶；同一個人的燈不會被分開。樞理在畫面上「併到上一戶」「從這裡分開」。
// 3. 大燈小燈：名目裡有就照名目；沒有就看 Excel 金額（3600 大、1800 小）；都不知道要樞理選，沒選完不能建立。
// 4. 錢：光明燈照大小；祭改沒設價錢 = 另計（不算進去）。信用卡金額 = 應付 × 1.028 四捨五入。試算表那邊重算，不信網頁送的。
// 5. 連結 household.html#h=編號（隨機 20 字）；信眾頁：待確認 →「資料正確，我同意」→ 已確認：轉帳（點帳號複製、填末五碼）
//    / 信用卡（寫著加 2.8%，綠界還沒接：即將開放）→ 已回報付款 → 樞理按「已收到款項」→ 已付款。
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  findHeader,
  readRows,
  guessBreaks,
  guessSize,
  guessSizes,
  hasHids,
  groupHouseholds,
  checkImport,
  householdTotal,
  amountMismatch,
  cardAmount,
  cleanLast5,
  householdLink,
  readHouseholdHash,
  personLines
} from "../js/household.js";

const HEAD = ["", "生 日", "時辰", "光明燈項目", "生肖", "祭改項目", "地　　址", "收費日", "金額", "總計"];
const row = (name, lamp, address, amount = "", jigai = "") => [name, "", "", lamp, "", jigai, address, "", amount, ""];

test("1. 找標題列：空白、全形空白不算；名字欄沒標題就是第一欄", () => {
  const h = findHeader([["115年光明燈名冊"], HEAD]); // 最上面的大標題不能當成標題列
  assert.equal(h.at, 1);
  assert.deepEqual([h.cols.name, h.cols.birth, h.cols.lamp, h.cols.jigai, h.cols.address, h.cols.amount], [0, 1, 3, 5, 6, 8]);
  assert.equal(findHeader([["隨便"], ["什麼"]]), null);
});

test("1. 截圖那一列讀得出來", () => {
  const { records, error } = readRows([HEAD, row("範例工業(股)", "生意興隆", "彰化縣某鄉某某路1巷2號", "3600")]);
  assert.equal(error, null);
  assert.equal(records[0].name, "範例工業(股)");
  assert.deepEqual(records[0].lamps, ["生意興隆"]);
  assert.equal(records[0].amount, 3600);
  assert.equal(records[0].row, 2);
});

test("1. 名字空白 = 同一個人的下一盞燈；沒燈的列跳過", () => {
  const { records } = readRows([HEAD, row("王大明", "光明", "台中市1號", "3600"), row("", "元辰", "", "1800"), row("小計", "", "", "5400")]);
  assert.equal(records.length, 2);
  assert.equal(records[1].name, "王大明");
  assert.equal(records[1].address, "台中市1號");
  assert.equal(records[1].continued, true);
});

test("2. 分戶：地址換了就是下一戶，同一個人不分開，臺台算一樣", () => {
  const { records } = readRows([
    HEAD,
    row("王大明", "光明", "臺中市1號"),
    row("", "元辰", ""),
    row("王小美", "光明", "台中市 1號"),
    row("李四", "光明", "台北市2號"),
    row("李四", "財神", "台北市3號")
  ]);
  assert.deepEqual(guessBreaks(records), [true, false, false, true, false]);
});

test("3. 大小：先看金額（3600 大、1200 小），沒寫金額才照名目，都不知道 null", () => {
  const catalog = { big: ["光明"], small: ["元辰"] };
  assert.equal(guessSize("光明", 1200, catalog), "small"); // 實際資料同一個名目有大有小：金額說了算
  assert.equal(guessSize("生意興隆", 3600, catalog), "big");
  assert.equal(guessSize("生意興隆", 1200, catalog), "small");
  assert.equal(guessSize("光明", null, catalog), "big");
  assert.equal(guessSize("光明", 1800, catalog), null); // 金額不認得：樞理選
  assert.equal(guessSize("生意興隆", null, catalog), null);
  // 一格寫兩盞：金額是加總的，不能拿來猜
  assert.deepEqual(guessSizes({ lamps: ["甲", "乙"], amount: 3600 }, catalog), [null, null]);
});

test("2-4. 分成一戶一戶、算錢、祭改另計", () => {
  const { records } = readRows([HEAD, row("王大明", "光明", "台中市1號", "3600", "太歲"), row("", "元辰", "", "1200"), row("王小美", "光明", "台中市5號", "3600")]);
  const breaks = [true, false, false]; // 樞理把王小美併進來
  const sizes = [["big"], ["small"], ["big"]];
  const homes = groupHouseholds(records, breaks, sizes);
  assert.equal(homes.length, 1);
  assert.equal(homes[0].name, "王大明");
  assert.equal(homes[0].address, "台中市1號");
  assert.equal(homes[0].people.length, 2);
  assert.deepEqual(homes[0].people[0].lamps, [
    { name: "光明", size: "big" },
    { name: "元辰", size: "small" }
  ]);
  assert.deepEqual(homes[0].people[0].jigai, ["太歲"]);
  assert.deepEqual(householdTotal(homes[0]), { lamps: 8400, jigai: 0, total: 8400 });
  assert.deepEqual(householdTotal(homes[0], { big: 3600, small: 1200, jigai: 500 }), { lamps: 8400, jigai: 500, total: 8900 });
  assert.equal(personLines(homes[0].people[0])[2].separate, true);
});

test("3. 還有燈沒選大小：不能建立", () => {
  const homes = [{ name: "甲", people: [{ name: "甲", lamps: [{ name: "x", size: null }], jigai: [] }] }];
  assert.deepEqual(checkImport(homes), { error: "size", at: 0 });
  homes[0].people[0].lamps[0].size = "small";
  assert.equal(checkImport(homes).error, null);
  assert.equal(checkImport([]).error, "empty");
});

test("3. Excel 金額跟系統算的不一樣：提醒", () => {
  assert.equal(amountMismatch({ amount: 3600, jigai: [] }, ["big"]), null);
  assert.deepEqual(amountMismatch({ amount: 3600, jigai: [] }, ["small"]), { excel: 3600, counted: 1200 });
  assert.equal(amountMismatch({ amount: null, jigai: [] }, ["small"]), null);
});

// 6. 實際資料（2026-11-26）：A 欄「輔助A」（名字＋數字）、名字在後面沒有標題的欄；樞理加了「戶號」「分戶疑問」在最前面
const REAL = ["戶號", "分戶疑問", "輔助A", "", "生  日  ", "時辰", "光明燈項目", "生肖", "逢九(隱藏)", "祭改項目", "", "地             址", "升學&就業", "收費日", "金額", "總計"];
const real = (hid, name, lamp, addr, amount) => [hid, "", `${name}1`, name, "60.01.01", "子", lamp, "羊", "", "太歲當頭 安太歲", "", addr, "", "", amount, "3600"];

test("6. 實際檔案：輔助A 不是名字，名字是沒有標題的那欄；戶號讀得到", () => {
  const h = findHeader([["116年光明燈道親資料"], REAL]);
  assert.deepEqual([h.cols.hid, h.cols.name, h.cols.lamp, h.cols.address, h.cols.amount], [0, 3, 6, 11, 14]);
  const { records } = readRows([["116年光明燈道親資料"], REAL, real("h001", "王秀英", "家運昌隆", "彰化1號", "3600")]);
  assert.equal(records[0].name, "王秀英");
  assert.equal(records[0].hid, "H001");
  // 沒有戶號欄的原始檔：A 欄輔助A、B 欄名字
  const orig = REAL.slice(2);
  assert.equal(findHeader([orig]).cols.name, 1);
});

test("6. 有戶號：照戶號分戶（沒排在一起也是同一戶），沒戶號的戶擋下來", () => {
  const { records } = readRows([
    REAL,
    real("H001", "王秀英", "家運昌隆", "彰化1號", "3600"),
    real("H001", "王秀英", "身體健康", "彰化1號", "1200"),
    real("H002", "陳阿美", "元神光采", "苗栗", "1200"),
    real("H001", "林志強", "家運康泰", "日本", "3600")
  ]);
  assert.equal(hasHids(records), true);
  const sizes = records.map((r) => guessSizes(r, {}));
  assert.deepEqual(sizes, [["big"], ["small"], ["small"], ["big"]]);
  const homes = groupHouseholds(records, guessBreaks(records), sizes);
  assert.deepEqual(homes.map((h) => [h.hid, h.people.map((p) => p.name), h.idx]), [
    ["H001", ["王秀英", "林志強"], [0, 1, 3]],
    ["H002", ["陳阿美"], [2]]
  ]);
  assert.equal(householdTotal(homes[0]).total, 8400);
  // 戶名是第一位「人」，不是公司
  const co = groupHouseholds(readRows([REAL, real("H009", "範例工業(股)公司", "生意興隆", "彰化", "3600"), real("H009", "王秀英", "家運昌隆", "彰化", "3600")]).records, [true, false], [["big"], ["big"]]);
  assert.equal(co[0].name, "王秀英");
  // 公司的生日、時辰是公式的 0：當作空白
  const zero = real("H009", "某公司", "生意興隆", "彰化", "3600");
  zero[4] = "0";
  zero[5] = "0";
  const z = readRows([REAL, zero]).records[0];
  assert.deepEqual([z.birth, z.hour], ["", ""]);
  assert.equal(checkImport(homes).error, null);
  homes[1].hid = "";
  assert.deepEqual(checkImport(homes), { error: "hid", at: 1 });
  homes[1].hid = "2";
  assert.deepEqual(checkImport(homes), { error: "hid", at: 1 });
});

test("4. 信用卡 +2.8%", () => {
  assert.equal(cardAmount(3600), 3701);
  assert.equal(cardAmount(5400), 5551);
});

test("5. 末五碼、連結", () => {
  assert.equal(cleanLast5(" 01234 "), "01234");
  assert.equal(cleanLast5("０１２３４"), "01234");
  assert.equal(cleanLast5("1234"), null);
  const url = householdLink("https://x.github.io/site/lamp-admin.html", "abcDEF1234567890");
  assert.equal(url, "https://x.github.io/site/household.html#h=abcDEF1234567890");
  assert.equal(readHouseholdHash(new URL(url).hash), "abcDEF1234567890");
  assert.equal(readHouseholdHash("#h=bad"), null);
});
