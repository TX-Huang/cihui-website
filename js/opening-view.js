// 新首頁的開場畫面：影片 → 鳳凰飛走 → 經文光簾從天上降下來（計算在 js/opening.js，規格在 test/new-home.test.mjs）。
// 光簾是原本的珠簾物理（js/cloth.js），改成「天上垂下來的光」：中間短、兩邊長，金色發光的字，越往下越淡。
// 一開始怎麼開（播影片、看過了、要求減少動畫），new-home.html 的 <head> 已經先決定好，寫在 <html data-opening>。
import { createCloth, step, push, charAt } from "./cloth.js";
import { DEITIES } from "./deities.js";
import { highlightRanges, isHighlighted } from "./highlight.js";
import {
  SEEN_KEY,
  SIM,
  STEP_MS,
  pickVideo,
  openingMode,
  openingStep,
  curtainLayout,
  strandRows,
  glyphAlpha,
  curtainFade,
  rollUp,
  dropParams,
  dropNext,
  stepsFor,
  breezeAt
} from "./opening.js";

const $ = (id) => document.getElementById(id);
const root = document.documentElement;
const video = $("openingVideo");
const canvas = $("openingCurtain");
const skipBtn = $("openingSkip");
const ctx = canvas.getContext("2d");
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
const sutra = DEITIES.jinmu;
root.dataset.openingReady = "1"; // 跟 <head> 的小程式說：程式有開始（8 秒內沒開始，它會換成最後一格）

function seen() {
  try {
    return sessionStorage.getItem(SEEN_KEY) === "1";
  } catch {
    return false;
  }
}
function remember() {
  try {
    sessionStorage.setItem(SEEN_KEY, "1");
  } catch {
    // 私密瀏覽不能存：下次再播一次也沒關係
  }
}

// ── 發光的字：每個字先畫好（帶金色光暈和淡淡的深金邊），之後只貼上去 ──
const G = 30;
let glyphs = new Map();
let glyphDpr = 0;
function glyph(ch, hot, dpr) {
  if (dpr !== glyphDpr) {
    glyphs = new Map();
    glyphDpr = dpr;
  }
  const key = ch + hot;
  let c = glyphs.get(key);
  if (c) return c;
  c = document.createElement("canvas");
  c.width = c.height = Math.round(G * dpr);
  const g = c.getContext("2d");
  g.scale(dpr, dpr);
  g.font = `600 14px "Noto Serif TC", "Songti TC", "PMingLiU", serif`;
  g.textAlign = "center";
  g.textBaseline = "middle";
  // 深金邊：亮的天空上也看得清楚
  g.lineJoin = "round";
  g.lineWidth = 2.4;
  g.strokeStyle = "rgba(110, 70, 20, 0.55)";
  g.strokeText(ch, G / 2, G / 2 + 0.5);
  g.shadowColor = hot ? "rgba(255, 236, 190, 1)" : "rgba(255, 190, 90, 1)";
  g.shadowBlur = hot ? 12 : 8;
  g.fillStyle = hot ? "#fff6dc" : "#ffd98a";
  g.fillText(ch, G / 2, G / 2 + 0.5);
  g.shadowBlur = 0;
  g.fillText(ch, G / 2, G / 2 + 0.5);
  glyphs.set(key, c);
  return c;
}

// ── 光簾 ──
// running：在降（或已經降好、還在動）；asleep：靜下來了，不再重畫，等滑鼠或手指叫醒
const curtain = { cloth: null, L: null, bottom: [], dpr: 1, drop: null, running: false, asleep: false, shownAt: 0, lastNow: 0, lastTouch: 0, carry: 0 };

// 畫布跟著畫面大小（和螢幕的清晰度）
function sizeCanvas() {
  const dpr = Math.min(2, devicePixelRatio || 1);
  canvas.width = Math.round(innerWidth * dpr);
  canvas.height = Math.round(innerHeight * dpr);
  curtain.dpr = dpr;
}

function build(rolled) {
  sizeCanvas();
  const L = curtainLayout(innerWidth, innerHeight);
  const cloth = createCloth({ cols: L.cols, rows: L.rows, width: L.width, height: L.height });
  const gold = highlightRanges(sutra.cloth, sutra.keys, L.cols, L.rows, sutra.id);
  for (const p of cloth.particles) {
    p.ch = charAt(sutra.cloth, p.col, p.row, L.cols, L.rows);
    p.hot = isHighlighted(p.col, p.row, L.cols, L.rows, gold);
    p.visible = strandRows(p.col, L.cols, L.rows);
  }
  if (rolled) rollUp(cloth);
  else for (let i = 0; i < 150; i++) step(cloth, SIM); // 先讓它靜下來
  Object.assign(curtain, { cloth, L, bottom: cloth.particles.filter((p) => p.row === L.rows - 1) });
}

