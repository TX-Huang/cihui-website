import { createCloth, step, push, nearest, charAt } from "./cloth.js";
import { Chimes } from "./chimes.js";
import { DEITIES, ORDER } from "./deities.js";
import { GATE } from "./gate.js";
import { fitGate, curtainGrid } from "./layout.js";
import { Petals } from "./petals.js";
import { KoiPond, loadImages } from "./koi.js";
import { IntroView } from "./intro-view.js";

// ── 珠簾尺寸（拱門圖的設計座標，圖寬 1000） ──
const D = GATE.door;
const CURTAIN_X = D.x0;
const CURTAIN_Y = D.y0;
const CURTAIN_W = D.x1 - D.x0;
const CURTAIN_H = D.y1 - D.y0;
// 字的間距固定，門洞多大就掛幾排幾列（見 js/layout.js）
const { cols: COLS, rows: ROWS } = curtainGrid(CURTAIN_W, CURTAIN_H);
const PAD = 160;
const CANVAS_W = CURTAIN_W + PAD * 2;
const CANVAS_H = CURTAIN_H + PAD * 2;
const FONT = `600 12px "Noto Serif TC", "Songti TC", "PMingLiU", serif`;

const SIM = { gravity: 0.2, damping: 0.985, iterations: 5 };
const TOUCH_R2 = 60 * 60;
const TOUCH_FORCE = 3;
const GRAB_R2 = 24 * 24;
const CHIME_R2 = 50 * 50;
const MOVE_MS = 900;

const $ = (id) => document.getElementById(id);
const canvas = $("cloth");
const ctx = canvas.getContext("2d");
const chimes = new Chimes();
const petals = new Petals($("petals"));
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

const koiCanvas = $("koi");
let koi = null;
let cloth = null;
let deity = null;
let currentIndex = -1;
let wantedIndex = 0;
let moving = false;
let scale = 1;
let dpr = 1;
let wind = 0;
let grabbed = null;
const glyphs = new Map();

// ── 版面縮放：讓拱門塞進畫面 ──
function layout() {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  scale = fitGate(vw, vh, GATE);
  document.documentElement.style.setProperty("--s", scale.toFixed(4));

  dpr = Math.min(2.5, (window.devicePixelRatio || 1) * scale);
  canvas.width = Math.round(CANVAS_W * dpr);
  canvas.height = Math.round(CANVAS_H * dpr);
  canvas.style.width = `${CANVAS_W}px`;
  canvas.style.height = `${CANVAS_H}px`;
  canvas.style.left = `${CURTAIN_X - PAD}px`;
  canvas.style.top = `${CURTAIN_Y - PAD}px`;

  const wrap = $("gateWrap").style;
  wrap.width = `${GATE.w}px`;
  wrap.height = `${GATE.h}px`;

  const glow = $("doorGlow").style;
  glow.left = `${D.x0}px`;
  glow.top = `${D.y0}px`;
  glow.width = `${CURTAIN_W}px`;
  glow.height = `${CURTAIN_H}px`;
  glow.borderRadius = `${CURTAIN_W / 2}px ${CURTAIN_W / 2}px 0 0`;

  const P = GATE.plaque;
  const pl = $("plaque").style;
  pl.left = `${P.cx - P.w / 2}px`;
  pl.top = `${P.cy - P.h / 2}px`;
  pl.width = `${P.w}px`;
  pl.height = `${P.h}px`;
  $("gate").style.transformOrigin = `50% ${(((D.y0 + D.y1) / 2) / GATE.h) * 100}%`;
  atlas = null;
  glyphs.clear();
  needDraw = true;
}

// ── 字圖集：所有字先畫在「同一張」大圖上，每格只要從大圖剪貼 ──
// （每個字一張小圖的話，顯示卡要切換上千次，很慢）
const GLYPH = 22; // 每個字的格子大小（設計座標）
const ATLAS_COLS = 16;
let atlas = null;
let atlasCtx = null;
let atlasCell = 0;

