// 服務頁「故事版」的畫面（計算在 js/story.js；價錢、祭改合計、兩道光、一年的線借用 js/blueprint.js）。
// 內容本來就寫在網頁上；這裡只加：每一幕停住、字一句一句浮出來、背景跟著幕換顏色、每一幕的畫面跟著進度動。
// 要求減少動畫、或很舊的瀏覽器：不加 is-live，就是一篇照順序讀的文章（祭改合計照樣會算）。
import { SCENES, sceneProgress, beatsShown, skyAt, textAlpha, smooth } from "./story.js";
import { jiegaiPlan, money, mergeFrame, MERGE_MS, yearFrame, YEAR_MS, stopAt } from "./blueprint.js";

const motionPref = matchMedia("(prefers-reduced-motion: reduce)");
const reduce = motionPref.matches;
const story = document.getElementById("story");
const clamp01 = (t) => Math.min(1, Math.max(0, t));

// 兩個顏色（#rrggbb）混合
function mix(c1, c2, w) {
  const p = (c, i) => parseInt(c.slice(1 + i * 2, 3 + i * 2), 16);
  const ch = (i) => Math.round(p(c1, i) + (p(c2, i) - p(c1, i)) * w);
  return `rgb(${ch(0)}, ${ch(1)}, ${ch(2)})`;
}

// ── 祭改小問答：勾了什麼 → 哪些項目亮起來、合計多少 ──
function setupQuiz() {
  const form = document.getElementById("quiz");
  const total = document.getElementById("quizTotal");
  if (!form || !total) return;
  story.classList.add("has-js");
  const update = () => {
    const boxes = [...form.querySelectorAll('input[name="addon"]')];
    for (const b of boxes) b.closest("label").classList.toggle("is-on", b.checked);
    const plan = jiegaiPlan(boxes.filter((b) => b.checked).map((b) => b.value));
    total.innerHTML = `合計 <strong>${money(plan.total)}</strong>（${plan.items.map((i) => i.name).join("＋")}）`;
  };
  form.addEventListener("change", update);
  update();
}

// ── 每一幕的畫面跟著進度 p（0～1）動 ──
const yearLine = document.getElementById("planLine");
const yearRows = yearLine ? [...yearLine.querySelectorAll(".year-plan li")] : [];
const yearAts = yearRows.map((li) => stopAt(li.style.getPropertyValue("--at")));
const ARTS = {
  // 運勢線先畫出來，畫完燈才在交會的地方亮
  yuandan: (el, p) => {
    el.style.setProperty("--draw", smooth(p / 0.45).toFixed(3));
    el.style.setProperty("--glow", smooth((p - 0.45) / 0.3).toFixed(3));
  },
  // 兩道光在這一幕前半合起來（名字先淡掉，合起來才出現「完整的能量防護」）
  merge: (el, p) => {
    const f = mergeFrame(clamp01(p / 0.5) * MERGE_MS);
    el.style.setProperty("--apart", f.apart.toFixed(3));
    el.style.setProperty("--label", f.label.toFixed(3));
    el.style.setProperty("--word", f.word.toFixed(3));
  },
  bayue: (el, p) => el.style.setProperty("--rise", smooth(p / 0.3).toFixed(3)),
  home: (el, p) => el.querySelector(".lotus")?.style.setProperty("--bloom", smooth(p / 0.45).toFixed(3)),
  // 一年的線從元旦亮到歲末，走到哪一站那一站才亮
  yearend: (el, p) => {
    if (!yearLine) return;
    const f = yearFrame(clamp01(p / 0.35) * YEAR_MS, yearAts);
    yearLine.style.setProperty("--lit", f.lit.toFixed(3));
    yearLine.style.setProperty("--head", f.head.toFixed(3));
    yearRows.forEach((li, i) => li.classList.toggle("is-lit", f.on[i]));
  }
};

// 出來了 k 句：前 k 句看得到，比最新那句早的淡一點
function showBeats(s, k) {
  if (k === s.shown) return;
  s.beats.forEach((b, i) => {
    b.classList.toggle("is-out", i < k);
    b.classList.toggle("is-past", i < k - 1);
  });
  s.shown = k;
}

// 一年的線上的站：點了慢慢捲回那一幕
function glideLinks() {
  for (const a of story.querySelectorAll('.year-plan a[href^="#scene-"]')) {
    const target = document.querySelector(a.hash);
    if (!target) continue;
    a.addEventListener("click", (e) => {
      e.preventDefault();
      target.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
      history.replaceState(null, "", a.hash);
    });
  }
}

