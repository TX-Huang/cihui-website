// 服務頁「故事版」的畫面（計算在 js/story.js；價錢、祭改合計、兩道光、一年的線借用 js/blueprint.js）。
// 內容本來就寫在網頁上；這裡只加：捲到哪一幕（畫面中間在哪一幕），那一幕就自己照閱讀速度播完——
// 字一句一句浮出來、畫面跟著播到第幾句動、背景慢慢轉成這一幕的顏色。動畫都不跟著捲軸
// （使用者：一般人不會一直捲，跟著捲軸會卡在一半）。播過的幕捲回來就是播完的樣子。
// 要求減少動畫、或很舊的瀏覽器：不加 is-live，就是一篇照順序讀的文章（祭改合計照樣會算）。
import { SCENES, activeScene, beatTimes, smooth } from "./story.js";
import { jiegaiPlan, money, mergeFrame, MERGE_MS, yearFrame, YEAR_MS, stopAt } from "./blueprint.js";

const motionPref = matchMedia("(prefers-reduced-motion: reduce)");
const reduce = motionPref.matches;
const story = document.getElementById("story");

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

// 照時間播一段動畫（播一次）：draw(播了幾毫秒)
function play(ms, draw) {
  const t0 = performance.now();
  const tick = (now) => {
    const t = Math.min(now - t0, ms);
    draw(t);
    if (t < ms) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

// ── 要用程式畫的畫面（其他的跟著 at-N 用 CSS 動）：at = 第幾句出來時開始播 ──
const yearLine = document.getElementById("planLine");
const yearRows = yearLine ? [...yearLine.querySelectorAll(".year-plan li")] : [];
const yearAts = yearRows.map((li) => stopAt(li.style.getPropertyValue("--at")));
function drawMerge(el, ms) {
  const f = mergeFrame(ms);
  el.style.setProperty("--apart", f.apart.toFixed(3));
  el.style.setProperty("--label", f.label.toFixed(3));
  el.style.setProperty("--word", f.word.toFixed(3));
}
function drawYear(ms) {
  if (!yearLine) return;
  const f = yearFrame(ms, yearAts);
  yearLine.style.setProperty("--lit", f.lit.toFixed(3));
  yearLine.style.setProperty("--head", f.head.toFixed(3));
  yearRows.forEach((li, i) => li.classList.toggle("is-lit", f.on[i]));
}
const bloom = (el, b) => el.querySelector(".lotus")?.style.setProperty("--bloom", b.toFixed(3));
const BLOOM_MS = 2800;
const ARTS = {
  // 兩道光合起來：名字先淡掉，合起來才出現「完整的能量防護」
  merge: { at: 1, reset: (el) => drawMerge(el, 0), play: (el) => play(MERGE_MS, (t) => drawMerge(el, t)) },
  // 蓮花慢慢從花苞開成花
  home: { at: 1, reset: (el) => bloom(el, 0), play: (el) => play(BLOOM_MS, (t) => bloom(el, smooth(t / BLOOM_MS))) },
  // 一年的線從元旦亮到歲末，走到哪一站那一站才亮
  yearend: { at: 1, reset: () => drawYear(0), play: () => play(YEAR_MS, drawYear) }
};

// 一幕：顏色、每一句什麼時候出來、畫面
function makeScene(el) {
  const pal = SCENES.find((s) => s.id === el.dataset.scene);
  const beats = [...el.querySelectorAll(".beat")];
  el.style.setProperty("--ink", pal.ink);
  el.style.setProperty("--hook", pal.hook);
  const s = { el, pal, beats, words: el.querySelector(".words"), times: beatTimes(beats.map((b) => b.textContent)), timers: [], shown: 0, started: false, art: ARTS[pal.id], artDone: false };
  s.art?.reset(el);
  return s;
}

// 出來了 k 句（只會變多）：前 k 句看得到，比最新那句早的淡一點；at-1…at-k 讓 CSS 的畫面跟著動
function showBeats(s, k) {
  if (k <= s.shown) return;
  s.shown = k;
  s.beats.forEach((b, i) => {
    b.classList.toggle("is-out", i < k);
    b.classList.toggle("is-past", i < k - 1);
  });
  for (let n = 1; n <= s.beats.length; n++) s.el.classList.toggle(`at-${n}`, n <= k);
  if (s.art && !s.artDone && k >= s.art.at) {
    s.artDone = true;
    s.art.play(s.el);
  }
}

// 這一幕開始播：照閱讀速度一句一句出來（只播一次）
function startScene(s) {
  if (s.started) return;
  s.started = true;
  s.timers = s.times.map((t, i) => setTimeout(() => showBeats(s, i + 1), t));
}

// 這一幕直接播完（播到一半就捲走、用鍵盤移進來）：捲回來是播完的樣子，不會停在一半
function finishScene(s) {
  s.started = true;
  s.timers.forEach(clearTimeout);
  s.timers = [];
  showBeats(s, s.beats.length);
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

function setupStory() {
  if (reduce || !story || !window.ResizeObserver) return; // 照一般文章顯示
  const scenes = [...story.querySelectorAll(".scene")].map(makeScene);
  story.style.setProperty("--card-ink", SCENES[0].ink);
  story.style.setProperty("--card-hook", SCENES[0].hook);
  story.style.setProperty("--sky", SCENES[0].bg);

  let spans = [];
  let current = -1; // 一打開網頁在標題卡上（-1），還沒有哪一幕
  const measure = () => {
    spans = scenes.map(({ el }) => {
      const r = el.getBoundingClientRect();
      return { top: r.top + scrollY, height: r.height };
    });
  };
  // 畫面中間落在哪一幕，那一幕就是現在這一幕：背景轉成它的顏色；
  // 它的字真的進到畫面（字的上緣在畫面九成以上）才開始播。離開的那一幕如果還沒播完，直接播完
  const update = () => {
    const i = activeScene(scrollY + innerHeight / 2, spans);
    if (i !== current) {
      if (current >= 0 && scenes[current].started) finishScene(scenes[current]);
      current = i;
      scenes.forEach((s, j) => s.el.classList.toggle("is-current", j === i));
      story.style.setProperty("--sky", SCENES[Math.max(i, 0)].bg);
    }
    const s = scenes[current];
    if (s && !s.started && s.words.getBoundingClientRect().top < innerHeight * 0.9) startScene(s);
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
  // 用鍵盤移到某一幕裡的東西（例如祭改的勾選）：捲到畫面中間（那一幕變成現在這一幕），整幕直接出來
  story.addEventListener("focusin", (e) => {
    const s = scenes.find((sc) => sc.el.contains(e.target));
    if (!s) return;
    finishScene(s);
    e.target.scrollIntoView({ block: "center", behavior: "smooth" });
  });
  // 圖片、字型晚一點才載入、視窗大小改變：重新量每一幕在哪裡
  new ResizeObserver(() => {
    measure();
    ask();
  }).observe(story);
  addEventListener("scroll", ask, { passive: true });
  addEventListener("resize", () => {
    measure();
    ask();
  });
  // 一切準備好才開始藏字；萬一第一次量、畫出錯，拿掉 is-live，字不會全部藏著出不來。
  // story-snap：滑一下就自動停到下一幕（一幕一個畫面）
  yearLine?.classList.add("is-live");
  story.classList.add("is-live");
  document.documentElement.classList.add("story-snap");
  try {
    measure();
    update();
  } catch (err) {
    story.classList.remove("is-live");
    yearLine?.classList.remove("is-live");
    document.documentElement.classList.remove("story-snap");
    throw err;
  }
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
