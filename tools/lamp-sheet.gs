// 光明燈登記 ↔ Google 試算表。網站那邊在 js/lamp-store.js，規格在 test/lamp.test.mjs。
// 試算表有三個分頁（第一次用到時會自己建）：
//   「登記」：每登記一次多一列。
//   「燈的名目」：A 欄大燈、B 欄小燈，第 2～7 列各最多 6 個。樞理可以直接在這裡改，或在做連結的頁改。
//   「設定」：B1 那一格是改名目用的密碼（樞理自己打；空的就不能在網頁上改名目）。
//
// 怎麼開通（大約 10 分鐘，用道場的 Google 帳號）：
// 1. 開一個新的 Google 試算表（例如叫「光明燈登記」）。
// 2. 上方選單「擴充功能」→「Apps Script」。把裡面原本的字全部刪掉，貼上這整個檔案，按儲存。
// 3. 右上角「部署」→「新增部署作業」→ 齒輪選「網頁應用程式」：
//    「執行身分」選「我」，「誰可以存取」選「所有人」→ 部署（第一次會要你授權，按允許）。
// 4. 複製它給的「網頁應用程式網址」（https://script.google.com/macros/s/…/exec），
//    貼到 js/lamp.js 的 SHEET_URL = "" 的引號中間。
// 5. 回到試算表，在「設定」分頁的 B1 打一個密碼（樞理記得就好）。
// 以後改了這個檔：「部署」→「管理部署作業」→ 鉛筆 →「版本」選「新版本」→ 部署（網址不變）。
//
// 2026-11-26 加了「一戶一個連結」（樞理匯入 Excel → 每戶核對、付款）。多三個地方（第一次用到時自己建）：
//   「家戶」：一戶一列。「狀態」那欄可以直接用下拉選單改（待確認／已確認／已回報付款／已付款）。
//   「家戶明細」：每戶的每個人、每盞燈、每項祭改一列。
//   「設定」：A 欄名稱、B 欄值。第一次會自己補上：大燈價錢 3600、小燈價錢 1800、祭改價錢（空的＝另計）、
//            銀行名稱、銀行代碼、帳號、戶名、信用卡手續費 2.8%、收款條碼圖片網址。轉帳資料請樞理自己填。
//   （小燈原本寫 1800，實際是 1200：「設定」分頁如果已經自己補上 1800，請改成 1200）

const SHEET = "登記";
const NAMES = "燈的名目";
const SETTINGS = "設定";
const HEADER = ["時間", "姓名", "新信眾", "農曆生日", "地址", "照樞理建議", "登記的燈", "樞理建議的燈", "編號"];
const MAX_PER_SIZE = 6;
const LAMP_NAME_MAX = 20;
const MAX_TRIES = 10; // 密碼連錯 10 次：10 分鐘內不能再試

// 開頭是 = + - @ 的字，試算表會當成公式：前面加 ' 變成一般的字
function cell(value) {
  const text = String(value == null ? "" : value).slice(0, 500);
  return /^[=+\-@]/.test(text) ? "'" + text : text;
}

function answer(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}

function tab(name, firstRow) {
  const book = SpreadsheetApp.getActive();
  const sheet = book.getSheetByName(name) || book.insertSheet(name);
  if (firstRow && sheet.getLastRow() === 0) sheet.appendRow(firstRow);
  return sheet;
}

// 燈的名目：{ big: [...], small: [...] }（空的格子不算）
function readNames() {
  const sheet = tab(NAMES, ["大燈", "小燈"]);
  const rows = sheet.getRange(2, 1, MAX_PER_SIZE, 2).getDisplayValues();
  const column = (i) => rows.map((r) => String(r[i]).trim()).filter(Boolean);
  return { big: column(0), small: column(1) };
}

// 名目不能用 = + - @ 開頭（試算表會當成公式，讀回來也會多一個 '）
function startsLikeFormula(text) {
  return /^[=+\-@]/.test(text);
}

// 樞理改的名目：每種最多 6 個、每個最多 20 字、同一種不能重複、不能像公式；不對：null
function cleanNames(list) {
  const names = (Array.isArray(list) ? list : []).map((t) => String(t == null ? "" : t).trim()).filter(Boolean);
  const ok = names.length <= MAX_PER_SIZE && names.every((t) => t.length <= LAMP_NAME_MAX && !startsLikeFormula(t)) && new Set(names).size === names.length;
  return ok ? names : null;
}

// 現在有的燈，寫成登記頁送來的樣子（「大燈・光明」）
function currentLabels() {
  const names = readNames();
  return names.big.map((n) => "大燈・" + n).concat(names.small.map((n) => "小燈・" + n));
}

