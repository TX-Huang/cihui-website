// 內頁共用：段落捲到時慢慢浮上來；法會活動頁把 js/events.js 的清單排進表格；
// 關於道場頁的神明卡片用首頁同一份 js/deities.js（文字只寫一個地方）。
// 任何一段出錯都只會少那一段，不會讓整頁空白（頁面頭裡還有一個 3 秒的保險）。
import { EVENTS, eventRows } from "./events.js";
import { DEITIES } from "./deities.js";

const el = (tag, cls, text) => {
  const e = document.createElement(tag);
  e.className = cls;
  if (text) e.textContent = text;
  return e;
};

function renderCards(box) {
  for (const d of Object.values(DEITIES)) {
    const a = el("a", "card reveal");
    a.href = `index.html#${d.id}`;
    if (d.theme?.mark) a.style.setProperty("--mark", d.theme.mark);
    a.append(
      el("span", "card-role", (d.eyebrow || "").split("·").pop().trim()),
      el("span", "card-name", d.name),
      el("span", "card-sub", d.subtitle || ""),
      el("span", "card-more", "到首頁看 →")
    );
    box.append(a);
  }
}

function renderEvents(list) {
  for (const r of eventRows(EVENTS)) {
    const li = el("li", "event reveal");
    li.append(el("span", "event-date", r.date));
    if (r.pending) li.append(el("span", "pending", "待確認")); // 緊跟在日期後面，一眼看到
    li.append(el("span", "event-name", r.name));
    if (r.note) li.append(el("span", "event-note", r.note));
    list.append(li);
  }
}

for (const [id, render] of [
  ["deityCards", renderCards],
  ["eventList", renderEvents]
]) {
  const box = document.getElementById(id);
  if (!box) continue;
  try {
    render(box);
  } catch (err) {
    console.error(`${id} 沒有排出來：`, err);
  }
}

// 慢慢浮上來：看得到才開始，一個接一個（間隔很短，不會等很久）
const items = [...document.querySelectorAll(".reveal")];
const show = (e) => e.classList.add("is-in");
const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
if (still || !("IntersectionObserver" in window)) {
  items.forEach(show);
} else {
  let queue = 0;
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        io.unobserve(e.target);
        e.target.style.transitionDelay = `${Math.min(queue++, 4) * 120}ms`;
        show(e.target);
        setTimeout(() => (queue = Math.max(0, queue - 1)), 200);
      }
    },
    { rootMargin: "0px 0px -8% 0px" }
  );
  items.forEach((e) => io.observe(e));
  // 保險：瀏覽器沒有回報（分頁在背景、省電模式），已經在畫面裡的段落也一定要出現。
  // 捲動時最多排一個檢查；全部出現後就不再檢查
  let timer = 0;
  const sweep = () => {
    timer = 0;
    let left = 0;
    for (const e of items) {
      if (e.classList.contains("is-in")) continue;
      if (e.getBoundingClientRect().top < innerHeight) {
        io.unobserve(e);
        show(e);
      } else left++;
    }
    if (!left) removeEventListener("scroll", later);
  };
  const later = () => {
    if (!timer) timer = setTimeout(sweep, 1500);
  };
  addEventListener("scroll", later, { passive: true });
  later();
}

window.__pageReady = true;