function resetAtlas() {
  glyphs.clear();
  atlasCell = Math.ceil(GLYPH * dpr);
  atlas = document.createElement("canvas");
  atlas.width = atlas.height = atlasCell * ATLAS_COLS;
  atlasCtx = atlas.getContext("2d");
  atlasCtx.font = FONT;
  atlasCtx.textAlign = "center";
  atlasCtx.textBaseline = "middle";
}

function glyph(ch, color) {
  const key = ch + color;
  let g = glyphs.get(key);
  if (g) return g;
  if (!atlas || glyphs.size >= ATLAS_COLS * ATLAS_COLS) resetAtlas();
  const i = glyphs.size;
  const sx = (i % ATLAS_COLS) * atlasCell;
  const sy = Math.floor(i / ATLAS_COLS) * atlasCell;
  atlasCtx.setTransform(dpr, 0, 0, dpr, sx, sy);
  atlasCtx.fillStyle = color;
  atlasCtx.fillText(ch, GLYPH / 2, GLYPH / 2 + 0.5);
  g = { sx, sy };
  glyphs.set(key, g);
  return g;
}

// 大部分是墨色字，少數幾處淡金色，像珠簾上點綴的金珠
function beadColor(col, row, t) {
  const v = Math.sin(col * 0.9 + row * 0.35) + Math.sin(row * 0.21 - col * 0.4);
  return v > 1.35 ? t.gold : t.ink;
}

function buildCloth(d, { rolled }) {
  cloth = createCloth({ cols: COLS, rows: ROWS, width: CURTAIN_W, height: CURTAIN_H });
  for (const p of cloth.particles) {
    p.ch = charAt(d.cloth, p.col, p.row, COLS, ROWS);
    p.color = beadColor(p.col, p.row, d.theme);
    if (rolled && !p.pinned) {
      // 珠簾先收在門楣上，進場時自己垂下來
      p.y = p.oy = p.row * 1.2;
    }
  }
  drop = rolled ? { phase: "fall", brake: 0 } : null;
}

// ── 珠簾放下來：先用大重力快速落下，落到底後短暫加大阻力（煞車），再回到平常的輕柔晃動 ──
// 實測（30×43 珠簾，node 模擬）：原本 1.45 秒才垂到 9 成、最長拉到 1.22 倍；
// 現在約 0.78 秒到底、最長 1.17 倍（多出來的部分藏在台階後面）
const DROP_GRAVITY = 0.9;
const DROP_TRIGGER = 0.7; // 落到 7 成長度就開始煞車，避免衝過頭拉太長
const BRAKE_DAMPING = 0.88;
const BRAKE_STEPS = 30;
let drop = null;
let dropBottom = null;

function simParams() {
  if (!drop) return SIM;
  if (drop.phase === "fall") return { ...SIM, gravity: DROP_GRAVITY };
  return { ...SIM, damping: BRAKE_DAMPING };
}

function advanceDrop() {
  if (!drop) return;
  if (drop.phase === "fall") {
    if (!dropBottom || dropBottom[0] === undefined || !cloth.particles.includes(dropBottom[0])) {
      dropBottom = cloth.particles.filter((p) => p.row === ROWS - 1);
    }
    const y = dropBottom.reduce((a, p) => a + p.y, 0) / dropBottom.length;
    if (y >= CURTAIN_H * DROP_TRIGGER) {
      drop.phase = "brake";
      drop.brake = BRAKE_STEPS;
    }
  } else if (--drop.brake <= 0) {
    drop = null;
  }
}

// ── 畫珠簾 ──
function draw() {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
  const h = GLYPH / 2;
  for (const p of cloth.particles) {
    if (!p.ch || p.ch === " " || p.ch === "　") continue;
    // 字跟著往下那條線轉：用向量直接算 cos/sin，不用三角函數
    let cos = 1;
    let sin = 0;
    if (p.down) {
      const dx = p.down.b.x - p.down.a.x;
      const dy = p.down.b.y - p.down.a.y;
      const len = Math.hypot(dx, dy) || 1;
      cos = dy / len;
      sin = -dx / len;
    }
    const g = glyph(p.ch, p.color);
    const x = p.x + PAD;
    const y = p.y + PAD;
    ctx.setTransform(cos * dpr, sin * dpr, -sin * dpr, cos * dpr, x * dpr, y * dpr);
    ctx.drawImage(atlas, g.sx, g.sy, atlasCell, atlasCell, -h, -h, GLYPH, GLYPH);
  }
}

