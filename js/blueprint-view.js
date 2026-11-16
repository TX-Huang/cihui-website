// 服務頁「從容修行的年度藍圖」的互動和動畫（計算在 js/blueprint.js）。
// 內容本來就寫在網頁上（光明燈的運勢線也是）；這裡只加：季節背景、旁邊的「一年」細線、三層護持的圓、祭改小問答、
// 核心交集（兩團光合起來）、蓮花開。
// 每一段各自出錯只會少那一段。要求減少動畫時：不做淡入淡出，核心交集直接是合起來的樣子。
import { STOPS, jiegaiPlan, money, seasonMix, railStop, tierAt, mergeAt, mergeFrame, MERGE_MS } from "./blueprint.js";

const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
const $ = (id) => document.getElementById(id);
const journey = $("journey");

// 兩個顏色（#rrggbb）混合
function mix(c1, c2, w) {
  const p = (c, i) => parseInt(c.slice(1 + i * 2, 3 + i * 2), 16);
  const ch = (i) => Math.round(p(c1, i) + (p(c2, i) - p(c1, i)) * w);
  return `rgb(${ch(0)}, ${ch(1)}, ${ch(2)})`;
}

// ── 旁邊的「一年」細線 + 季節背景（跟著捲動） ──
function setupYear() {
  const stops = STOPS.map((s) => document.querySelector(`[data-stop="${s.id}"]`));
  if (stops.some((s) => !s)) return null;
  const rail = document.createElement("nav");
  rail.className = "year-rail";
  rail.setAttribute("aria-label", "一年的旅程");
  const dots = STOPS.map((s, i) => {
    const a = document.createElement("a");
    a.href = `#stop-${s.id}`;
    a.setAttribute("aria-label", `${s.when}：${s.what}`); // 畫面窄時字會藏起來，讀螢幕軟體還是唸得到
    a.innerHTML = `<span class="rail-dot"></span><span class="rail-label"></span>`;
    a.querySelector(".rail-label").textContent = s.when;
    // 慢慢捲過去（要求減少動畫時直接跳過去）
    a.addEventListener("click", (e) => {
      e.preventDefault();
      stops[i].scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
      history.replaceState(null, "", a.hash);
    });
    rail.append(a);
    return a;
  });
  document.body.append(rail);
  let marks = [];
  const measure = () => {
    marks = stops.map((el) => {
      const r = el.getBoundingClientRect();
      return r.top + scrollY + r.height / 2;
    });
  };
  const update = () => {
    const mid = scrollY + innerHeight / 2;
    const m = seasonMix(mid, marks);
    journey.style.setProperty("--tint", mix(STOPS[m.a].tint, STOPS[m.b].tint, m.w));
    const box = journey.getBoundingClientRect();
    rail.classList.toggle("is-shown", box.top < innerHeight * 0.5 && box.bottom > innerHeight * 0.5);
    const at = railStop(mid, marks, innerHeight);
    dots.forEach((d, i) => {
      d.classList.toggle("is-on", i === at);
      d.classList.toggle("is-past", at >= 0 && i < at);
    });
  };
  measure();
  // 圖片、字型晚一點才載入會把下面的段落推下去：內容大小一變就重新量、重新畫
  new ResizeObserver(() => {
    measure();
    update();
  }).observe(journey);
  return update;
}

// ── 三層護持：滑鼠移到哪一圈（或右邊那一列），那一圈和那一列一起亮 ──
// 移開後留在最後亮的那一層（滑過中間的空隙不會閃回去）。手機沒有滑鼠：點一下也會亮；鍵盤移到名字上也會亮
function setupTiers() {
  const rings = $("rings");
  const wrap = rings?.closest(".bp-tiers");
  if (!wrap) return;
  let now = null;
  const pick = (tier) => {
    if (!tier || tier === now) return;
    now = tier;
    for (const el of wrap.querySelectorAll("[data-tier]")) el.classList.toggle("is-on", el.dataset.tier === tier);
    for (const b of wrap.querySelectorAll("button[data-tier]")) b.setAttribute("aria-pressed", String(b.dataset.tier === tier));
  };
  const ringAt = (e) => {
    const r = rings.getBoundingClientRect();
    return tierAt(e.clientX - (r.left + r.width / 2), e.clientY - (r.top + r.height / 2), r.width / 2);
  };
  // 手指滑過去捲頁面不算「懸浮」（手機用點的）
  const hovering = (e) => e.pointerType !== "touch";
  rings.addEventListener("pointermove", (e) => hovering(e) && pick(ringAt(e)));
  rings.addEventListener("click", (e) => pick(ringAt(e)));
  for (const row of wrap.querySelectorAll(".tier-list li[data-tier]")) row.addEventListener("pointerenter", (e) => hovering(e) && pick(row.dataset.tier));
  for (const b of wrap.querySelectorAll("button[data-tier]")) {
    b.addEventListener("click", () => pick(b.dataset.tier));
    b.addEventListener("focus", () => pick(b.dataset.tier));
  }
  pick("core");
}

