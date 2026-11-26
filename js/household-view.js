// 信眾的「光明燈登記核對與付款」（household.html#h=編號）：一戶一個連結。
// 待確認：看全家的資料和金額 →「資料正確，我同意」→ 已確認：選付款方式（轉帳：複製帳號、填末五碼；信用卡：之後接綠界）
// → 已回報付款：等樞理對帳 → 已付款。計算在 js/household.js，讀寫試算表在 js/lamp-store.js。
import { createStore } from "./lamp-store.js";
import { readHouseholdHash, householdTotal, personLines, cardAmount, cleanLast5, money, STATUS, CARD_FEE_RATE } from "./household.js";

const $ = (id) => document.getElementById(id);
const store = createStore();
const id = readHouseholdHash(location.hash);
let home = null;
let settings = null;
let busy = false;

const say = (id, text) => {
  $(id).textContent = text;
};
const el = (tag, props = {}, ...kids) => {
  const node = Object.assign(document.createElement(tag), props);
  node.append(...kids);
  return node;
};

// 應付金額：用匯入時試算表算好、存起來的（之後改了價錢，已經發出去的連結金額不會變）
const amountDue = () => home.total || householdTotal(home, settings.prices).total;

function renderPeople() {
  const prices = settings.prices;
  say("homeTitle", `${home.name} 闔家（${home.people.length} 位）`);
  const box = $("people");
  box.replaceChildren();
  for (const p of home.people) {
    const card = el("div", { className: "hh-person" });
    card.append(el("p", { className: "hh-person-name" }, p.name));
    const facts = [p.birth && `生日：${p.birth}${p.hour ? ` ${p.hour}` : ""}`, p.zodiac && `生肖：${p.zodiac}`, p.address && `地址：${p.address}`].filter(Boolean);
    if (facts.length) card.append(el("p", { className: "small hh-facts" }, facts.join("　")));
    const list = el("ul", { className: "hh-lines" });
    for (const line of personLines(p, prices)) {
      list.append(el("li", {}, el("span", {}, line.label), el("span", { className: "hh-price" }, line.separate ? "另計" : money(line.amount))));
    }
    card.append(list);
    box.append(card);
  }
  const total = amountDue();
  say("totalAmount", money(total));
  $("jigaiNote").hidden = !home.people.some((p) => p.jigai.length) || prices.jigai > 0;
  return total;
}

function renderPay(total) {
  const b = settings.bank;
  const ready = b.account && b.holder;
  say("bankName", ready ? [b.name, b.code && `（代碼 ${b.code}）`].filter(Boolean).join("") : "樞理還沒填轉帳帳號，請先聯絡樞理。");
  say("bankAccount", b.account || "—");
  say("bankHolder", b.holder || "—");
  say("payAmount", money(total));
  $("copyAccount").disabled = !ready;
  $("reportBtn").disabled = !ready;
  const fee = Number.isFinite(settings.prices.cardFee) ? settings.prices.cardFee : CARD_FEE_RATE;
  say("cardFee", `${Math.round(fee * 1000) / 10}%`);
  say("cardAmount", money(cardAmount(total, fee)));
  if (settings.qr) {
    $("payQr").src = settings.qr;
    $("payQr").hidden = false;
  }
}

// 照狀態顯示哪幾步
function render() {
  const total = renderPeople();
  const s = home.status;
  $("checkStep").hidden = false;
  $("confirmBox").hidden = s !== STATUS.pending;
  $("confirmedNote").hidden = s === STATUS.pending;
  $("payStep").hidden = s !== STATUS.confirmed;
  $("afterStep").hidden = s !== STATUS.reported && s !== STATUS.paid;
  if (s === STATUS.confirmed) renderPay(total);
  if (s === STATUS.reported) {
    say("afterTitle", "已收到您的轉帳通知");
    say("afterText", `帳號末五碼 ${home.last5}。樞理核對款項後會更新狀態，再次打開這個連結就看得到。如果末五碼填錯，請直接告訴傳連結給您的樞理。`);
  }
  if (s === STATUS.paid) {
    say("afterTitle", "已完成付款");
    say("afterText", "感謝您，樞理已收到款項，會為您家點燈。");
  }
}

async function copy(text, done) {
  try {
    await navigator.clipboard.writeText(text);
    say("copyHint", done);
  } catch {
    prompt("請複製：", text);
  }
}

async function act(button, work, msgId) {
  if (busy) return;
  busy = true;
  button.disabled = true;
  try {
    const out = await work();
    if (!out?.ok) {
      say(msgId, out?.error === "not confirmed" ? "請先確認資料。" : "沒有送出去，請再按一次。");
      return false;
    }
    home = { ...home, ...out.household, people: home.people };
    render();
    return true;
  } catch {
    say(msgId, "沒有送出去（可能是網路不穩），請再按一次。");
    return false;
  } finally {
    busy = false;
    button.disabled = false;
  }
}

async function confirmData() {
  if (await act($("confirmBtn"), () => store.confirmHousehold(id), "wrongMsg")) {
    $("payTitle").focus();
    $("payStep").scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

async function report() {
  const last5 = cleanLast5($("last5").value);
  if (!last5) {
    say("reportMsg", "請填 5 個數字。");
    return $("last5").focus();
  }
  say("reportMsg", "");
  if (await act($("reportBtn"), () => store.reportPayment(id, last5), "reportMsg")) {
    $("afterTitle").focus();
    $("afterStep").scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

async function start() {
  $("lampDemo").hidden = !store.demo;
  if (!id) return say("loadMsg", "這個連結不完整，請再跟樞理要一次。");
  try {
    const out = await store.loadHousehold(id);
    if (!out?.ok) return say("loadMsg", out?.error === "not found" ? "找不到這一戶的資料，請再跟樞理要一次連結。" : "讀不到資料，請重新整理再試。");
    home = out.household;
    settings = out.settings;
  } catch {
    return say("loadMsg", "讀不到資料，請重新整理再試。");
  }
  say("loadMsg", "");
  render();
}

$("confirmBtn").addEventListener("click", confirmData);
$("wrongBtn").addEventListener("click", () =>
  say("wrongMsg", "請直接回覆傳連結給您的樞理（例如 LINE），告訴我們哪裡要改。改好後會再傳新的連結給您。")
);
$("copyAccount").addEventListener("click", () => copy(settings.bank.account.replace(/\D/g, ""), "已複製帳號，可以貼到網路銀行。"));
$("copyAmount").addEventListener("click", () => copy(String(amountDue()), "已複製金額。"));
$("reportBtn").addEventListener("click", report);
$("last5").addEventListener("keydown", (e) => {
  if (e.key === "Enter") report();
});
addEventListener("hashchange", () => location.reload());
start();