// 珠簾幾乎沒在動時就不重畫（畫面會保留上一格）
function clothMoved() {
  let max = 0;
  for (const p of cloth.particles) {
    const m = Math.abs(p.x - p.ox) + Math.abs(p.y - p.oy);
    if (m > max) max = m;
  }
  return max > 0.02;
}

// 物理：每畫一格算一步（使用者偏好原本的晃動速度，不改成照真實時間）
let t = 0;
let needDraw = true;
let lastNow = 0;

function physicsStep() {
  t += 0.016;
  // 捲動時的風 + 平常一點點微風
  const breeze = Math.sin(t * 0.7) * 0.004;
  for (const p of cloth.particles) {
    if (p.pinned) continue;
    const depth = p.row / ROWS;
    p.ax += (wind + breeze) * depth * (0.7 + 0.3 * Math.sin(t * 3 + p.col * 0.45));
  }
  wind *= 0.9;
  step(cloth, simParams());
  advanceDrop();
}

// ── 效能儀表：網址加 ?perf 才會出現，顯示每秒張數與各部分耗時 ──
const PERF = new URLSearchParams(location.search).has("perf");
const perfStats = { frames: 0, since: 0, worst: 0, parts: {} };
let perfBox = null;
function perfMark(name, t0) {
  if (!PERF) return;
  perfStats.parts[name] = (perfStats.parts[name] || 0) + (performance.now() - t0);
}
function perfFrame(now, frameMs) {
  if (!PERF) return;
  if (!perfBox) {
    perfBox = document.createElement("pre");
    perfBox.style.cssText =
      "position:fixed;left:8px;top:8px;z-index:99;margin:0;padding:8px 10px;font:12px/1.5 monospace;" +
      "background:rgba(0,0,0,.72);color:#fff;border-radius:6px;pointer-events:none;white-space:pre";
    document.body.appendChild(perfBox);
    perfStats.since = now;
  }
  perfStats.frames++;
  perfStats.worst = Math.max(perfStats.worst, frameMs);
  const span = now - perfStats.since;
  if (span >= 1000) {
    const n = perfStats.frames;
    const parts = Object.entries(perfStats.parts)
      .map(([k, v]) => `${k.padEnd(7)} ${(v / n).toFixed(1).padStart(5)} ms`)
      .join("\n");
    perfBox.textContent = [
      `每秒 ${((n * 1000) / span).toFixed(0)} 張（目標 60）`,
      `最慢一格 ${perfStats.worst.toFixed(0)} ms`,
      `畫面 ${innerWidth}×${innerHeight} · dpr ${devicePixelRatio}`,
      "— 每格平均（CPU）—",
      parts
    ].join("\n");
    perfStats.frames = 0;
    perfStats.worst = 0;
    perfStats.parts = {};
    perfStats.since = now;
  }
}

function loop(now = performance.now()) {
  requestAnimationFrame(loop);
  perfFrame(now, lastNow ? now - lastNow : 0);
  lastNow = now;
  if (cloth) {
    const t0 = performance.now();
    physicsStep();
    perfMark("物理", t0);
    const t1 = performance.now();
    if (needDraw || clothMoved()) {
      draw();
      needDraw = false;
    }
    perfMark("珠簾", t1);
  }
  const t2 = performance.now();
  if (koi) koi.tick();
  perfMark("鯉魚", t2);
  const t3 = performance.now();
  petals.tick(wind);
  perfMark("花瓣", t3);
}

// ── 滑鼠 / 手指 ──
const parallax = { x: 0, y: 0, queued: false };
function local(e) {
  const r = canvas.getBoundingClientRect();
  return {
    x: ((e.clientX - r.left) / r.width) * CANVAS_W - PAD,
    y: ((e.clientY - r.top) / r.height) * CANVAS_H - PAD
  };
}

function ringNear(x, y, force) {
  const hit = nearest(cloth, x, y, CHIME_R2);
  if (!hit) {
    chimes.lastId = -1;
    return;
  }
  chimes.strike({
    id: hit.p.col * ROWS + hit.p.row,
    col: hit.p.col,
    cols: COLS,
    intensity: force ? 0.85 : 0.2 + (1 - hit.ls / CHIME_R2) * 0.7,
    force
  });
}