// ── 祭改小問答：勾了什麼 → 哪些項目亮起來、合計多少 ──
function setupQuiz() {
  const form = $("quiz");
  const total = $("quizTotal");
  if (!form || !total) return;
  const update = () => {
    const boxes = [...form.querySelectorAll('input[name="addon"]')];
    for (const b of boxes) b.closest("label").classList.toggle("is-on", b.checked);
    const plan = jiegaiPlan(boxes.filter((b) => b.checked).map((b) => b.value));
    total.innerHTML = `合計 <strong>${money(plan.total)}</strong>（${plan.items.map((i) => i.name).join("＋")}）`;
  };
  form.addEventListener("change", update);
  update();
}

// ── 核心交集：捲到時播一次（兩團光合起來 → 「完整的能量防護」出現）；要求減少動畫就直接是合起來的樣子 ──
function setupMerge() {
  const merge = $("merge");
  const stage = merge?.querySelector(".merge-stage");
  // 減少動畫、或很舊的瀏覽器（沒有 IntersectionObserver）：用 CSS 預設（合起來的樣子），不會卡在一半
  if (!stage || reduce || !("IntersectionObserver" in window)) return;
  const set = (f) => {
    merge.style.setProperty("--apart", f.apart.toFixed(3));
    merge.style.setProperty("--label", f.label.toFixed(3));
    merge.style.setProperty("--word", f.word.toFixed(3));
  };
  set(mergeFrame(0));
  const play = () => {
    const t0 = performance.now();
    const tick = (now) => {
      set(mergeFrame(now - t0));
      if (now - t0 < MERGE_MS) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };
  // 大半進到畫面、而且停留一下才播（從旁邊細線快速捲過去時不會在沒人看的時候播掉）
  let wait = 0;
  const seen = new IntersectionObserver(
    (entries) => {
      clearTimeout(wait);
      if (entries[entries.length - 1].intersectionRatio >= 0.8)
        wait = setTimeout(() => {
          seen.disconnect();
          play();
        }, 300);
    },
    { threshold: [0, 0.8] }
  );
  seen.observe(stage);
}

// ── 蓮花開：捲到那一段時慢慢開 ──
function setupScrollPieces() {
  const lotus = $("lotus");
  // 這一段的進度：段落上緣從畫面八成高走到兩成高 = 0 → 1
  const progress = (el) => {
    const r = el.getBoundingClientRect();
    return Math.min(1, Math.max(0, (innerHeight * 0.8 - r.top) / (innerHeight * 0.6)));
  };
  return () => {
    if (lotus) lotus.style.setProperty("--bloom", reduce ? "1" : (1 - mergeAt(progress(lotus))).toFixed(3));
  };
}

const updates = [];
for (const [name, setup] of [
  ["一年細線", setupYear],
  ["三層護持", setupTiers],
  ["祭改小問答", setupQuiz],
  ["核心交集", setupMerge],
  ["蓮花", setupScrollPieces]
]) {
  try {
    const u = setup();
    if (u) updates.push(u);
  } catch (err) {
    console.error(`${name} 沒有做出來：`, err);
  }
}

if (journey && updates.length) {
  journey.classList.add("is-live");
  let queued = false;
  const run = () => {
    queued = false;
    for (const u of updates) u();
  };
  const ask = () => {
    if (!queued) {
      queued = true;
      requestAnimationFrame(run);
    }
  };
  addEventListener("scroll", ask, { passive: true });
  addEventListener("resize", ask);
  run();
}
