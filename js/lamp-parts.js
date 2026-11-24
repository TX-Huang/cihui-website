// 光明燈兩頁共用的畫面小零件：大燈、小燈各一組勾選框（名目從試算表來）。
import { SIZES, lampKey } from "./lamp.js";

// 在 box 裡畫出勾選框；checked 是一開始要勾好的燈（"big:光明" 這種）。沒有任何名目：回傳 false
export function renderLampTicks(box, catalog, checked = []) {
  box.replaceChildren();
  for (const [size, label] of Object.entries(SIZES)) {
    const names = catalog?.[size] ?? [];
    if (!names.length) continue;
    const set = document.createElement("fieldset");
    set.className = "lamp-group";
    const legend = document.createElement("legend");
    legend.textContent = label;
    set.append(legend);
    for (const name of names) {
      const pick = document.createElement("label");
      pick.className = "lamp-pick";
      const tick = document.createElement("input");
      tick.type = "checkbox";
      tick.value = lampKey(size, name);
      tick.checked = checked.includes(tick.value);
      pick.append(tick, ` ${name}`);
      set.append(pick);
    }
    box.append(set);
  }
  return box.childElementCount > 0;
}

export const pickedLamps = (box) => [...box.querySelectorAll("input:checked")].map((t) => t.value);

export function fillList(list, texts) {
  list.replaceChildren(
    ...texts.map((t) => {
      const li = document.createElement("li");
      li.textContent = t;
      return li;
    })
  );
}
