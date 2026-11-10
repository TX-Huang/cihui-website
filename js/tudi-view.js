// 畫福德正神頁的稻穗和虎爺（js/rice.js、js/tiger.js 決定怎麼動，這裡只負責畫）。
// 稻子用一張直的稻穗圖（assets/elements/rice.webp），切成一段一段，每段照彎的程度斜一點，接起來就是彎的稻子。
// 順序：後排稻子 → 虎爺 → 前排稻子（虎爺像躲在稻穗裡）。
import { createField, stepField, resizeField } from "./rice.js";
import { createTiger, stepTiger, tigerBox, tigerPose } from "./tiger.js";

const SLICES = 10; // 每根稻子切幾段
const FRONT = 0.55; // depth 超過這個算前排（畫在虎爺前面）

export class TudiView {
  constructor(canvas, kit) {
    this.c = canvas;
    this.ctx = canvas.getContext("2d");
    this.kit = kit; // { meta, rice, tiger }：圖和大小
    this.active = false;
    this.tiger = createTiger();
    this.mouse = { x: -9999, y: -9999, vx: 0, vy: 0 };
    this.click = null;
    this.age = 0;
    window.addEventListener("pointermove", (e) => {
      if (this.mouse.x > -9000) {
        this.mouse.vx = e.clientX - this.mouse.x;
        this.mouse.vy = e.clientY - this.mouse.y;
      }
      this.mouse.x = e.clientX;
      this.mouse.y = e.clientY;
      this.hoverCursor();
    });
    window.addEventListener("pointerdown", (e) => {
      // 按鈕、連結、選單上的點擊不算（例如底下的字型出處連結剛好在虎爺旁邊）
      if (e.target.closest && e.target.closest("button, a, nav, header")) return;
      this.click = { x: e.clientX, y: e.clientY };
    });
    this.resize();
    window.addEventListener("resize", () => this.resize());
  }

  resize() {
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.w = window.innerWidth;
    this.h = window.innerHeight;
    this.c.width = this.w * this.dpr;
    this.c.height = this.h * this.dpr;
    // 第一次：種一片田；之後換畫面大小：同一片稻子照比例搬過去（不重新種，畫面才不會跳）
    if (this.field) resizeField(this.field, this.w, this.h);
    else this.field = createField({ w: this.w, h: this.h, random: Math.random });
  }

  // 滑鼠移到虎爺身上：游標變成手指（提示可以點）
  hoverCursor() {
    const b = tigerBox(this.w, this.h);
    const m = this.mouse;
    const over = this.active && m.x >= b.x0 && m.x <= b.x1 && m.y >= b.y0 && m.y <= b.y1;
    document.body.classList.toggle("over-tiger", over);
  }

  tick() {
    if (this.w !== window.innerWidth || this.h !== window.innerHeight) this.resize();
    if (this.w < 50) return;
    const e = { w: this.w, h: this.h, active: this.active, mouse: this.mouse, click: this.click };
    stepField(this.field, e);
    stepTiger(this.tiger, e);
    this.click = null;
    this.hoverCursor(); // 換頁時游標也要變回來（就算滑鼠沒動）
    this.mouse.vx *= 0.6;
    this.mouse.vy *= 0.6;
    this.age += 1;
    this.draw();
  }

  draw() {
    const { ctx } = this;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.c.width, this.c.height);
    if (this.field.alpha <= 0) return;
    const stalks = this.field.stalks;
    for (const s of stalks) if (s.depth <= FRONT) this.stalk(s);
    this.drawTiger();
    for (const s of stalks) if (s.depth > FRONT) this.stalk(s);
    ctx.globalAlpha = 1;
  }

  // 一根稻子：切成幾段，每段照那一段的斜率斜過去，接起來就是一條平順的彎
  stalk(s) {
    const { ctx, dpr } = this;
    const { rice } = this.kit;
    const iw = rice.width;
    const ih = rice.height;
    const sc = s.h / ih; // 圖 → 畫面
    const bx = this.kit.meta.rice.baseX * iw; // 莖底在圖裡的位置
    ctx.globalAlpha = this.field.alpha * (0.72 + 0.28 * s.depth); // 後排淡一點（遠）
    const dx = (u) => s.b * s.h * u * u; // 高度比例 u 的地方往旁邊偏多少
    for (let i = 0; i < SLICES; i++) {
      const u0 = i / SLICES;
      const u1 = (i + 1) / SLICES;
      const slope = (dx(u1) - dx(u0)) / (s.h * (u1 - u0));
      const x0 = s.x + dx(u0);
      const y0 = s.base - s.h * u0;
      ctx.setTransform(dpr * s.flip, 0, -slope * dpr, dpr, x0 * dpr, y0 * dpr);
      const sy = ih * (1 - u1); // 這段在圖裡的上緣
      const sh = ih * (u1 - u0);
      const src = Math.min(sh + 1, ih - sy); // 多取一點點蓋住接縫，但不超出圖
      ctx.drawImage(rice, 0, sy, iw, src, -bx * sc, -sh * sc - 0.5, iw * sc, src * sc);
    }
  }

  drawTiger() {
    const { ctx, dpr } = this;
    const b = tigerBox(this.w, this.h);
    const p = tigerPose(this.tiger);
    const bw = b.x1 - b.x0;
    const bh = b.y1 - b.y0;
    const breathe = 1 + 0.01 * Math.sin(this.age * 0.05); // 微微呼吸
    ctx.globalAlpha = this.tiger.alpha;
    // 以屁股（右下角）為軸往後仰，頭（左邊）就抬起來
    ctx.setTransform(dpr, 0, 0, dpr, b.x1 * dpr, b.y1 * dpr);
    ctx.rotate(-p.angle);
    ctx.translate(0, -p.rise * bw);
    ctx.scale(1, breathe);
    ctx.drawImage(this.kit.tiger, -bw, -bh, bw, bh);
  }
}

export async function loadTudiKit() {
  const img = (u) =>
    new Promise((res, rej) => {
      const im = new Image();
      im.onload = () => res(im);
      im.onerror = rej;
      im.src = u;
    });
  try {
    const [meta, rice, tiger] = await Promise.all([
      fetch("assets/elements/elements.json").then((r) => r.json()),
      img("assets/elements/rice.webp"),
      img("assets/elements/tiger.webp")
    ]);
    return { meta, rice, tiger };
  } catch (_) {
    return null;
  }
}
