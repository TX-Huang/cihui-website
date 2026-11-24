// 光明燈登記 → Google 試算表（每登記一次，「登記」分頁多一列）。網站那邊在 js/lamp-view.js，規格在 test/lamp.test.mjs。
//
// 怎麼開通（大約 10 分鐘，用道場的 Google 帳號）：
// 1. 開一個新的 Google 試算表（例如叫「光明燈登記」）。
// 2. 上方選單「擴充功能」→「Apps Script」。把裡面原本的字全部刪掉，貼上這整個檔案，按儲存。
// 3. 右上角「部署」→「新增部署作業」→ 齒輪選「網頁應用程式」：
//    「執行身分」選「我」，「誰可以存取」選「所有人」→ 部署（第一次會要你授權，按允許）。
// 4. 複製它給的「網頁應用程式網址」（https://script.google.com/macros/s/…/exec），
//    貼到 js/lamp.js 的 SHEET_URL = "" 的引號中間。
// 以後改了這個檔：「部署」→「管理部署作業」→ 鉛筆 →「版本」選「新版本」→ 部署（網址不變）。

const SHEET = "登記";
const HEADER = ["時間", "姓名", "新信眾", "農曆生日", "地址", "照樞理建議", "登記的燈", "樞理建議的燈", "編號"];

// 開頭是 = + - @ 的字，試算表會當成公式：前面加 ' 變成一般的字
function cell(value) {
  const text = String(value == null ? "" : value).slice(0, 500);
  return /^[=+\-@]/.test(text) ? "'" + text : text;
}

function answer(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  let entry;
  try {
    entry = JSON.parse(e.postData.contents);
  } catch (err) {
    return answer({ ok: false, error: "bad json" });
  }
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
    const book = SpreadsheetApp.getActive();
    const sheet = book.getSheetByName(SHEET) || book.insertSheet(SHEET);
    if (sheet.getLastRow() === 0) sheet.appendRow(HEADER);
    // 同一個編號已經寫過（網路不穩又按了一次）：不再多一列（查整欄）
    const last = sheet.getLastRow();
    if (last > 1 && sheet.getRange(2, HEADER.length, last - 1, 1).createTextFinder(id).matchEntireCell(true).findNext()) {
      return answer({ ok: true, repeat: true });
    }
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