function draw(fade) {
  const { cloth, L, dpr } = curtain;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, innerWidth, innerHeight);
  // 串字的細金線
  ctx.globalAlpha = fade;
  ctx.strokeStyle = "rgba(200, 150, 70, 0.45)";
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  for (const p of cloth.particles) {
    if (!p.down || p.row + 1 >= p.visible) continue;
    ctx.moveTo(L.x0 + p.x, L.y0 + p.y);
    ctx.lineTo(L.x0 + p.down.b.x, L.y0 + p.down.b.y);
  }
  ctx.stroke();
  for (const p of cloth.particles) {
    if (p.row >= p.visible || !p.ch || p.ch === "　") continue;
    // 字跟著往下那條線轉
    let cos = 1;
    let sin = 0;
    if (p.down) {
      const dx = p.down.b.x - p.down.a.x;
      const dy = p.down.b.y - p.down.a.y;
      const len = Math.hypot(dx, dy) || 1;
      cos = dy / len;
      sin = -dx / len;
    }
    ctx.globalAlpha = fade * glyphAlpha(p.row, p.visible);
    const x = L.x0 + p.x;
    const y = L.y0 + p.y;
    ctx.setTransform(cos * dpr, sin * dpr, -sin * dpr, cos * dpr, x * dpr, y * dpr);
    ctx.drawImage(glyph(p.ch, p.hot, dpr), -G / 2, -G / 2, G, G);
  }
  ctx.globalAlpha = 1;
}

const bottomY = () => curtain.bottom.reduce((s, p) => s + p.y, 0) / curtain.bottom.length;

// 光簾還在動嗎（每個字這一步移動多少）
function clothMoving() {
  let max = 0;
  for (const p of curtain.cloth.particles) max = Math.max(max, Math.abs(p.x - p.ox) + Math.abs(p.y - p.oy));
  return max > 0.02;
}

// 每一格：照真實時間算幾步物理（每步 1/60 秒）→ 每步加一點微風、算一步（落下時重力大一點，落到七成半就煞車）→ 畫
let t = 0;
function frame(now) {
  const c = curtain;
  const { steps, carry } = stepsFor(now - c.lastNow, c.carry);
  c.carry = carry;
  c.lastNow = now;
  const breeze = breezeAt(now - c.lastTouch);
  for (let i = 0; i < steps; i++) {
    t += STEP_MS / 1000;
    const wind = Math.sin(t * 0.7) * 0.004 * breeze;
    for (const p of c.cloth.particles) {
      if (p.pinned || !wind) continue;
      p.ax += wind * (p.row / c.L.rows) * (0.7 + 0.3 * Math.sin(t * 3 + p.col * 0.45));
    }
    step(c.cloth, dropParams(c.drop, c.L.height));
    c.drop = dropNext(c.drop, bottomY(), c.L.height);
  }
  const fade = curtainFade(now - c.shownAt);
  draw(fade);
  // 靜下來了（沒有風、落完了、淡入完了、幾乎不動）：不再重畫，等滑鼠或手指叫醒（省電）
  const moving = clothMoving();
  if (!moving && breeze === 0 && !c.drop && fade === 1) {
    c.asleep = true;
    return;
  }
  requestAnimationFrame(frame);
}

// 叫醒：重新開始算微風的時間；睡著了就重新開始畫
function wake() {
  const now = performance.now();
  curtain.lastTouch = now;
  if (!curtain.asleep) return;
  curtain.asleep = false;
  curtain.lastNow = now;
  curtain.carry = 0;
  requestAnimationFrame(frame);
}

// 光簾開始降下（只會發生一次）。先等字型（最多 2 秒；略過時影片淡掉的那一下剛好蓋住）
async function lowerCurtain() {
  if (curtain.running) return;
  curtain.running = true;
  await fontsOrTimeout;
  build(true);
  const now = performance.now();
  Object.assign(curtain, { drop: { phase: "fall" }, shownAt: now, lastNow: now, lastTouch: now, carry: 0, asleep: false });
  requestAnimationFrame(frame);
}

