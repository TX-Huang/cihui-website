// 畫中壇元帥的乾坤圈、火尖槍、槍尖的火星和風火輪（js/weapons.js 決定怎麼動，這裡只負責畫）。
// 風火輪：先畫火焰影片的這一格（兩格之間照比例混），再把兩個輪子的圓盤蓋上去、各自轉。
// 按住風火輪：越轉越快、火變大（每個輪子的火各自以輪心放大，兩邊在中間柔柔地接起來）。
import { createWeapons, stepWeapons, ringPose, spearPose, wheelsPose, hitWheels, flameScale } from "./weapons.js";

const PAD = 0.25; // 火變大會超出原本的格子：小畫布四邊多留 25%
import { flapFrame } from "./goldlight.js";

export class WeaponsView {
  constructor(canvas, kit) {
    this.c = canvas;
    this.ctx = canvas.getContext("2d");
    this.kit = kit; // { ring, spear }；風火輪的圖比較大，另外載，載好才出現（不擋圈和槍）
    loadFire().then((f) => {
      if (!f) return;
      Object.assign(this.kit, f);
      // 火焰兩格混在一起、再蓋上轉動的輪子用的小畫布（整張一起淡入淡出，底下的輪子才不會透出來）
      // 四邊留白取整數：火才會畫在整數像素上，不會被重新取樣變糊
      this.ox = Math.round(f.fire.width * PAD);
      this.oy = Math.round(f.fire.height * PAD);
      const mk = () => {
        const c = document.createElement("canvas");
        c.width = f.fire.width + 2 * this.ox;
        c.height = f.fire.height + 2 * this.oy;
        return c;
      };
      this.mixer = mk();
      this.half = mk(); // 一個輪子的火（放大後、蓋上左右漸層再加進 mixer）
    });
    this.s = createWeapons();
    this.active = false;
    this.click = null;
    this.over = false;
    this.holder = null; // 按著風火輪的那根手指（或滑鼠）
    this.last = 0; // 上一次畫的時間
    this.debt = 0; // 還沒走的時間（格）
    window.addEventListener("pointerdown", (e) => {
      if (e.target.closest && e.target.closest("button, a, nav, header")) return;
      this.click = { x: e.clientX, y: e.clientY };
      if (this.holder === null && this.onWheels(this.click)) {
        this.holder = e.pointerId;
        if (e.pointerType === "mouse") e.preventDefault(); // 不要選到字
      }
    });
    const letGo = (e) => {
      if (!e || e.pointerId === this.holder) this.holder = null;
    };
    window.addEventListener("pointerup", letGo);
    window.addEventListener("pointercancel", letGo);
    window.addEventListener("blur", () => letGo()); // 切到別的視窗：放開
    // 手機：按著風火輪時頁面不要捲動（pointerdown 比 touchstart 先到，holder 已經決定好）
    const noScroll = (e) => {
      if (this.holder !== null) e.preventDefault();
    };
    window.addEventListener("touchstart", noScroll, { passive: false });
    window.addEventListener("touchmove", noScroll, { passive: false });
    // 滑鼠移到圈上：手指游標（提示可以點）
    window.addEventListener("pointermove", (e) => {
      // 在視窗外放開滑鼠：放開
      if (e.pointerId === this.holder && e.pointerType === "mouse" && e.buttons === 0) letGo(e);
      const q = { x: e.clientX, y: e.clientY };
      const p = ringPose(this.s, this.w, this.h);
      const over = this.active && ((!this.s.thrown && Math.hypot(q.x - p.x, q.y - p.y) < p.size * 0.6) || this.onWheels(q));
      if (over !== this.over) document.body.classList.toggle("over-ring", (this.over = over));
    });
    this.resize();
    window.addEventListener("resize", () => this.resize());
  }

  onWheels(q) {
    return this.active && this.s.alpha > 0.5 && !!this.kit.fire && hitWheels(this.w, this.h, this.s.t, q);
  }

  resize() {
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.w = window.innerWidth;
    this.h = window.innerHeight;
    this.c.width = this.w * this.dpr;
    this.c.height = this.h * this.dpr;
  }

