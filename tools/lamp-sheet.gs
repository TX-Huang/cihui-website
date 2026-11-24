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
  return answer({ ok: false, error: "unknown" });
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