document.addEventListener("pointermove", (e) => {
  // 背景跟著滑鼠微微移動（視差）。只改背景這一個元素，而且一格最多改一次
  parallax.x = (e.clientX / window.innerWidth) * 2 - 1;
  parallax.y = (e.clientY / window.innerHeight) * 2 - 1;
  if (!parallax.queued) {
    parallax.queued = true;
    requestAnimationFrame(() => {
      parallax.queued = false;
      const st = $("skyImg").style;
      st.setProperty("--mx", parallax.x.toFixed(3));
      st.setProperty("--my", parallax.y.toFixed(3));
    });
  }

  if (!cloth || moving) return;
  const { x, y } = local(e);
  if (grabbed) {
    grabbed.x = grabbed.ox = x;
    grabbed.y = grabbed.oy = y;
  }
  push(cloth, x, y, TOUCH_R2, TOUCH_FORCE);
  ringNear(x, y, false);
});

document.addEventListener("pointerdown", (e) => {
  chimes.unlock();
  if (!cloth || moving || e.target.closest("button, a")) return;
  const { x, y } = local(e);
  const hit = nearest(cloth, x, y, GRAB_R2);
  if (hit && !hit.p.pinned) {
    grabbed = hit.p;
    grabbed.wasPinned = grabbed.pinned;
    grabbed.pinned = true;
    if (e.pointerType === "mouse") e.preventDefault();
  }
  ringNear(x, y, true);
});

const release = () => {
  if (grabbed) {
    grabbed.pinned = grabbed.wasPinned;
    grabbed = null;
  }
};
document.addEventListener("pointerup", release);
document.addEventListener("pointercancel", release);

// ── 文字與顏色 ──
function applyTheme(t) {
  const s = document.documentElement.style;
  s.setProperty("--tint", t.tint);
  s.setProperty("--tint-a", String(t.tintA));
  s.setProperty("--mist", t.mist);
  bakeMist(t.mist);
  petals.color = t.petal;
}

function applyCopy(d) {
  $("eyebrow").textContent = d.eyebrow;
  $("title").setAttribute("aria-label", d.title);
  $("title").innerHTML = Array.from(d.title)
    .map((ch, i) => `<span class="c" style="--i:${i}">${ch}</span>`)
    .join("");
  $("subtitle").textContent = d.subtitle;
  $("aside").textContent = d.aside;
  document.title = `慈惠道場 — ${d.name}`;
}

function applyDeity(d, { rolled }) {
  deity = d;
  $("plaque").setAttribute("aria-label", d.plaque);
  buildCloth(d, { rolled });
  needDraw = true;
  applyTheme(d.theme);
  applyCopy(d);
  chimes.setNoteOffset(d.note);
  document.querySelectorAll(".rail button").forEach((b) => {
    b.classList.toggle("is-active", b.dataset.id === d.id);
  });
}

// ── 換神明：往下滑 = 走進門（門放大淡出），新的門從遠處出現 ──
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// 模糊效果：不即時模糊（每格都要重算，很慢），而是
// 「清楚的拱門」和「預先模糊好的拱門」交叉淡入淡出，看起來一樣，但顯示卡只在調透明度。
function setGate(transform, opacity, blurred, ms) {
  const g = $("gate");
  const tr = (props) => (ms ? props.map((p) => `${p} ${ms}ms var(--ease)`).join(", ") : "none");
  g.style.transition = tr(["transform", "opacity"]);
  g.style.transform = transform;
  g.style.opacity = String(opacity);
  const mix = blurred ? 1 : 0;
  for (const id of ["gateImg", "cloth", "plaque"]) {
    if (!$(id)) continue;
    const st = $(id).style;
    st.transition = tr(["opacity"]);
    st.opacity = String(1 - mix);
  }
  if ($("gateBlur")) {
    const gb = $("gateBlur").style;
    gb.transition = tr(["opacity"]);
    gb.opacity = String(mix);
  }
}