function writeNames(big, small) {
  const sheet = tab(NAMES, ["大燈", "小燈"]);
  const rows = [];
  for (let i = 0; i < MAX_PER_SIZE; i++) rows.push([big[i] || "", small[i] || ""]); // cleanNames 已經擋掉像公式的
  sheet.getRange(2, 1, MAX_PER_SIZE, 2).setValues(rows);
}

// 密碼：設定!B1。錯 10 次以後 10 分鐘內都不能試；對了就歸零。回傳 null（對）或錯誤代號。要在鎖裡面呼叫
function passwordProblem(typed) {
  const cache = CacheService.getScriptCache();
  const tries = Number(cache.get("bad-tries") || 0);
  if (tries >= MAX_TRIES) return "locked";
  const saved = String(tab(SETTINGS, ["密碼", ""]).getRange("B1").getDisplayValue()).trim();
  if (!saved) return "no password";
  if (String(typed || "") === saved) {
    cache.remove("bad-tries");
    return null;
  }
  cache.put("bad-tries", String(tries + 1), 600);
  return "password";
}

// 在鎖裡面做（兩個要求同時來，不會算錯次數、不會寫到同一列）
function locked(work) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    return work();
  } finally {
    lock.releaseLock();
  }
}

function doGet(e) {
  if (e && e.parameter && e.parameter.action === "lamps") {
    const names = readNames();
    return answer({ ok: true, big: names.big, small: names.small });
  }
  if (e && e.parameter && e.parameter.action === "household") return getHousehold(e.parameter.id);
  return answer({ ok: false, error: "unknown" });
}

function doPost(e) {
  let data;
  try {
    data = JSON.parse(e.postData.contents);
  } catch (err) {
    return answer({ ok: false, error: "bad json" });
  }
  const action = data.action;
  if (action === "login") return login(data);
  if (action === "setLamps") return setLamps(data);
  if (action === "register") return register(data);
  if (action === "importHouseholds") return importHouseholds(data);
  if (action === "listHouseholds") return listHouseholds(data);
  if (action === "markPaid") return markPaid(data);
  if (action === "confirmHousehold") return confirmHousehold(data);
  if (action === "reportPayment") return reportPayment(data);
  return answer({ ok: false, error: "unknown" });
}

// ── 一戶一個連結（2026-11-26） ──
const HOMES = "家戶";
// 編號：連結用的亂碼（信眾看不到別戶）；戶號：樞理用的 H001（一戶一個、永遠不改）
const HOME_HEADER = ["編號", "戶號", "戶名", "地址", "人數", "光明燈合計", "祭改合計", "應付金額", "狀態", "確認時間", "付款方式", "帳號末五碼", "回報付款時間", "已收款金額", "收款時間", "備註", "建立時間"];
const LINES = "家戶明細";
const LINE_HEADER = ["編號", "順序", "姓名", "生日", "時辰", "生肖", "地址", "類別", "項目", "大小", "金額"];
const STATUS = { pending: "待確認", confirmed: "已確認", reported: "已回報付款", paid: "已付款" };
const SIZE_NAMES = { big: "大燈", small: "小燈" };
const COL = {}; // 「家戶」每一欄是第幾欄（1 開始）
HOME_HEADER.forEach((h, i) => (COL[h] = i + 1));
// 設定分頁：A 欄名稱、B 欄值。沒有的自己補上（B1 原本就是密碼）
const SETTING_DEFAULTS = [
  ["密碼", ""],
  ["大燈價錢", 3600],
  ["小燈價錢", 1200],
  ["祭改價錢", ""],
  ["銀行名稱", ""],
  ["銀行代碼", ""],
  ["帳號", ""],
  ["戶名", ""],
  ["信用卡手續費", "2.8%"],
  ["收款條碼圖片網址", ""]
];

function readSettings() {
  const sheet = tab(SETTINGS, ["密碼", ""]);
  const last = Math.max(sheet.getLastRow(), 1);
  const rows = sheet.getRange(1, 1, last, 2).getDisplayValues();
  const map = {};
  rows.forEach((r) => (map[String(r[0]).trim()] = String(r[1]).trim()));
  const missing = SETTING_DEFAULTS.filter((d) => !(d[0] in map));
  if (missing.length) {
    sheet.getRange(last + 1, 1, missing.length, 2).setValues(missing);
    missing.forEach((d) => (map[d[0]] = String(d[1])));
  }
  return map;
}

