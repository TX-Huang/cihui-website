// 開場畫面：照 js/intro.js 的時間軸，每一格把各層的位置、大小、透明度套上去。
import { introFrame, shouldPlayIntro, INTRO_MS, SKIP_TO } from "./intro.js";

const SEEN_KEY = "cihui-intro-seen";
const REVEAL_AT = 3300; // 雲開始散開：這時網頁才開始（標題浮現、珠簾落下），剛好被看到
const LOAD_WAIT = 2500; // 圖片太慢就不播了

function readSeen() {
  try {
    return sessionStorage.getItem(SEEN_KEY) === "1";
  } catch (_) {
    return false;
  }
}
function markSeen() {
  try {
    sessionStorage.setItem(SEEN_KEY, "1");
  } catch (_) {
    /* 私密視窗等情況存不了，沒關係 */
  }
}

export class IntroView {
  // 不需要播：回傳 null（並把開場畫面拿掉）
  static create({ reduceMotion }) {
    const root = document.getElementById("intro");
    if (!root) return null;
    const play = shouldPlayIntro({ seen: readSeen(), reduceMotion, hash: location.hash });
    if (!play) {
      root.remove();
      document.documentElement.classList.remove("intro-on");
      return null;
    }
    return new IntroView(root);
  }

  constructor(root) {
    this.root = root;
    const q = (s) => root.querySelector(s);
    this.el = {
      night: q(".intro-night"),
      earth: q(".intro-earth"),
      back: q(".intro-clouds.back"),
      front: q(".intro-clouds.front"),
      veil: q(".intro-veil")
    };
    this.site = [document.querySelector(".sky"), document.getElementById("stage")].filter(Boolean);
    this.t = 0;
    this.revealed = new Promise((r) => (this.resolveReveal = r));
    this.finished = new Promise((r) => (this.resolveDone = r));
    document.documentElement.classList.add("intro-on");
    const skip = () => this.skip();
    q(".intro-skip")?.addEventListener("click", skip);
    for (const ev of ["wheel", "keydown", "touchstart"]) window.addEventListener(ev, skip, { once: true, passive: true });
    this.render(0);
  }

  async start() {
    const imgs = [this.el.earth, this.el.back, this.el.front].filter(Boolean);
    const loaded = Promise.all(imgs.map((im) => im.decode().catch(() => {})));
    const ok = await Promise.race([loaded.then(() => true), new Promise((r) => setTimeout(() => r(false), LOAD_WAIT))]);
    if (!ok) {
      this.finish();
      return this.finished;
    }
    let last = performance.now();
    const tick = (now) => {
      this.t += Math.min(50, now - last); // 分頁切走回來時不要一下跳太多
      last = now;
      this.render(this.t);
      if (this.t >= INTRO_MS) this.finish();
      else this.raf = requestAnimationFrame(tick);
    };
    this.raf = requestAnimationFrame(tick);
    return this.finished;
  }

  skip() {
    if (this.t < SKIP_TO) this.t = SKIP_TO;
  }

  render(t) {
    const f = introFrame(t);
    const { el } = this;
    const set = (node, { y = 0, scale = 1, opacity }, center) => {
      if (!node) return;
      node.style.opacity = opacity.toFixed(3);
      node.style.transform = `${center ? "translateX(-50%) " : ""}translate3d(0, ${y.toFixed(2)}vh, 0) scale(${scale.toFixed(4)})`;
    };
    // 凡間是一張直的長圖：一開始對齊畫面底部（看到稻田和小鎮），
    // 鏡頭往上升時整張圖往下移，最後看到圖最上面的雲霧，剛好接到雲海
    if (el.earth) {
      const travel = Math.max(0, el.earth.offsetHeight - window.innerHeight * 0.35);
      el.earth.style.opacity = f.earth.opacity.toFixed(3);
      el.earth.style.transform = `translate3d(0, ${((f.earth.y / 100) * travel).toFixed(1)}px, 0) scale(${f.earth.scale.toFixed(4)})`;
    }
    set(el.back, f.back, true);
    set(el.front, f.front, true);
    if (el.veil) el.veil.style.opacity = f.veil.opacity.toFixed(3);
    if (el.night) el.night.style.opacity = f.night.opacity.toFixed(3);
    for (const node of this.site) {
      node.style.transform = `scale(${f.site.scale.toFixed(4)})`;
      node.style.opacity = f.site.opacity.toFixed(3);
    }
    if (t >= REVEAL_AT) this.resolveReveal();
  }

  finish() {
    cancelAnimationFrame(this.raf);
    markSeen();
    for (const node of this.site) {
      node.style.transform = "";
      node.style.opacity = "";
    }
    this.root.remove();
    document.documentElement.classList.remove("intro-on");
    this.resolveReveal();
    this.resolveDone();
  }
}