// 做一張模糊版的拱門（只做一次）。模糊後細節本來就看不到，所以用半解析度做，省 3/4 的計算
const BLUR_PX = 6; // 跟原本換場時的 blur(6px) 一樣（拱門設計座標）
function bakeBlurredGate() {
  const img = $("gateImg");
  // 舊版 index.html（瀏覽器快取）沒有這個畫布時，自己建一個，不要讓整頁壞掉
  if (!$("gateBlur")) {
    const c = document.createElement("canvas");
    c.id = "gateBlur";
    c.className = "gate-blur";
    c.setAttribute("aria-hidden", "true");
    img.after(c);
  }
  const make = () => {
    const c = $("gateBlur");
    const k = 0.5;
    c.width = Math.round(GATE.w * k);
    c.height = Math.round(GATE.h * k);
    const x = c.getContext("2d");
    x.filter = `blur(${BLUR_PX * k}px)`;
    x.drawImage(img, 0, 0, c.width, c.height);
  };
  if (img.complete && img.naturalWidth) make();
  else img.addEventListener("load", make, { once: true });
}

// 霧：預先把「漸層＋模糊」畫成一張小圖，CSS 只負責平移。效果跟原本 blur(30px) 相同
const MIST_BLUR = 30; // 原本 CSS 的 blur(30px)
const MIST_SCALE = 0.2; // 用 1/5 解析度做（霧本來就很糊，看不出差別）
function bakeMist(color) {
  const w = Math.max(64, Math.round(window.innerWidth * 2 * MIST_SCALE));
  const h = Math.max(32, Math.round(window.innerHeight * 0.4 * MIST_SCALE));
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const x = c.getContext("2d");
  // 先在沒模糊的畫布上畫橢圓漸層，再模糊貼過來
  const src = document.createElement("canvas");
  src.width = w;
  src.height = h;
  const sx = src.getContext("2d");
  sx.save();
  sx.translate(w / 2, h / 2);
  sx.scale(w / 2, h / 2);
  const g = sx.createRadialGradient(0, 0, 0, 0, 0, 1);
  g.addColorStop(0, color);
  g.addColorStop(0.7, "rgba(255,255,255,0)");
  sx.fillStyle = g;
  sx.fillRect(-1, -1, 2, 2);
  sx.restore();
  x.filter = `blur(${MIST_BLUR * MIST_SCALE}px)`;
  x.drawImage(src, 0, 0);
  document.documentElement.style.setProperty("--mist-img", `url(${c.toDataURL()})`);
}

async function goTo(index) {
  wantedIndex = index;
  if (moving || index === currentIndex) return;
  moving = true;
  release();
  const forward = index > currentIndex;
  const copy = $("copy");
  const dur = reduceMotion ? 1 : MOVE_MS;

  copy.classList.add("is-leaving");
  petals.burst(forward ? 1 : -0.5);
  // 往下：穿過門（放大）；往上：退出來（縮小）
  setGate(forward ? "scale(3.2)" : "scale(0.6)", 0, true, dur);
  document.documentElement.style.setProperty("--zoom", forward ? "1.12" : "0.96");
  await sleep(dur * 0.75);

  currentIndex = index;
  applyDeity(DEITIES[ORDER[index]], { rolled: true });
  copy.classList.remove("is-leaving");
  copy.classList.add("is-entering");

  setGate(forward ? "scale(0.6)" : "scale(3.2)", 0, true, 0);
  void $("gate").offsetWidth;
  setGate("none", 1, false, dur);
  document.documentElement.style.setProperty("--zoom", "1");
  requestAnimationFrame(() => copy.classList.remove("is-entering"));
  await sleep(dur);

  // 進場時輕輕響一串
  [2, 9, 16].forEach((c, k) =>
    setTimeout(() => chimes.strike({ id: -10 - k, col: c, cols: COLS, intensity: 0.35, force: true }), k * 160)
  );

  moving = false;
  if (wantedIndex !== currentIndex) goTo(wantedIndex);
}

// ── 捲動：看現在在第幾格 ──
function indexFromScroll() {
  const h = window.innerHeight;
  return Math.max(0, Math.min(ORDER.length - 1, Math.round(window.scrollY / h)));
}