const toNumber = (v) => {
  const n = Number(String(v || "").replace(/[^\d.]/g, ""));
  return isFinite(n) && n > 0 ? Math.round(n) : 0;
};

function prices(s) {
  const fee = Number(String(s["信用卡手續費"] || "").replace(/[^\d.]/g, ""));
  return { big: toNumber(s["大燈價錢"]), small: toNumber(s["小燈價錢"]), jigai: toNumber(s["祭改價錢"]), cardFee: isFinite(fee) ? fee / 100 : 0.028 };
}

// 給信眾看的付款資料（密碼不給）
function publicSettings(s) {
  return {
    prices: prices(s),
    bank: { name: s["銀行名稱"] || "", code: s["銀行代碼"] || "", account: s["帳號"] || "", holder: s["戶名"] || "" },
    qr: /^https:\/\//.test(s["收款條碼圖片網址"] || "") ? s["收款條碼圖片網址"] : ""
  };
}

function homesSheet() {
  const sheet = tab(HOMES, HOME_HEADER);
  // 狀態欄：下拉選單（樞理可以直接在試算表改）
  const range = sheet.getRange(2, COL["狀態"], sheet.getMaxRows() - 1, 1);
  if (!range.getDataValidation()) {
    range.setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList([STATUS.pending, STATUS.confirmed, STATUS.reported, STATUS.paid], true).build());
  }
  return sheet;
}

// 找某一戶在第幾列；沒有：0
function homeRow(sheet, id) {
  if (!/^[A-Za-z0-9_-]{8,64}$/.test(String(id || ""))) return 0;
  const last = sheet.getLastRow();
  if (last < 2) return 0;
  const hit = sheet.getRange(2, 1, last - 1, 1).createTextFinder(String(id)).matchEntireCell(true).findNext();
  return hit ? hit.getRow() : 0;
}

function homeFromRow(sheet, row) {
  return homeFromValues(sheet.getRange(row, 1, 1, HOME_HEADER.length).getDisplayValues()[0]);
}

function homeFromValues(v) {
  const get = (h) => v[COL[h] - 1];
  return {
    id: get("編號"),
    hid: get("戶號"),
    name: get("戶名"),
    address: get("地址"),
    people: Number(get("人數")) || 0,
    total: toNumber(get("應付金額")),
    status: get("狀態") || STATUS.pending,
    method: get("付款方式"),
    last5: get("帳號末五碼"),
    reportedAt: get("回報付款時間"),
    paidAt: get("收款時間")
  };
}

function getHousehold(id) {
  const sheet = homesSheet();
  const row = homeRow(sheet, id);
  if (!row) return answer({ ok: false, error: "not found" });
  const home = homeFromRow(sheet, row);
  const lines = tab(LINES, LINE_HEADER);
  const last = lines.getLastRow();
  const people = [];
  if (last > 1) {
    const all = lines.getRange(2, 1, last - 1, LINE_HEADER.length).getDisplayValues();
    all
      .filter((r) => r[0] === home.id)
      .sort((a, b) => Number(a[1]) - Number(b[1]))
      .forEach((r) => {
        let p = people.find((x) => x.name === r[2]);
        if (!p) {
          p = { name: r[2], birth: r[3], hour: r[4], zodiac: r[5], address: r[6], lamps: [], jigai: [] };
          people.push(p);
        }
        if (r[7] === "祭改") p.jigai.push(r[8]);
        else p.lamps.push({ name: r[8], size: r[9] === "小燈" ? "small" : "big" });
      });
  }
  home.people = people;
  return answer({ ok: true, household: home, settings: publicSettings(readSettings()) });
}

