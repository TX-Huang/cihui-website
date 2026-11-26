// 樞理的「光明燈各戶管理」（lamp-admin.html）：登入 → 匯入 Excel、檢查分戶 → 建立 → 每戶的連結、對帳。
// 計算在 js/household.js，讀寫試算表在 js/lamp-store.js（tools/lamp-sheet.gs）。
import { createStore } from "./lamp-store.js";
import {
  readRows,
  guessBreaks,
  guessSizes,
  groupHouseholds,
  checkImport,
  householdTotal,
  amountMismatch,
  money,
  householdLink,
  lineShare,
  SIZE_NAMES,
  STATUS,
  MAX_HOUSEHOLDS,
  MAX_LINES
} from "./household.js";

const $ = (id) => document.getElementById(id);
const store = createStore();
const SHEETJS = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
const ERRORS = {
  password: "密碼不對。",
  "no password": "請先在試算表的「設定」分頁設定密碼（B1 那一格）。",
  locked: "密碼錯太多次，請 10 分鐘後再試。",
  storage: "這台裝置不能存（可能是私密瀏覽）。",
  size: "有燈還沒選大燈或小燈。",
  invalid: "資料有不對的地方，請重新選檔案再試。",
  unknown: "試算表的程式還是舊的：請照 tools/lamp-sheet.gs 最上面的說明，貼上新版、部署「新版本」。"
};
let password = "";
let catalog = { big: [], small: [] };
let records = [];
let breaks = [];
let sizes = [];
let homes = [];
let busy = false;

const say = (id, text) => {
  $(id).textContent = text;
};
const el = (tag, props = {}, ...kids) => {
  const node = Object.assign(document.createElement(tag), props);
  node.append(...kids);
  return node;
};

// ── 登入 ──
async function login() {
  if (busy) return;
  busy = true;
  $("adminLogin").disabled = true;
  say("loginMsg", "確認密碼中…");
  try {
    const out = await store.checkPassword($("adminPassword").value);
    if (!out?.ok) return say("loginMsg", ERRORS[out?.error] ?? "密碼不對。");
    password = $("adminPassword").value;
    catalog = await store.loadCatalog().catch(() => catalog);
    $("adminTools").hidden = false;
    say("loginMsg", "已登入。");
    loadList();
  } catch {
    say("loginMsg", "連不上試算表，請稍後再試。");
  } finally {
    busy = false;
    $("adminLogin").disabled = false;
  }
}

// ── 匯入 Excel ──
function loadSheetJs() {
  if (globalThis.XLSX) return Promise.resolve(globalThis.XLSX);
  return new Promise((resolve, reject) => {
    const s = el("script", { src: SHEETJS, onload: () => resolve(globalThis.XLSX), onerror: reject });
    document.head.append(s);
  });
}

async function readFile(file) {
  const XLSX = await loadSheetJs();
  const book = XLSX.read(await file.arrayBuffer(), { type: "array", cellDates: false });
  // 第一個有「地址」或「光明燈」標題的工作表
  for (const name of book.SheetNames) {
    const rows = XLSX.utils.sheet_to_json(book.Sheets[name], { header: 1, raw: false, defval: "" });
    const out = readRows(rows);
    if (!out.error) return out;
  }
  return { records: [], error: "header" };
}

async function pickFile() {
  const file = $("excelFile").files?.[0];
  $("preview").hidden = true;
  if (!file) return;
  say("importMsg", "讀檔中…");
  try {
    const out = await readFile(file);
    if (out.error) return say("importMsg", "這個檔案找不到「光明燈項目」或「地址」的標題列，或是沒有任何一盞燈。");
    records = out.records;
    breaks = guessBreaks(records);
    sizes = records.map((r) => guessSizes(r, catalog));
    say("importMsg", `讀到 ${records.length} 列。請檢查下面的分戶和燈的大小。`);
    say("createMsg", "");
    renderPreview();
    $("preview").hidden = false;
  } catch {
    say("importMsg", "讀不了這個檔案（Excel 檔壞掉、或網路連不到 Excel 讀取工具）。");
  }
}

