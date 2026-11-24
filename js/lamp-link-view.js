// 樞理做光明燈專屬連結的頁（lamp-link.html）。計算在 js/lamp.js，規格在 test/lamp.test.mjs。
import { LAMPS, makeLink, decodeLink, lampLabel } from "./lamp.js";

const $ = (id) => document.getElementById(id);
const MISSING = { name: "請填這個人的姓名。", lamps: "請至少勾一盞建議的燈。" };

// 大燈、小燈各一組勾選框
for (const group of Object.values(LAMPS)) {
  const set = document.createElement("fieldset");
  set.className = "lamp-group";
  const legend = document.createElement("legend");
  legend.textContent = group.label;
  set.append(legend);
  for (const item of group.items) {
    const label = document.createElement("label");
    label.className = "lamp-pick";
    const tick = document.createElement("input");
    tick.type = "checkbox";
    tick.value = item.id;
    label.append(tick, ` ${item.name}`);
    set.append(label);
  }
  $("lampGroups").append(set);
}

// 改了名字或勾選：舊的連結收起來（不會不小心把上一個人的連結傳出去），要重按「產生連結」
function hideOut() {
  $("makeOut").hidden = true;
}
$("makeName").addEventListener("input", hideOut);
$("makeNew").addEventListener("input", hideOut);
$("lampGroups").addEventListener("input", hideOut);

$("makeBtn").addEventListener("click", () => {
  const suggested = [...$("lampGroups").querySelectorAll("input:checked")].map((t) => t.value);
  const out = makeLink({ name: $("makeName").value, suggested, newcomer: $("makeNew").checked, base: location.href });
  $("makeMsg").textContent = out.error ? MISSING[out.error] : "";
  $("makeOut").hidden = !!out.error;
  $("makeCopied").textContent = "";
  if (out.error) return;
  // 連結旁邊寫著是給誰、哪幾盞燈（跟連結裡的一樣）
  const inLink = decodeLink(new URL(out.url).hash);
  const who = inLink.newcomer ? `${inLink.name}（新信眾，要填農曆生日和地址）` : inLink.name;
  $("makeFor").textContent = `給 ${who}：${inLink.suggested.map(lampLabel).join("、")}`;
  $("makeUrl").value = out.url;
  $("makeLine").href = out.line;
  $("makeTry").href = out.url;
});

$("makeCopy").addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText($("makeUrl").value);
    $("makeCopied").textContent = "已複製，可以貼給這個人。";
  } catch {
    $("makeUrl").select(); // 不能自動複製（舊瀏覽器）：選好，讓樞理自己按複製
    $("makeCopied").textContent = "請按住連結，選「複製」。";
  }
});
