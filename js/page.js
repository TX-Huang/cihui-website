// 內頁共用：關於道場的神明卡片、法會活動的「農曆一年」橫軸和清單。
// 計算在 js/page-parts.js、js/events.js；這裡只負責把它們放進網頁。
// 任何一段出錯都只會少那一段（內容本來就是直接顯示的，不會整頁空白）。
import { EVENTS, eventRows } from "./events.js";
import { DEITIES } from "./deities.js";
import { deityCards, yearTimeline } from "./page-parts.js";

const el = (tag, cls, text) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
};

// 神明卡片：主祀一張大卡、陪祀一排小卡，各配首頁已經有的圖
function renderCards(box) {
  for (const c of deityCards(DEITIES)) {
    const a = el("a", c.main ? "card card-main" : "card");
    a.href = c.href;
    const mark = DEITIES[c.id].theme?.mark;
    if (mark) a.style.setProperty("--mark", mark);
    const pic = el("img", "card-pic");
    pic.src = c.img;
    pic.alt = ""; // 裝飾用（名字已經寫在卡片上）
    pic.loading = "lazy";
    const text = el("span", "card-text");
    text.append(el("span", "card-role", c.role), el("span", "card-name", c.name), el("span", "card-sub", c.sub), el("span", "card-more", "到首頁看 →"));
    a.append(pic, text);
    box.append(a);
  }
}

// 法會清單：日期、待確認、名稱、備註
function renderEvents(list) {
  for (const r of eventRows(EVENTS)) {
    const li = el("li", "event");
    li.append(el("span", "event-date", r.date));
    if (r.pending) li.append(el("span", "pending", "待確認"));
    li.append(el("span", "event-name", r.name));
    if (r.note) li.append(el("span", "event-note", r.note));
    list.append(li);
  }
}

// 農曆一年：一條線、十二個月，每個聖誕蓋一個小印（確認過是實心，待確認是虛線）
function renderYear(fig) {
  const draw = () => {
    const width = fig.clientWidth;
    if (!width) return;
    const tl = yearTimeline(EVENTS, width);
    fig.replaceChildren(el("div", "year-line"));
    for (const m of tl.months) {
      const t = el("span", "year-month", m.label);
      t.style.left = `${m.x}px`;
      fig.append(t);
    }
    const lineY = 100;
    for (const s of tl.seals) {
      const bottom = lineY - 12 - s.row * (tl.size + 8); // 印的下緣
      const stem = el("span", "seal-stem");
      stem.style.left = `${s.x}px`;
      stem.style.top = `${bottom}px`;
      stem.style.height = `${lineY - bottom}px`;
      const seal = el("span", s.pending ? "seal pending" : "seal", s.char);
      seal.title = s.name;
      seal.style.left = `${s.x}px`;
      seal.style.top = `${bottom - tl.size}px`;
      seal.style.width = seal.style.height = `${tl.size}px`;
      seal.style.fontSize = `${Math.round(tl.size * 0.58)}px`;
      fig.append(stem, seal);
    }
  };
  draw();
  let last = fig.clientWidth;
  addEventListener("resize", () => {
    if (fig.clientWidth !== last) {
      last = fig.clientWidth;
      draw();
    }
  });
}

for (const [id, render] of [
  ["deityCards", renderCards],
  ["eventList", renderEvents],
  ["yearline", renderYear]
]) {
  const box = document.getElementById(id);
  if (!box) continue;
  try {
    render(box);
  } catch (err) {
    console.error(`${id} 沒有排出來：`, err);
  }
}
