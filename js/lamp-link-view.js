// 樞理做光明燈專屬連結的頁（lamp-link.html）：最上面改燈的名目（要密碼），下面做每個人的連結。
// 計算在 js/lamp.js、讀寫試算表在 js/lamp-store.js，規格在 test/lamp.test.mjs。
import { SIZES, MAX_PER_SIZE, LAMP_NAME_MAX, makeLink, decodeLink, lampLabel, checkCatalogEdit } from "./lamp.js";
import { createStore } from "./lamp-store.js";
import { renderLampTicks, pickedLamps } from "./lamp-parts.js";

const $ = (id) => document.getElementById(id);
const store = createStore();
const MISSING = { name: "請填這個人的姓名。", lamps: "請至少勾一盞建議的燈。" };
// 試算表或檢查回來的錯誤 → 給樞理看的話
const NAME_ERRORS = {
  long: `每個名目最多 ${LAMP_NAME_MAX} 個字。`,
  many: `每種燈最多 ${MAX_PER_SIZE} 個名目。`,
  same: "同一種燈有兩個一樣的名目。",
  password: "密碼不對。",
  "no password": "請先在試算表的「設定」分頁設定密碼（B1 那一格）。",
  locked: "密碼錯太多次，請 10 分鐘後再試。",
  symbol: "名目不能用 = + - @ 開頭。",
  storage: "這台裝置不能存（可能是私密瀏覽），重新整理就不見了。",
  invalid: "名目有不對的地方，請檢查一下。"
};
const BOXES = { big: "namesBig", small: "namesSmall" };
let catalog = { big: [], small: [] };
let password = "";
let busy = false; // 正在確認密碼或存檔：先不接受下一次

const say = (id, text) => {
  $(id).textContent = text;
};

// 改了名字、勾選、或名目換了：舊的連結收起來（不會不小心把上一個人的連結傳出去），要重按「產生連結」
function hideOut() {
  $("makeOut").hidden = true;
}

// 建議點的燈：照現在的名目畫勾選框（已經勾的、名目還在的，保持勾著）
function renderTicks() {
  const keep = pickedLamps($("lampGroups"));
  const has = renderLampTicks($("lampGroups"), catalog, keep);
  say("ticksMsg", has ? "" : "還沒有名目，請先在上面填好。");
  hideOut();
}

// ── 燈的名目（要密碼） ──
function fillNameBoxes() {
  for (const [size, id] of Object.entries(BOXES)) {
    const box = $(id);
    box.replaceChildren();
    for (let i = 0; i < MAX_PER_SIZE; i++) {
      const input = document.createElement("input");
      input.className = "lamp-input";
      input.type = "text";
      input.maxLength = LAMP_NAME_MAX;
      input.value = catalog[size][i] ?? "";
      input.setAttribute("aria-label", `${SIZES[size]}第 ${i + 1} 個名目`);
      box.append(input);
    }
  }
}

// 確認密碼、存檔的時候：按鈕和格子先鎖住（連按不會送好幾次、存檔中打的字不會不見）
function setEditorBusy(on) {
  busy = on;
  for (const id of ["namesOpen", "namesSave", "namesPassword"]) $(id).disabled = on;
  for (const input of document.querySelectorAll("#namesEditor input")) input.disabled = on;
}

async function openEditor() {
  if (busy) return;
  const typed = $("namesPassword").value;
  setEditorBusy(true);
  say("namesMsg", "確認密碼中…");
  try {
    const out = await store.checkPassword(typed);
    if (!out?.ok) return say("namesMsg", NAME_ERRORS[out?.error] ?? "密碼不對。");
    catalog = await store.loadCatalog(); // 放進格子前再讀一次最新的（別人剛改過、或一開始沒讀到）
    password = typed;
    fillNameBoxes();
    renderTicks();
    $("namesEditor").hidden = false;
    say("namesMsg", "可以改了。空的格子不會出現。改好按「存好」。");
  } catch {
    say("namesMsg", "連不上試算表，請稍後再試。");
  } finally {
    setEditorBusy(false);
  }
  if (!$("namesEditor").hidden) $(BOXES.big).querySelector("input")?.focus();
}

async function saveNames() {
  if (busy) return;
  const typed = {};
  for (const [size, id] of Object.entries(BOXES)) typed[size] = [...$(id).querySelectorAll("input")].map((i) => i.value);
  const check = checkCatalogEdit(typed);
  if (check.error) return say("namesMsg", `${SIZES[check.size]}：${NAME_ERRORS[check.error]}`);
  setEditorBusy(true);
  say("namesMsg", "存檔中…");
  try {
    const out = await store.saveCatalog(password, check.catalog);
    if (!out?.ok) return say("namesMsg", NAME_ERRORS[out?.error] ?? "沒有存好，請再按一次。");
    catalog = check.catalog;
    fillNameBoxes();
    renderTicks(); // 下面勾燈的地方馬上換新的名目
    say("namesMsg", "存好了。下面「建議點的燈」已經換成新的名目。");
  } catch {
    say("namesMsg", "沒有存好（可能是網路不穩），請再按一次。");
  } finally {
    setEditorBusy(false);
  }
}

// ── 做連結 ──
function makeOne() {
  const out = makeLink({ name: $("makeName").value, suggested: pickedLamps($("lampGroups")), newcomer: $("makeNew").checked, base: location.href, catalog });
  say("makeMsg", out.error ? MISSING[out.error] : "");
  $("makeOut").hidden = !!out.error;
  say("makeCopied", "");
  if (out.error) return;
  // 連結旁邊寫著是給誰、哪幾盞燈（跟連結裡的一樣）
  const inLink = decodeLink(new URL(out.url).hash);
  const who = inLink.newcomer ? `${inLink.name}（新信眾，要填農曆生日、時辰和地址）` : inLink.name;
  say("makeFor", `給 ${who}：${inLink.suggested.map(lampLabel).join("、")}`);
  $("makeUrl").value = out.url;
  $("makeLine").href = out.line;
  $("makeTry").href = out.url;
}

async function copyLink() {
  try {
    await navigator.clipboard.writeText($("makeUrl").value);
    say("makeCopied", "已複製，可以貼給這個人。");
  } catch {
    $("makeUrl").select(); // 不能自動複製（舊瀏覽器）：選好，讓樞理自己按複製
    say("makeCopied", "請按住連結，選「複製」。");
  }
}

async function start() {
  $("lampDemo").hidden = !store.demo;
  say("ticksMsg", "正在讀燈的名目…");
  try {
    catalog = await store.loadCatalog();
  } catch {
    return say("ticksMsg", "燈的名目讀不到，請重新整理再試。");
  }
  renderTicks();
  $("namesOpen").disabled = false; // 名目讀好了才能打開編輯
}

$("namesOpen").addEventListener("click", openEditor);
$("namesPassword").addEventListener("keydown", (e) => {
  if (e.key === "Enter") openEditor();
});
$("namesSave").addEventListener("click", saveNames);
$("makeName").addEventListener("input", hideOut);
$("makeNew").addEventListener("input", hideOut);
$("lampGroups").addEventListener("input", hideOut);
$("makeBtn").addEventListener("click", makeOne);
$("makeCopy").addEventListener("click", copyLink);
start();