let lastY = window.scrollY;
window.addEventListener(
  "scroll",
  () => {
    const y = window.scrollY;
    wind += Math.max(-0.4, Math.min(0.4, (y - lastY) * 0.004));
    lastY = y;
    $("scrollCue").classList.toggle("is-hidden", y > 40);
    const i = indexFromScroll();
    if (i !== wantedIndex) goTo(i);
    if (location.hash !== `#${ORDER[i]}`) history.replaceState(null, "", `#${ORDER[i]}`);
  },
  { passive: true }
);

function scrollToIndex(i) {
  window.scrollTo({ top: i * window.innerHeight, behavior: reduceMotion ? "auto" : "smooth" });
}

// ── 開始 ──
function buildPage() {
  $("scroller").innerHTML = ORDER.map((id) => `<section data-id="${id}" aria-label="${DEITIES[id].name}"></section>`).join("");
  $("rail").innerHTML = ORDER.map(
    (id, i) =>
      `<button type="button" data-id="${id}" data-i="${i}"><span class="name">${DEITIES[id].name}</span><span class="bar"></span></button>`
  ).join("");
  $("rail").addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (b) scrollToIndex(Number(b.dataset.i));
  });
  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener("click", (e) => {
      const i = ORDER.indexOf(a.getAttribute("href").slice(1));
      if (i < 0) return;
      e.preventDefault();
      scrollToIndex(i);
    });
  });
  $("soundBtn").addEventListener("click", () => {
    chimes.enabled = !chimes.enabled;
    $("soundBtn").setAttribute("aria-pressed", String(chimes.enabled));
    $("soundBtn").textContent = `風鈴 ${chimes.enabled ? "開" : "關"}`;
  });
}

async function start() {
  // 開場（第一次進來才播）：在雲裡的時候網頁才開始，雲散開時珠簾剛好落下
  const intro = IntroView.create({ reduceMotion });
  window.__debug.intro = intro; // 除錯：__debug.intro.render(毫秒) 可以看任一格
  if (intro) intro.start();
  buildPage();
  layout();
  window.addEventListener("resize", () => {
    layout();
    if (deity) bakeMist(deity.theme.mist);
  });
  bakeBlurredGate();

  const first = Math.max(0, ORDER.indexOf(location.hash.slice(1)));
  if (first > 0) window.scrollTo(0, first * window.innerHeight);

  // 等字型載入，不然 canvas 會先用系統字
  const allText = ORDER.map((id) => DEITIES[id].cloth).join("");
  try {
    await Promise.race([document.fonts.load(FONT, allText), sleep(2500)]);
  } catch (_) {
    /* 用系統字也可以 */
  }
  glyphs.clear();
  if (intro) await intro.revealed;

  currentIndex = first;
  wantedIndex = first;
  applyDeity(DEITIES[ORDER[first]], { rolled: !reduceMotion });
  requestAnimationFrame(loop);

  const sprites = await loadImages(["assets/koi-tancho.webp", "assets/koi-asagi.webp", "assets/koi-platinum.webp"]);
  if (sprites.length) koi = new KoiPond(koiCanvas, sprites, reduceMotion ? 3 : 5);
}

// 除錯用：在主控台打 __debug.cloth 可以看珠簾狀態
window.__debug = {
  get cloth() {
    return cloth;
  },
  get wind() {
    return wind;
  },
  get koi() {
    return koi;
  },
  get petals() {
    return petals;
  },
  // 量每個部分每格花幾毫秒
  perf(n = 60) {
    const time = (fn) => {
      const t0 = performance.now();
      for (let i = 0; i < n; i++) fn();
      return +((performance.now() - t0) / n).toFixed(2);
    };
    return {
      clothStep: time(() => step(cloth, SIM)),
      clothDraw: time(() => draw()),
      koi: koi ? time(() => koi.tick()) : null,
      petals: time(() => petals.tick(0))
    };
  },
  // 視窗在背景時動畫會暫停；這個可以手動往前跑 n 格
  run(n = 120) {
    for (let i = 0; i < n; i++) {
      physicsStep();
      if (koi) koi.tick();
    }
    draw();
  }
};

start();
