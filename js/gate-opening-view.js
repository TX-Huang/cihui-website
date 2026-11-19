// 首頁的神話開場影片畫面（計算在 js/gate-opening.js，規格在 test/gate-opening.test.mjs）。
// 要不要播，index.html 的 <head> 已經先決定好，寫在 <html data-opening="video">。
// 用法跟原本的開場（js/intro-view.js）一樣：create() → start()；revealed 是「影片開始淡掉、首頁露出來」，
// js/main.js 等到這時才讓光簾從門楣垂下來。main.js 字型、標題準備好時呼叫 pageReady()。
import { pickVideo } from "./opening.js";
import { GATE_VIDEOS, GATE_SEEN_KEY, FADE_MS, SKIP_FADE_MS, STALL_MS, PAGE_WAIT_MS, gateOpeningStep } from "./gate-opening.js";

const root = document.documentElement;

function remember() {
  try {
    sessionStorage.setItem(GATE_SEEN_KEY, "1");
  } catch {
    // 私密瀏覽不能存：下次再播一次也沒關係
  }
}

export class GateOpeningView {
  // 不播：回傳 null（並把影片拿掉）
  static create() {
    const box = document.getElementById("gateOpening");
    if (!box) return null;
    if (root.dataset.opening !== "video") {
      box.remove();
      return null;
    }
    root.dataset.gateOpeningReady = "1"; // 跟 <head> 的小程式說：程式有開始（8 秒內沒開始，它會直接顯示首頁）
    return new GateOpeningView(box);
  }

  constructor(box) {
    this.box = box;
    this.video = box.querySelector("video");
    this.skipBtn = box.querySelector(".gate-opening-skip");
    this.state = "playing";
    this.revealed = new Promise((r) => (this.resolveReveal = r));
    const ready = new Promise((r) => (this.pageReady = r));
    this.ready = Promise.race([ready, new Promise((r) => setTimeout(r, PAGE_WAIT_MS))]);
    // 影片底下的網頁：鍵盤、讀螢幕軟體都碰不到（只剩「略過」），影片淡掉時才放開
    this.covered = [...document.body.children].filter((el) => el !== box && el.tagName !== "SCRIPT");
    for (const el of this.covered) el.inert = true;
  }

  start() {
    const { video } = this;
    video.src = pickVideo({ w: innerWidth, h: innerHeight, dpr: devicePixelRatio || 1, saveData: navigator.connection?.saveData === true, videos: GATE_VIDEOS });
    const skip = () => this.send("skip");
    this.skipBtn?.addEventListener("click", skip);
    addEventListener("keydown", (e) => {
      if (e.key === "Escape") skip();
    });
    // 跟原本的開場一樣：滾一下、滑一下就略過
    for (const ev of ["wheel", "touchstart"]) addEventListener(ev, skip, { once: true, passive: true });
    video.addEventListener("error", () => this.send("error"));
    video.addEventListener("ended", () => this.send("ended"));
    // 按上一頁回到這一頁（瀏覽器把整頁留著）：直接是首頁
    addEventListener("pageshow", (e) => {
      if (e.persisted) this.send("restored");
    });
    // 播到第幾秒（一秒大約報四次；分頁在背景、畫面更新變慢時也照樣報）
    let moved = performance.now();
    video.addEventListener("timeupdate", () => {
      moved = performance.now();
      this.send("time", video.currentTime);
    });
    // 網路很差、影片卡住（不出錯也不往前播）：STALL_MS 以後當成載入失敗，直接到首頁。分頁在背景時不算
    this.stallTimer = setInterval(() => {
      if (document.hidden) moved = performance.now();
      else if (performance.now() - moved > STALL_MS) this.send("error");
    }, 1000);
    // 瀏覽器不讓自動播放（例如手機省電模式）：直接是首頁。播放被打斷（AbortError）不算
    video.play().catch((e) => {
      if (e.name === "NotAllowedError") this.send("refused");
      else if (e.name !== "AbortError") this.send("error");
    });
  }

  send(ev, t = 0) {
    const out = gateOpeningStep(this.state, ev, t);
    this.state = out.state;
    for (const act of out.acts) {
      if (act === "remember") remember();
      else if (act === "fade") this.hide(FADE_MS);
      else if (act === "fastFade") this.hide(SKIP_FADE_MS);
      else if (act === "cut") this.hide(0);
    }
  }

  // 影片淡掉（露出底下一模一樣的首頁），光簾開始降下；淡完整個拿掉、停止下載。
  // 首頁還沒準備好（字型、標題）就先等一下（直接切掉時才會發生；正常播完早就好了）
  async hide(ms) {
    clearInterval(this.stallTimer);
    this.video.pause();
    await this.ready;
    const { box, video } = this;
    box.style.transitionDuration = `${ms}ms`;
    box.classList.add("is-leaving");
    root.dataset.opening = "leaving"; // 影片還在，淡掉中（還不能捲動）
    for (const el of this.covered) el.inert = false;
    if (box.contains(document.activeElement)) document.querySelector(".pill .brand")?.focus(); // 鍵盤的位置移到選單
    this.resolveReveal();
    setTimeout(() => {
      video.removeAttribute("src");
      video.load();
      box.remove();
      delete root.dataset.opening; // 網頁可以捲動了
    }, ms + 100);
  }
}
