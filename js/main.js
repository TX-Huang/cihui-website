import { createCloth, step, push, nearest, charAt } from "./cloth.js";
import { Chimes } from "./chimes.js";
import { DEITIES, ORDER } from "./deities.js";
import { GATE } from "./gate.js";
import { Petals } from "./petals.js";
import { KoiPond, loadImages } from "./koi.js";

// ── 珠簾尺寸（拱門圖的設計座標，圖寬 1000） ──
const D = GATE.door;
const CURTAIN_X = D.x0;
const CURTAIN_Y = D.y0;
const CURTAIN_W = D.x1 - D.x0;
const CURTAIN_H = D.y1 - D.y0;
const COLS = 16;
const ROWS = 21;
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
  const mobile = vw <= 720;
  scale = mobile
    ? Math.min((vh * 0.72) / GATE.h, (vw * 1.35) / GATE.w)
    : Math.min(1.3, (vh - 64) / GATE.h, (vw * 0.96) / GATE.w);
  scale = Math.max(0.3, scale);
  document.documentElement.style.setProperty("--s", scale.toFixed(4));

  dpr = Math.min(2.5, (window.devicePixelRatio || 1) * scale);
  canvas.width = Math.round(CANVAS_W * dpr);
  canvas.height = Math.round(CANVAS_H * dpr);
  canvas.style.width = `${CANVAS_W}px`;
  canvas.style.height = `${CANVAS_H}px`;
  canvas.style.left = `${CURTAIN_X - PAD}px`;
  canvas.style.top = `${CURTAIN_Y - PAD}px`;

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
  pl.fontSize = `${Math.round(P.h * 0.56)}px`;
  $("gate").style.transformOrigin = `50% ${(((D.y0 + D.y1) / 2) / GATE.h) * 100}%`;
  glyphs.clear();
}

// ── 每個字先畫成發光的小圖（珠子），之後每格只要貼圖 ──
function glyph(ch, color) {
  const key = ch + color;
  let g = glyphs.get(key);
  if (g) return g;
  const size = 22;
  g = document.createElement("canvas");
  g.width = g.height = Math.ceil(size * dpr);
  g._size = size;
  const c = g.getContext("2d");
  c.scale(dpr, dpr);
  c.font = FONT;
  c.textAlign = "center";
  c.textBaseline = "middle";
  c.shadowColor = color;
  c.shadowBlur = 6;
  c.fillStyle = color;
  c.fillText(ch, size / 2, size / 2 + 0.5);
  c.shadowBlur = 0;
  c.globalAlpha = 0.6;
  c.fillStyle = "#fff";
  c.fillText(ch, size / 2, size / 2 + 0.5);
  glyphs.set(key, g);
  return g;
}

// 紅、綠珠子交錯成花紋
function beadColor(col, row, t) {
  const v = Math.sin(col * 0.9 + row * 0.35) + Math.sin(row * 0.21 - col * 0.4);
  return v > 0.2 ? t.beadA : t.beadB;
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
}

// ── 畫珠簾 ──
function draw() {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
  for (const p of cloth.particles) {
    if (!p.ch || p.ch === " ") continue;
    let cos = 1;
    let sin = 0;
    if (p.down) {
      const a = Math.atan2(p.down.b.y - p.down.a.y, p.down.b.x - p.down.a.x) - Math.PI / 2;
      cos = Math.cos(a);
      sin = Math.sin(a);
    }
    const g = glyph(p.ch, p.color);
    const h = g._size / 2;
    const x = p.x + PAD;
    const y = p.y + PAD;
    ctx.setTransform(cos * dpr, sin * dpr, -sin * dpr, cos * dpr, x * dpr, y * dpr);
    ctx.drawImage(g, -h, -h, g._size, g._size);
  }
}

let t = 0;
function loop() {
  requestAnimationFrame(loop);
  t += 0.016;
  if (cloth) {
    // 捲動時的風 + 平常一點點微風
    const breeze = Math.sin(t * 0.7) * 0.004;
    for (const p of cloth.particles) {
      if (p.pinned) continue;
      const depth = p.row / ROWS;
      p.ax += (wind + breeze) * depth * (0.7 + 0.3 * Math.sin(t * 3 + p.col * 0.45));
    }
    wind *= 0.9;
    step(cloth, SIM);
    draw();
  }
  if (koi) koi.tick();
  petals.tick(wind);
}

// ── 滑鼠 / 手指 ──
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
  // 背景山跟著滑鼠微微移動（視差）
  const root = document.documentElement.style;
  root.setProperty("--mx", ((e.clientX / window.innerWidth) * 2 - 1).toFixed(3));
  root.setProperty("--my", ((e.clientY / window.innerHeight) * 2 - 1).toFixed(3));

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
  s.setProperty("--hue", `${t.hue}deg`);
  s.setProperty("--sat", String(t.sat));
  s.setProperty("--bri", String(t.bri));
  s.setProperty("--mist", t.mist);
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
  $("plaque").textContent = d.plaque;
  buildCloth(d, { rolled });
  applyTheme(d.theme);
  applyCopy(d);
  chimes.setNoteOffset(d.note);
  document.querySelectorAll(".rail button").forEach((b) => {
    b.classList.toggle("is-active", b.dataset.id === d.id);
  });
}

// ── 換神明：往下滑 = 走進門（門放大淡出），新的門從遠處出現 ──
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function setGate(transform, opacity, blur, ms) {
  const g = $("gate");
  g.style.transition = ms
    ? `transform ${ms}ms var(--ease), opacity ${ms}ms var(--ease), filter ${ms}ms var(--ease)`
    : "none";
  g.style.transform = transform;
  g.style.opacity = String(opacity);
  g.style.filter = blur ? `blur(${blur}px)` : "none";
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
  setGate(forward ? "scale(3.2)" : "scale(0.6)", 0, 6, dur);
  document.documentElement.style.setProperty("--zoom", forward ? "1.12" : "0.96");
  await sleep(dur * 0.75);

  currentIndex = index;
  applyDeity(DEITIES[ORDER[index]], { rolled: true });
  copy.classList.remove("is-leaving");
  copy.classList.add("is-entering");

  setGate(forward ? "scale(0.6)" : "scale(3.2)", 0, 6, 0);
  void $("gate").offsetWidth;
  setGate("none", 1, 0, dur);
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
  buildPage();
  layout();
  window.addEventListener("resize", layout);

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

  currentIndex = first;
  wantedIndex = first;
  applyDeity(DEITIES[ORDER[first]], { rolled: !reduceMotion });
  requestAnimationFrame(loop);

  const sprites = await loadImages(["assets/koi-kohaku.webp", "assets/koi-gold.webp", "assets/koi-showa.webp"]);
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
  // 視窗在背景時動畫會暫停；這個可以手動往前跑 n 格
  run(n = 120) {
    for (let i = 0; i < n; i++) {
      step(cloth, SIM);
      if (koi) koi.tick();
    }
    draw();
  }
};

start();