  tick(now = performance.now()) {
    if (this.w !== window.innerWidth || this.h !== window.innerHeight) this.resize();
    const s = this.s;
    // 照真實時間走（1/60 秒一格）：高刷新率螢幕上圈一樣飛 2.7 秒；切回分頁最多補 4 格
    this.debt = Math.min(4, this.debt + (this.last ? ((now - this.last) * 60) / 1000 : 1));
    this.last = now;
    if (this.debt < 1) return;
    for (let i = 0; this.debt >= 1; i++, this.debt--) {
      stepWeapons(s, { W: this.w, H: this.h, active: this.active, random: Math.random, click: i === 0 ? this.click : null, hold: this.holder !== null });
    }
    this.click = null;
    if (!this.active && this.over) document.body.classList.toggle("over-ring", (this.over = false));
    const ctx = this.ctx;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, this.w, this.h);
    if (s.alpha <= 0) return;
    this.drawWheels(ctx);
    this.drawSpear(ctx);
    this.drawSparks(ctx);
    this.drawRing(ctx);
  }

  drawWheels(ctx) {
    const { fire, fireImg, wheelImg } = this.kit;
    if (!fire || !this.mixer) return;
    const p = wheelsPose(this.w, this.h, this.s.t);
    const k = p.w / fire.width;
    const { ox, oy } = this; // 原本的格子在小畫布裡的位置
    const MW = this.mixer.width;
    const MH = this.mixer.height;
    const fs = flameScale(this.s);
    const { a, b, w } = flapFrame(this.s.t, fire.frames);
    const m = this.mixer.getContext("2d");
    m.globalCompositeOperation = "source-over";
    m.globalAlpha = 1;
    m.clearRect(0, 0, MW, MH);
    // 火焰：原本的火不動（內緣貼著輪框），按著的時候再疊一層「以輪心放大」的火，越按越明顯 → 火變大、變旺。
    const extra = this.s.rev * 0.4; // 放大那層有多濃（太濃火會疊到發白）
    const frames = [[fire.frames[a], 1 - w], [fire.frames[b], w]];
    const [L, R] = fire.wheels;
    const boost = extra > 0.01 && fire.wheels.length === 2 && R.x - L.x > 1;
    if (!boost) {
      // 沒按（或資料不是一對輪子）：跟原本一樣，兩格照比例相加（火不會一格一格跳）
      m.globalCompositeOperation = "lighter";
      for (const [f, al] of frames) {
        if (al <= 0) continue;
        m.globalAlpha = al;
        m.drawImage(fireImg, f[0], f[1], f[2], f[3], ox, oy, fire.width, fire.height);
      }
    }
    // 放大那層每個輪子各畫一次（以自己的輪心），左邊的蓋「左邊不透明、往中間淡掉」的漸層，右邊的反過來，
    // 兩邊在中間柔柔地接起來；原本的火也跟著一起分兩半畫，加起來剛好 = 一整張
    const mid = boost ? ox + (L.x + R.x) / 2 : 0;
    const ramp = boost ? (R.x - L.x) * 0.25 : 0;
    const hc = this.half.getContext("2d");
    for (const [wh, left] of boost ? [[L, true], [R, false]] : []) {
      hc.globalCompositeOperation = "source-over";
      hc.globalAlpha = 1;
      hc.clearRect(0, 0, MW, MH);
      hc.save();
      hc.translate(ox + wh.x, oy + wh.y);
      hc.scale(fs, fs);
      hc.translate(-wh.x, -wh.y);
      hc.globalCompositeOperation = "lighter";
      for (const [f, al] of frames) {
        if (al <= 0) continue;
        hc.globalAlpha = al * extra;
        hc.drawImage(fireImg, f[0], f[1], f[2], f[3], 0, 0, fire.width, fire.height);
      }
      hc.restore();
      // 放大那層裡也有放大的輪子（影片裡的）：挖掉，只留火
      hc.globalCompositeOperation = "destination-out";
      hc.globalAlpha = 1;
      hc.beginPath();
      hc.arc(ox + wh.x, oy + wh.y, wh.r * fs * 1.02, 0, Math.PI * 2);
      hc.fill();
      // 原本的火
      hc.globalCompositeOperation = "lighter";
      for (const [f, al] of frames) {
        if (al <= 0) continue;
        hc.globalAlpha = al;
        hc.drawImage(fireImg, f[0], f[1], f[2], f[3], ox, oy, fire.width, fire.height);
      }
      const g = hc.createLinearGradient(mid - ramp, 0, mid + ramp, 0);
      g.addColorStop(0, left ? "#000" : "rgba(0,0,0,0)");
      g.addColorStop(1, left ? "rgba(0,0,0,0)" : "#000");
      hc.globalCompositeOperation = "destination-in";
      hc.globalAlpha = 1;
      hc.fillStyle = g;
      hc.fillRect(0, 0, MW, MH);
      m.globalCompositeOperation = "lighter";
      m.drawImage(this.half, 0, 0);
    }
    // 輪子：蓋在影片的輪子上轉（先把影片裡那個不會轉的輪子挖掉，不然輻條之間會看到兩組輻條）
    m.globalAlpha = 1;
    for (const wh of fire.wheels) {
      const cx = ox + wh.x;
      const cy = oy + wh.y;
      m.globalCompositeOperation = "destination-out";
      m.beginPath();
      m.arc(cx, cy, wh.r, 0, Math.PI * 2);
      m.fill();
      m.globalCompositeOperation = "source-over";
      m.save();
      m.translate(cx, cy);
      m.rotate(this.s.wheelAngle);
      m.drawImage(wheelImg, wh.src[0], wh.src[1], wh.src[2], wh.src[3], -wh.r, -wh.r, wh.r * 2, wh.r * 2);
      m.restore();
    }
    ctx.globalAlpha = this.s.alpha;
    ctx.drawImage(this.mixer, p.x - p.w / 2 - ox * k, p.y - (fire.height * k) / 2 - oy * k, MW * k, MH * k);
    ctx.globalAlpha = 1;
  }

  drawSpear(ctx) {
    const p = spearPose(this.w, this.h, this.s.t);
    ctx.globalAlpha = this.s.alpha;
    ctx.drawImage(this.kit.spear, p.x - p.w / 2, p.y - p.h / 2, p.w, p.h);
    // 槍尖的火輕輕一明一暗
    const t = this.s.t;
    const r = p.h * 0.09 * (1 + 0.12 * Math.sin(t * 0.09) + 0.06 * Math.sin(t * 0.23));
    const g = ctx.createRadialGradient(p.tip.x, p.tip.y, 0, p.tip.x, p.tip.y, r);
    g.addColorStop(0, "rgba(255, 200, 110, 0.45)");
    g.addColorStop(1, "rgba(255, 120, 40, 0)");
    ctx.globalCompositeOperation = "lighter";
    ctx.fillStyle = g;
    ctx.fillRect(p.tip.x - r, p.tip.y - r, r * 2, r * 2);
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;
  }

  drawSparks(ctx) {
    ctx.globalCompositeOperation = "lighter";
    for (const e of this.s.sparks) {
      ctx.globalAlpha = e.alpha * this.s.alpha;
      const r = e.size * 3;
      const g = ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, r);
      g.addColorStop(0, "rgba(255, 235, 180, 1)");
      g.addColorStop(0.4, "rgba(255, 150, 60, 0.6)");
      g.addColorStop(1, "rgba(255, 110, 40, 0)");
      ctx.fillStyle = g;
      ctx.fillRect(e.x - r, e.y - r, r * 2, r * 2);
    }
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;
  }

  drawRing(ctx) {
    const { ring } = this.kit;
    const p = ringPose(this.s, this.w, this.h);
    const h = p.size;
    const w = (h * ring.width) / ring.height;
    ctx.save();
    ctx.globalAlpha = this.s.alpha;
    ctx.translate(p.x, p.y);
    // 平常輕輕左右擺；飛出去的時候快速旋轉
    ctx.rotate(p.spin + 0.12 * Math.sin(p.turn));
    ctx.drawImage(ring, -w / 2, -h / 2, w, h);
    ctx.restore();
  }
}

export async function loadWeaponsKit() {
  const img = (u) =>
    new Promise((res, rej) => {
      const im = new Image();
      im.onload = () => res(im);
      im.onerror = rej;
      im.src = u;
    });
  try {
    const [ring, spear] = await Promise.all([img("assets/elements/qiankunquan.webp"), img("assets/elements/huojianqiang.webp")]);
    return { ring, spear };
  } catch (_) {
    return null;
  }
}

// 風火輪（火焰圖集＋輪子圓盤）：載不到就不出現，圈和槍照樣有
function loadFire() {
  const img = (u) =>
    new Promise((res, rej) => {
      const im = new Image();
      im.onload = () => res(im);
      im.onerror = rej;
      im.src = u;
    });
  return Promise.all([fetch("assets/elements/fenghuolun.json").then((r) => r.json()), img("assets/elements/fenghuolun.webp"), img("assets/elements/fenghuolun-wheel.webp")])
    .then(([fire, fireImg, wheelImg]) => ({ fire, fireImg, wheelImg }))
    .catch(() => null);
}
