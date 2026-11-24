// 光明燈登記頁（lamp.html）的畫面。計算在 js/lamp.js、讀寫試算表在 js/lamp-store.js，規格在 test/lamp.test.mjs。
// 專屬連結點進來：名字填好 → 確認 → 視窗問「要照樞理的建議嗎？」→ 是：直接登記；否：自己選燈。
// 新信眾（樞理勾的，或沒有專屬連結）：還要填農曆生日、時辰和地址。燈的名目每次打開都從試算表讀最新的。
import { HOURS, decodeLink, buildEntry, lampLabel, lunarBirth, thisRocYear, keysOf, knownLamps } from "./lamp.js";
import { createStore } from "./lamp-store.js";
import { renderLampTicks, pickedLamps, fillList } from "./lamp-parts.js";
import { lunarDate } from "./events.js";

const $ = (id) => document.getElementById(id);
const nameInput = $("lampName");
const ask = $("lampAsk");
const store = createStore();
const link = decodeLink(location.hash);
const newcomer = link ? link.newcomer : true;
const NEWCOMER_FIELDS = ["lampYear", "lampMonth", "lampDay", "lampLeap", "lampHour", "lampHourUnknown", "lampAddress"];
let catalog = { big: [], small: [] };
let suggested = []; // 讀到名目以後才知道：連結裡的燈，現在還有的
// 這次登記的編號：沒送成功再按一次，用同一個編號，試算表不會多一筆
const entryId = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
let frozen = null; // 第一次送出的那一筆：之後再送都送一模一樣的

// 農曆生日的選單：民國年（今年往前）、月、日、時辰
function option(select, value, text) {
  select.append(new Option(text, value));
}
function fillBirthSelects() {
  option($("lampYear"), "", "民國　年");
  for (let y = thisRocYear(); y >= 1; y--) option($("lampYear"), y, `民國${y}年（${y + 1911}）`);
  option($("lampMonth"), "", "月");
  for (let m = 1; m <= 12; m++) option($("lampMonth"), m, lunarDate(m, 1).slice(2, -2));
  option($("lampDay"), "", "日");
  for (let d = 1; d <= 30; d++) option($("lampDay"), d, lunarDate(1, d).slice(4));
  option($("lampHour"), "", "時辰");
  HOURS.forEach((h, i) => option($("lampHour"), i + 1, `${h.name}（${h.time}）`));
}
const readBirth = () => ({
  year: parseInt($("lampYear").value, 10),
  month: parseInt($("lampMonth").value, 10),
  day: parseInt($("lampDay").value, 10),
  leap: $("lampLeap").checked,
  hour: parseInt($("lampHour").value, 10),
  hourUnknown: $("lampHourUnknown").checked
});

function say(id, text) {
  $(id).textContent = text;
}

// 選燈的地方：大燈、小燈各一組勾選框，先勾好樞理建議的（js/lamp-parts.js）
function showChooser() {
  const box = $("lampGroups");
  if (!box.childElementCount) renderLampTicks(box, catalog, suggested);
  $("lampChooser").hidden = false;
  $("lampChooser").scrollIntoView({ behavior: "smooth", block: "start" });
  box.querySelector("input")?.focus({ preventScroll: true });
}

function setBusy(busy) {
  for (const id of ["lampYes", "lampSend", "lampRetry"]) $(id).disabled = busy;
}

// 送過一次就鎖住名字和勾選（再送一次只能送原本那一筆）
function lockForm() {
  nameInput.disabled = true;
  for (const id of NEWCOMER_FIELDS) $(id).disabled = true;
  $("lampConfirm").disabled = true;
  for (const t of $("lampGroups").querySelectorAll("input")) t.disabled = true;
}

// 送到 Google 試算表（js/lamp-store.js）；試用模式不會真的送出
async function submit(lamps) {
  const entry = frozen ?? buildEntry({ name: nameInput.value, lamps, suggested, id: entryId, newcomer, birth: readBirth(), address: $("lampAddress").value, catalog });
  $("lampRetry").hidden = true;
  if (!entry) return say("lampStatusText", "請確認您的資料，並至少選一盞燈。");
  frozen ??= entry;
  lockForm();
  setBusy(true);
  say("lampStatusText", "送出中…");
  try {
    const out = await store.register(frozen);
    if (out?.error === "names changed") return say("lampStatusText", "燈的名目剛剛改過，請重新整理再登記。");
    if (!out?.ok) throw new Error("not saved");
    done(frozen, out.demo);
  } catch {
    say("lampStatusText", "沒有送出去（可能是網路不穩）。請按「再送一次」，不會重複登記。");
    $("lampSend").hidden = true; // 只剩「再送一次」，送的是同一筆
    $("lampRetry").hidden = false;
    setBusy(false);
  }
}