// 樞理匯入（要密碼）：每戶給一個隨機編號，錢在這裡重算（不信網頁送來的金額）
function importHouseholds(data) {
  const homes = Array.isArray(data.households) ? data.households : [];
  if (!homes.length || homes.length > 500) return answer({ ok: false, error: "invalid" });
  return locked(() => {
    const problem = passwordProblem(data.password);
    if (problem) return answer({ ok: false, error: problem });
    const p = prices(readSettings());
    // 戶號：有填就要是 H001 這種；同一批不能重複；已經建過的擋下來（樞理不小心匯入兩次）
    const hids = homes.map((h) => String(h.hid || "").trim().toUpperCase());
    if (hids.some((x) => x && !/^H\d{3,}$/.test(x))) return answer({ ok: false, error: "invalid" });
    if (new Set(hids.filter(Boolean)).size !== hids.filter(Boolean).length) return answer({ ok: false, error: "invalid" });
    const sheetNow = homesSheet();
    const lastNow = sheetNow.getLastRow();
    const existing = lastNow > 1 ? sheetNow.getRange(2, COL["戶號"], lastNow - 1, 1).getDisplayValues().map((r) => r[0]) : [];
    const already = hids.filter((x) => x && existing.indexOf(x) >= 0);
    if (already.length) return answer({ ok: false, error: "exists", hids: already });
    const homeRows = [];
    const lineRows = [];
    const made = [];
    const now = new Date();
    for (const h of homes) {
      const people = (Array.isArray(h.people) ? h.people : []).slice(0, 60);
      if (!people.length) return answer({ ok: false, error: "invalid" });
      const id = Utilities.getUuid().replace(/-/g, "").slice(0, 20);
      let lampSum = 0;
      let jigaiSum = 0;
      let order = 0;
      for (const person of people) {
        const base = [id, 0, cell(String(person.name || "").slice(0, 40)), cell(String(person.birth || "").slice(0, 40)), cell(String(person.hour || "").slice(0, 20)), cell(String(person.zodiac || "").slice(0, 10)), cell(String(person.address || "").slice(0, 120))];
        for (const l of (Array.isArray(person.lamps) ? person.lamps : []).slice(0, 60)) {
          if (!SIZE_NAMES[l.size]) return answer({ ok: false, error: "size" });
          const amount = p[l.size];
          lampSum += amount;
          lineRows.push(base.slice(0, 1).concat([++order], base.slice(2), ["光明燈", cell(String(l.name || "").slice(0, 20)), SIZE_NAMES[l.size], amount]));
        }
        for (const j of (Array.isArray(person.jigai) ? person.jigai : []).slice(0, 60)) {
          jigaiSum += p.jigai;
          lineRows.push(base.slice(0, 1).concat([++order], base.slice(2), ["祭改", cell(String(j || "").slice(0, 20)), "", p.jigai || "另計"]));
        }
      }
      const name = String(h.name || people[0].name || "").slice(0, 40);
      const row = HOME_HEADER.map(() => "");
      row[COL["編號"] - 1] = id;
      row[COL["戶號"] - 1] = String(h.hid || "").trim().toUpperCase();
      row[COL["戶名"] - 1] = cell(name);
      row[COL["地址"] - 1] = cell(String(h.address || "").slice(0, 120));
      row[COL["人數"] - 1] = people.length;
      row[COL["光明燈合計"] - 1] = lampSum;
      row[COL["祭改合計"] - 1] = jigaiSum;
      row[COL["應付金額"] - 1] = lampSum + jigaiSum;
      row[COL["狀態"] - 1] = STATUS.pending;
      row[COL["建立時間"] - 1] = now;
      homeRows.push(row);
      made.push({ id: id, hid: row[COL["戶號"] - 1], name: name });
    }
    const homeSheet = homesSheet();
    homeSheet.getRange(homeSheet.getLastRow() + 1, 1, homeRows.length, HOME_HEADER.length).setValues(homeRows);
    if (lineRows.length) {
      const lines = tab(LINES, LINE_HEADER);
      lines.getRange(lines.getLastRow() + 1, 1, lineRows.length, LINE_HEADER.length).setValues(lineRows);
    }
    SpreadsheetApp.flush();
    return answer({ ok: true, made: made });
  });
}

// 樞理看全部的戶（要密碼）
function listHouseholds(data) {
  return locked(() => {
    const problem = passwordProblem(data.password);
    if (problem) return answer({ ok: false, error: problem });
    const sheet = homesSheet();
    const last = sheet.getLastRow();
    const rows = last > 1 ? sheet.getRange(2, 1, last - 1, HOME_HEADER.length).getDisplayValues() : [];
    return answer({ ok: true, households: rows.map(homeFromValues).filter((h) => h.id) });
  });
}

// 樞理對好帳：已付款（paid: true）或改回去（paid: false：有回報過就回到「已回報付款」，不然「已確認」）
function markPaid(data) {
  return locked(() => {
    const problem = passwordProblem(data.password);
    if (problem) return answer({ ok: false, error: problem });
    const sheet = homesSheet();
    const row = homeRow(sheet, data.id);
    if (!row) return answer({ ok: false, error: "not found" });
    const home = homeFromRow(sheet, row);
    if (data.paid === true) {
      sheet.getRange(row, COL["狀態"]).setValue(STATUS.paid);
      sheet.getRange(row, COL["已收款金額"]).setValue(home.total);
      sheet.getRange(row, COL["收款時間"]).setValue(new Date());
    } else {
      sheet.getRange(row, COL["狀態"]).setValue(home.last5 ? STATUS.reported : STATUS.confirmed);
      sheet.getRange(row, COL["已收款金額"]).setValue("");
      sheet.getRange(row, COL["收款時間"]).setValue("");
    }
    SpreadsheetApp.flush();
    return answer({ ok: true, household: homeFromRow(sheet, row) });
  });
}