// 一幕：顏色、有幾句、畫面
function makeScene(el) {
  const pal = SCENES.find((s) => s.id === el.dataset.scene);
  const beats = [...el.querySelectorAll(".beat")];
  el.style.setProperty("--beats", String(beats.length));
  el.style.setProperty("--ink", pal.ink);
  el.style.setProperty("--hook", pal.hook);
  return { el, pal, beats, stage: el.querySelector(".stage"), words: el.querySelector(".words"), shown: -1, tall: false, art: ARTS[pal.id] };
}

// 內容比畫面高的幕（很矮的手機、放大字）：不停住、字全部看得到（還沒浮出來的字也佔著位子，所以隨時量得準）
function fitScene(s) {
  s.el.classList.remove("is-tall");
  s.tall = s.stage.scrollHeight > s.stage.clientHeight + 1;
  s.el.classList.toggle("is-tall", s.tall);
}

// 這一幕捲到哪裡 → 出幾句、字看得到多少、畫面動到哪
function drawScene(s, vh) {
  const r = s.el.getBoundingClientRect();
  if (r.bottom < -vh || r.top > vh * 2) return; // 離畫面很遠的幕不用算
  const p = s.tall ? 1 : sceneProgress(r.top, r.height, vh);
  // 正在用鍵盤操作的那一幕不淡掉；太高的幕照一般文章
  const keep = s.tall || s.el.contains(document.activeElement);
  s.words.style.setProperty("--alpha", keep ? "1" : textAlpha(r.top, r.height, vh).toFixed(3));
  s.el.style.setProperty("--p", p.toFixed(3));
  // 字開始淡入（上緣到畫面一半）時就有第一句
  const waiting = !s.tall && r.top > vh * 0.5;
  showBeats(s, waiting ? 0 : beatsShown(p, s.beats.length));
  s.art?.(s.el, p);
}

function setupStory() {
  if (reduce || !story || !window.ResizeObserver) return; // 照一般文章顯示
  const scenes = [...story.querySelectorAll(".scene")].map(makeScene);
  story.style.setProperty("--card-ink", SCENES[0].ink);
  story.style.setProperty("--card-hook", SCENES[0].hook);
  yearLine?.classList.add("is-live");
  story.classList.add("is-live");

  // 畫面高只量一次：停住的畫面、每一幕多高、進度、背景交接都用它（手機網址列縮放時一起重量）
  let vh = innerHeight;
  let spans = [];
  const measure = () => {
    vh = innerHeight;
    story.style.setProperty("--stage-h", vh + "px");
    scenes.forEach(fitScene);
    spans = scenes.map(({ el }) => {
      const r = el.getBoundingClientRect();
      return { top: r.top + scrollY, height: r.height };
    });
  };
  const update = () => {
    const sky = skyAt(scrollY, spans, vh);
    story.style.setProperty("--sky", mix(scenes[sky.a].pal.bg, scenes[sky.b].pal.bg, sky.w));
    for (const s of scenes) drawScene(s, vh);
  };
  let queued = false;
  const ask = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      update();
    });
  };
  // 用鍵盤移到還沒浮出來的東西（例如祭改的勾選）：捲到這一幕整個出來的地方
  story.addEventListener("focusin", (e) => {
    const i = scenes.findIndex((s) => s.el.contains(e.target));
    const beat = e.target.closest(".beat");
    if (i < 0 || scenes[i].tall || !beat || beat.classList.contains("is-out")) return;
    scrollTo({ top: spans[i].top + spans[i].height - vh, behavior: "smooth" });
  });
  // 圖片、字型晚一點才載入、視窗大小改變：重新量每一幕在哪裡
  new ResizeObserver(() => {
    measure();
    update();
  }).observe(story);
  addEventListener("scroll", ask, { passive: true });
  addEventListener("resize", () => {
    measure();
    ask();
  });
  measure();
  update();
}

// 看網頁中途才打開（或關掉）「減少動畫」：重新載入，照新的設定顯示
motionPref.addEventListener?.("change", () => location.reload());

for (const [name, setup] of [
  ["祭改小問答", setupQuiz],
  ["故事", setupStory],
  ["一年的線", glideLinks]
]) {
  try {
    setup();
  } catch (err) {
    console.error(`${name} 沒有做出來：`, err);
  }
}