// 要求減少動畫：光簾直接掛好，不降、不晃
function hangCurtain() {
  build(false);
  draw(1);
}

// 滑鼠、手指撥過去：光簾晃開
addEventListener("pointermove", (e) => {
  if (!curtain.running || !curtain.cloth) return;
  push(curtain.cloth, e.clientX - curtain.L.x0, e.clientY - curtain.L.y0, 60 * 60, 3);
  wake();
});

// 畫面大小變了：畫布馬上跟著變（字不會被拉扁）；光簾照新的大小重做，等停下來 0.25 秒才做（拖拉視窗時不會一直重算）。
// 還在降的話從頭再降一次（不會一下子跳到垂好）；已經垂好就直接是垂好的樣子
let resizeTimer = 0;
addEventListener("resize", () => {
  sizeCanvas();
  if (curtain.cloth) draw(curtain.running ? curtainFade(performance.now() - curtain.shownAt) : 1);
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    if (!curtain.cloth) return;
    const lowering = curtain.drop !== null;
    build(lowering);
    curtain.drop = lowering ? { phase: "fall" } : null;
    if (curtain.running) wake();
    else draw(1);
  }, 250);
});

// 字型：最多等 2 秒再畫字；比較晚才載好，就換成載好的字型重畫
const fontLoad = document.fonts ? document.fonts.load('600 14px "Noto Serif TC"', sutra.cloth).catch(() => {}) : Promise.resolve();
const fontsOrTimeout = Promise.race([fontLoad, new Promise((r) => setTimeout(r, 2000))]);
fontLoad.then(() => {
  glyphs = new Map();
  if (!curtain.cloth) return;
  if (!curtain.running || curtain.asleep) draw(1); // 還在動的話，下一格就會用新的字型
});

// ── 影片（什麼時候做什麼，由 js/opening.js 的 openingStep 決定）──
let state = "done";
function send(ev, t = 0) {
  const out = openingStep(state, ev, t);
  state = out.state;
  for (const act of out.acts) {
    if (act === "curtain") lowerCurtain();
    else if (act === "remember") remember();
    else if (act === "hideVideo") hideVideo();
    else if (act === "cutVideo") hideVideo({ cut: true });
  }
}

// 影片淡掉（露出底下一模一樣的最後一格），淡完以後停止下載。cut：直接切掉，不淡
function hideVideo({ cut = false } = {}) {
  if (cut) root.dataset.cut = "1";
  root.dataset.opening = "end";
  video.pause();
  if (document.activeElement === skipBtn) document.querySelector(".pill .brand").focus(); // 鍵盤的位置移到選單
  skipBtn.hidden = true;
  setTimeout(() => {
    video.removeAttribute("src");
    video.load();
  }, 1000);
}

function play() {
  state = "playing";
  video.src = pickVideo({ w: innerWidth, h: innerHeight, dpr: devicePixelRatio || 1, saveData: navigator.connection?.saveData === true });
  skipBtn.hidden = false;
  skipBtn.addEventListener("click", () => send("skip"));
  addEventListener("keydown", (e) => {
    if (e.key === "Escape") send("skip");
  });
  video.addEventListener("error", () => send("error"));
  video.addEventListener("ended", () => send("ended"));
  // 按上一頁回到這一頁（瀏覽器把整頁留著）：直接到最後一格，不在光簾後面重播
  addEventListener("pageshow", (e) => {
    if (e.persisted) send("restored");
  });
  // 鳳凰飛走以後（第 11 秒）光簾才開始降下
  const watch = () => {
    if (state !== "playing") return;
    send("time", video.currentTime);
    requestAnimationFrame(watch);
  };
  requestAnimationFrame(watch);
  // 瀏覽器不讓自動播放（例如手機省電模式）：直接到最後一格。
  // 播放被打斷（AbortError，例如略過時暫停、分頁切到背景）不算；其他錯誤當成載入失敗
  video.play().catch((e) => {
    if (e.name === "NotAllowedError") send("refused");
    else if (e.name !== "AbortError") send("error");
  });
}

const mode = root.dataset.opening || openingMode({ seen: seen(), reduceMotion: reduce });
root.dataset.opening = mode;
if (mode === "play") play();
else
  fontsOrTimeout.then(() => {
    if (mode === "still") hangCurtain();
    else lowerCurtain();
  });