// 信眾按「資料正確，我同意」：待確認 → 已確認（已經確認過、付過：不動）
function confirmHousehold(data) {
  return locked(() => {
    const sheet = homesSheet();
    const row = homeRow(sheet, data.id);
    if (!row) return answer({ ok: false, error: "not found" });
    const home = homeFromRow(sheet, row);
    if (home.status === STATUS.pending) {
      sheet.getRange(row, COL["狀態"]).setValue(STATUS.confirmed);
      sheet.getRange(row, COL["確認時間"]).setValue(new Date());
      SpreadsheetApp.flush();
    }
    return answer({ ok: true, household: homeFromRow(sheet, row) });
  });
}

// 信眾轉帳後回報末五碼：已確認 → 已回報付款（還沒確認不行；已付款：不動）
function reportPayment(data) {
  const last5 = String(data.last5 || "");
  if (!/^\d{5}$/.test(last5)) return answer({ ok: false, error: "last5" });
  return locked(() => {
    const sheet = homesSheet();
    const row = homeRow(sheet, data.id);
    if (!row) return answer({ ok: false, error: "not found" });
    const home = homeFromRow(sheet, row);
    if (home.status === STATUS.pending) return answer({ ok: false, error: "not confirmed" });
    if (home.status !== STATUS.paid) {
      sheet.getRange(row, COL["狀態"]).setValue(STATUS.reported);
      sheet.getRange(row, COL["付款方式"]).setValue("轉帳");
      sheet.getRange(row, COL["帳號末五碼"]).setValue("'" + last5);
      sheet.getRange(row, COL["回報付款時間"]).setValue(new Date());
      SpreadsheetApp.flush();
    }
    return answer({ ok: true, household: homeFromRow(sheet, row) });
  });
}

function login(data) {
  return locked(() => {
    const problem = passwordProblem(data.password);
    return answer(problem ? { ok: false, error: problem } : { ok: true });
  });
}

function setLamps(data) {
  const big = cleanNames(data.big);
  const small = cleanNames(data.small);
  return locked(() => {
    const problem = passwordProblem(data.password);
    if (problem) return answer({ ok: false, error: problem });
    if (!big || !small) return answer({ ok: false, error: "invalid" });
    writeNames(big, small);
    SpreadsheetApp.flush();
    return answer({ ok: true });
  });
}

function register(entry) {
  const lamps = Array.isArray(entry.lamps) ? entry.lamps : [];
  const suggested = Array.isArray(entry.suggested) ? entry.suggested : [];
  const id = String(entry.id || "").slice(0, 64);
  const name = String(entry.name || "").trim().slice(0, 40);
  if (!name || !lamps.length || !id) return answer({ ok: false, error: "missing" });
  if (lamps.length > 20 || suggested.length > 20) return answer({ ok: false, error: "too many" });
  const tidy = (list) => list.map((t) => String(t).slice(0, 40)).join("、");

  const lock = LockService.getScriptLock(); // 兩個人同時登記，不會寫到同一列
  lock.waitLock(10000);
  try {
    const sheet = tab(SHEET, HEADER);
    // 同一個編號已經寫過（網路不穩又按了一次）：不再多一列（查整欄）
    const last = sheet.getLastRow();
    if (last > 1 && sheet.getRange(2, HEADER.length, last - 1, 1).createTextFinder(id).matchEntireCell(true).findNext()) {
      return answer({ ok: true, repeat: true });
    }
    // 登記的燈現在還有沒有（樞理剛好改了名目）：沒有就請他重新整理
    const now = currentLabels();
    if (!lamps.every((t) => now.indexOf(String(t)) >= 0)) return answer({ ok: false, error: "names changed" });
    const newcomer = entry.newcomer === true;
    const birth = newcomer ? String(entry.birth || "").slice(0, 40) : "";
    const address = newcomer ? String(entry.address || "").trim().slice(0, 120) : "";
    sheet.appendRow([new Date(), cell(name), newcomer ? "是" : "否", cell(birth), cell(address), entry.followed === true ? "是" : "否", cell(tidy(lamps)), cell(tidy(suggested)), cell(id)]);
    SpreadsheetApp.flush(); // 寫好了才放開鎖
    return answer({ ok: true });
  } finally {
    lock.releaseLock();
  }
}