// 每戶是哪幾列：[[0,1,2],[3],…]
function groupsOfRows() {
  const out = [];
  records.forEach((_, i) => {
    if (breaks[i] || !out.length) out.push([]);
    out[out.length - 1].push(i);
  });
  return out;
}

function sizeSelect(i, j) {
  const select = el("select", { className: "lamp-input hh-size" });
  select.setAttribute("aria-label", `第 ${records[i].row} 列「${records[i].lamps[j]}」是大燈還是小燈`);
  select.append(new Option("選大小", ""), new Option(SIZE_NAMES.big, "big"), new Option(SIZE_NAMES.small, "small"));
  select.value = sizes[i][j] ?? "";
  if (!sizes[i][j]) select.classList.add("hh-missing");
  select.addEventListener("change", () => {
    sizes[i][j] = select.value || null;
    renderPreview();
  });
  return select;
}

function renderPreview() {
  homes = groupHouseholds(records, breaks, sizes);
  const groups = groupsOfRows();
  const unknown = sizes.flat().filter((s) => !s).length;
  say("previewSummary", `共 ${homes.length} 戶、${records.length} 列，合計 ${money(homes.reduce((n, h) => n + householdTotal(h).total, 0))}` + (unknown ? `；還有 ${unknown} 盞燈沒選大小` : ""));
  const list = $("previewList");
  list.replaceChildren();
  groups.forEach((rows, h) => {
    const home = homes[h];
    const card = el("div", { className: "hh-card" });
    card.append(el("p", { className: "hh-card-title" }, `第 ${h + 1} 戶：${home.name}（${home.people.length} 人）· ${money(householdTotal(home).total)}`));
    if (home.address) card.append(el("p", { className: "small hh-addr" }, home.address));
    for (const i of rows) {
      const r = records[i];
      const row = el("div", { className: "hh-row" });
      const who = el("span", { className: "hh-who" }, el("span", { className: "hh-rownum" }, `第 ${r.row} 列`), r.continued ? `（${r.name}）` : r.name);
      const lamps = el("span", { className: "hh-lamps" });
      r.lamps.forEach((n, j) => lamps.append(el("span", { className: "hh-lamp" }, n, sizeSelect(i, j))));
      for (const j of r.jigai) lamps.append(el("span", { className: "hh-lamp" }, `祭改・${j}`));
      row.append(who, lamps);
      if (r.address && r.address !== home.address) row.append(el("span", { className: "small hh-other-addr" }, r.address));
      const off = amountMismatch(r, sizes[i]);
      if (off) row.append(el("span", { className: "hh-warn" }, `Excel 金額 ${money(off.excel)}，系統算 ${money(off.counted)}`));
      // 分戶：每戶第一列可以併到上一戶；其他列可以從這裡分開（同一個人的第二盞燈不能跟他自己分開）
      const samePerson = i > 0 && (r.continued || r.name === records[i - 1].name);
      if (i > 0 && !samePerson) {
        const merge = breaks[i];
        const btn = el("button", { className: "lamp-btn lamp-btn-quiet hh-split", type: "button" }, merge ? "併到上一戶" : "從這裡分開");
        btn.addEventListener("click", () => {
          breaks[i] = !merge;
          renderPreview();
        });
        row.append(btn);
      }
      card.append(row);
    }
    list.append(card);
  });
}

async function createHomes() {
  if (busy) return;
  const check = checkImport(homes);
  if (check.error) {
    const msg = {
      empty: "沒有資料。",
      many: `一次最多 ${MAX_HOUSEHOLDS} 戶，請把 Excel 分成幾個檔案。`,
      lines: `第 ${check.at + 1} 戶超過 ${MAX_LINES} 列，可能分戶分錯了。`,
      size: `第 ${check.at + 1} 戶還有燈沒選大燈或小燈。`
    }[check.error];
    return say("createMsg", msg);
  }
  if (!confirm(`要建立 ${homes.length} 戶的登記資料嗎？（同一份 Excel 不要建兩次，會變成兩筆）`)) return;
  busy = true;
  $("createBtn").disabled = true;
  say("createMsg", "建立中…");
  try {
    const out = await store.importHouseholds(password, homes);
    if (!out?.ok) return say("createMsg", ERRORS[out?.error] ?? "沒有建好，請再試一次。");
    say("createMsg", "");
    say("importMsg", `建好了 ${out.made.length} 戶。下面可以複製每戶的連結，用 LINE 傳給那戶的負責人。`);
    $("preview").hidden = true;
    $("excelFile").value = "";
    await loadList();
  } catch {
    say("createMsg", "沒有建好（可能是網路不穩）。請先按下面的「重新整理」看看有沒有建好，沒有再按一次。");
  } finally {
    busy = false;
    $("createBtn").disabled = false;
  }
}