function done(entry, demo) {
  for (const id of ["lampNameStep", "lampChooser"]) $(id).hidden = true;
  fillList($("lampDoneList"), entry.lamps);
  $("lampDoneDemo").hidden = !demo;
  $("lampDone").hidden = false;
  say("lampStatusText", demo ? "已登記（試用，沒有真的送出）。" : "已登記。"); // 讀螢幕軟體也聽得到
  $("lampDoneTitle").focus();
  $("lampDone").scrollIntoView({ behavior: "smooth", block: "start" });
}

// 還沒填好的第一欄：[說什麼, 跳到哪一欄]；都好了：null
function missingField() {
  if (!nameInput.value.trim()) return ["請填您的姓名。", nameInput];
  if (!newcomer) return null;
  const b = readBirth();
  if (!lunarBirth({ ...b, hourUnknown: true })) return ["請填農曆生日（年、月、日都要選）。", $("lampYear")];
  if (!lunarBirth(b)) return ["請選出生的時辰，不知道就勾「不知道」。", $("lampHour")];
  if (!$("lampAddress").value.trim()) return ["請填地址。", $("lampAddress")];
  return null;
}

function confirmName() {
  nameInput.value = nameInput.value.trim();
  const missing = missingField();
  if (missing) {
    say("lampNameMsg", missing[0]);
    missing[1].focus();
    return;
  }
  say("lampNameMsg", "");
  if (!suggested.length) return showChooser();
  fillList($("lampAskList"), suggested.map(lampLabel));
  ask.showModal(); // 鍵盤停在視窗的標題上（lamp.html 的 autofocus），不是「是」
}

function sendPicked() {
  const picked = pickedLamps($("lampGroups"));
  if (!frozen && !picked.length) return say("lampPickMsg", "請至少勾一盞燈。");
  say("lampPickMsg", "");
  submit(picked);
}

function showLink() {
  if (!link) return;
  nameInput.value = link.name;
  const more = newcomer ? "也請填農曆生日、時辰和地址。" : "";
  say("lampIntro", (suggested.length ? "樞理已經幫您填好名字，請確認是不是您。" : "名字已經填好，請確認是不是您，再選要點的燈。") + more);
  if (!suggested.length) return;
  fillList($("lampSuggestList"), suggested.map(lampLabel));
  $("lampSuggest").hidden = false;
}

// 先讀燈的名目（試算表）；讀不到、還沒填：說清楚，不能往下
async function start() {
  $("lampDemo").hidden = !store.demo;
  $("lampConfirm").disabled = true;
  if (link) nameInput.value = link.name;
  say("lampNameMsg", "正在讀燈的名目…");
  try {
    catalog = await store.loadCatalog();
  } catch {
    return say("lampNameMsg", "燈的名目讀不到，請重新整理再試。");
  }
  if (!keysOf(catalog).length) return say("lampNameMsg", "樞理還沒填好燈的名目，請晚一點再來。");
  suggested = knownLamps(link?.suggested, catalog);
  say("lampNameMsg", "");
  $("lampConfirm").disabled = false;
  showLink();
}

fillBirthSelects();
$("lampNewcomer").hidden = !newcomer;
// 勾「不知道」：時辰選單不能選（登記時寫「吉時」）
$("lampHourUnknown").addEventListener("change", () => {
  $("lampHour").disabled = $("lampHourUnknown").checked;
});
// 同一頁貼了另一個人的連結（只換 # 不會重新整理）：整頁重新讀
addEventListener("hashchange", () => location.reload());
$("lampConfirm").addEventListener("click", confirmName);
nameInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !$("lampConfirm").disabled) confirmName();
});
$("lampYes").addEventListener("click", () => {
  ask.close();
  submit(suggested);
});
$("lampNo").addEventListener("click", () => {
  ask.close();
  showChooser();
});
// 按 Esc 關掉視窗：還沒登記
ask.addEventListener("cancel", () => {
  say("lampNameMsg", "還沒登記。請再按一次「確認」。");
  setTimeout(() => $("lampConfirm").focus());
});
$("lampSend").addEventListener("click", sendPicked);
$("lampRetry").addEventListener("click", () => submit(frozen?.lamps ?? []));
start();