// ── 各戶連結和付款 ──
let listed = [];

async function loadList() {
  say("listMsg", "讀取中…");
  try {
    const out = await store.listHouseholds(password);
    if (!out?.ok) return say("listMsg", ERRORS[out?.error] ?? "讀不到。");
    listed = out.households;
    say("listMsg", "");
    renderList();
  } catch {
    say("listMsg", "讀不到，請稍後再按「重新整理」。");
  }
}

async function copyText(text, msgId) {
  try {
    await navigator.clipboard.writeText(text);
    say(msgId, "已複製連結。");
  } catch {
    prompt("請複製這個連結：", text);
  }
}

async function setPaid(id, paid, button) {
  if (!paid && !confirm("要改回「未收款」嗎？")) return;
  button.disabled = true;
  try {
    const out = await store.markPaid(password, id, paid);
    if (!out?.ok) return say("listMsg", ERRORS[out?.error] ?? "沒有改好，請再按一次。");
    const at = listed.findIndex((h) => h.id === id);
    if (at >= 0) listed[at] = { ...listed[at], ...out.household };
    renderList();
  } catch {
    say("listMsg", "沒有改好（可能是網路不穩），請再按一次。");
  } finally {
    button.disabled = false;
  }
}

function renderList() {
  const filter = $("statusFilter").value;
  const count = (s) => listed.filter((h) => h.status === s).length;
  say("listCounts", listed.length ? `共 ${listed.length} 戶：` + Object.values(STATUS).map((s) => `${s} ${count(s)}`).join("、") : "還沒有任何一戶。");
  const body = $("homeTable").tBodies[0];
  body.replaceChildren();
  for (const h of listed.filter((x) => !filter || x.status === filter)) {
    // ?demo=1 練習的時候，做出來的連結也要是練習的（不然信眾頁會去讀真的試算表）
    const url = householdLink(location.href, h.id).replace("#", location.search.includes("demo=1") ? "?demo=1#" : "#");
    const copy = el("button", { className: "lamp-btn lamp-btn-quiet hh-small-btn", type: "button" }, "複製");
    copy.addEventListener("click", () => copyText(url, "listMsg"));
    const line = el("a", { className: "lamp-btn lamp-btn-quiet hh-small-btn", href: lineShare(h.name, url), target: "_blank", rel: "noopener" }, "LINE");
    const open = el("a", { className: "lamp-btn lamp-btn-quiet hh-small-btn", href: url, target: "_blank", rel: "noopener" }, "看");
    const paid = h.status === STATUS.paid;
    const pay = el("button", { className: `lamp-btn hh-small-btn${paid ? " lamp-btn-quiet" : ""}`, type: "button" }, paid ? "改回未收" : "已收到款項");
    pay.addEventListener("click", () => setPaid(h.id, !paid, pay));
    const status = el("span", { className: `hh-status hh-status-${Object.keys(STATUS).find((k) => STATUS[k] === h.status) ?? "pending"}` }, h.status);
    body.append(
      el(
        "tr",
        {},
        el("td", {}, h.name),
        el("td", {}, String(h.people)),
        el("td", {}, money(h.total)),
        el("td", {}, status),
        el("td", {}, h.last5 || ""),
        el("td", { className: "hh-actions" }, copy, line, open),
        el("td", {}, pay)
      )
    );
  }
}

$("lampDemo").hidden = !store.demo;
$("adminLogin").addEventListener("click", login);
$("adminPassword").addEventListener("keydown", (e) => {
  if (e.key === "Enter") login();
});
$("excelFile").addEventListener("change", pickFile);
$("createBtn").addEventListener("click", createHomes);
$("refreshBtn").addEventListener("click", loadList);
$("statusFilter").addEventListener("change", renderList);
