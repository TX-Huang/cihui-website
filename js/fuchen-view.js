// 畫九天玄女的拂塵和它掃出來的雲氣（js/fuchen.js 決定怎麼動，這裡只負責畫）。
// 拂塵圖（assets/elements/fuchen.webp）：上面是玉柄（不彎），下面的毛切成一條一條橫的，
// 每一條照 hairOffset 往旁邊偏，接起來就是彎的毛。
import { fuchenAnchor, createFuchen, stepFuchen, hairOffset } from "./fuchen.js";

const STRIPS = 28; // 毛切成幾條

export class FuchenView {
  constructor(canvas, kit) {
    this.c = canvas;
    this.ctx = canvas.getContext("2d");
    this.kit = kit; // { meta, whisk, wisp }
    this.s = createFuchen();
    this.active = false;
    this.mouse = { x: -9999, y: -9999, vx: 0, vy: 0 };
    this.click = null;
    this.last = 0; // 上一次畫的時間
    this.debt = 0; // 還沒走的時間（格）
    window.addEventListener("pointermove", (e) => {
      // 一格裡可能有好幾次移動：加起來才是這一格滑鼠走了多遠
      if (this.mouse.x > -9000) {
        this.mouse.vx += e.clientX - this.mouse.x;
        this.mouse.vy += e.clientY - this.mouse.y;
      }
      this.mouse.x = e.clientX;
      this.mouse.y = e.clientY;
    });
    window.addEventListener("pointerdown", (e) => {
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
  }

  tick(now = performance.now()) {
    if (this.w !== window.innerWidth || this.h !== window.innerHeight) this.resize();
    const s = this.s;
    // 照真實時間走（1/60 秒一格）：高刷新率螢幕一樣慢；切回分頁最多補 4 格
    this.debt = Math.min(4, this.debt + (this.last ? ((now - this.last) * 60) / 1000 : 1));
    this.last = now;
    if (this.debt < 1) return;
    const n = Math.floor(this.debt);
    this.debt -= n;
    const mouse = { x: this.mouse.x, y: this.mouse.y, vx: this.mouse.vx / n, vy: this.mouse.vy / n };
    for (let i = 0; i < n; i++) {
      stepFuchen(s, { W: this.w, H: this.h, active: this.active, mouse, click: i === 0 ? this.click : null });
    }
    this.click = null;
    this.mouse.vx = 0;
    this.mouse.vy = 0;
    const ctx = this.ctx;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, this.w, this.h);
    if (s.alpha <= 0) return;
    this.drawWisps(ctx);
    this.drawWhisk(ctx);
  }

  drawWhisk(ctx) {
    const { whisk, meta } = this.kit;
    const a = fuchenAnchor(this.w, this.h);
    const k = a.len / whisk.height;
    const dw = whisk.width * k;
    const rootY = whisk.height * meta.root;
    ctx.save();
    ctx.globalAlpha = this.s.alpha;
    ctx.translate(a.x, a.y);
    // 整支跟著毛擺一點點（像手輕輕握著）
    ctx.rotate(this.s.bend * 0.0006);
    // 玉柄
    ctx.drawImage(whisk, 0, 0, whisk.width, rootY, -dw / 2, 0, dw, rootY * k);
    // 毛：一條一條往旁邊偏。每條是斜的（上緣偏 o0、下緣偏 o1，跟上下兩條剛好接上），毛才是連續的、不會一段一段
    const hairH = whisk.height - rootY;
    for (let i = 0; i < STRIPS; i++) {
      const sy = rootY + (hairH * i) / STRIPS;
      const sh = hairH / STRIPS;
      const o0 = hairOffset(i / STRIPS, this.s.bend);
      const o1 = hairOffset((i + 1) / STRIPS, this.s.bend);
      const y0 = sy * k;
      const dh = sh * k;
      const skew = (o1 - o0) / dh;
      ctx.save();
      ctx.transform(1, 0, skew, 1, o0 - skew * y0, 0);
      ctx.drawImage(whisk, 0, sy, whisk.width, sh + 1, -dw / 2, y0, dw, dh + k);
      ctx.restore();
    }
    ctx.restore();
  }

  drawWisps(ctx) {
    const { wisp } = this.kit;
    const a = fuchenAnchor(this.w, this.h);
    const ww = a.len * 0.9;
    const wh = (ww * wisp.height) / wisp.width;
    for (const w of this.s.wisps) {
      ctx.globalAlpha = w.alpha * this.s.alpha;
      // 飄的時候慢慢變大一點、散開
      const g = 1 + w.age / 600;
      ctx.drawImage(wisp, w.x - (ww * g) / 2, w.y - (wh * g) / 2, ww * g, wh * g);
    }
    ctx.globalAlpha = 1;
  }
}

export async function loadFuchenKit() {
  const img = (u) =>
    new Promise((res, rej) => {
      const im = new Image();
      im.onload = () => res(im);
      im.onerror = rej;
      im.src = u;
    });
  try {
    const [meta, whisk, wisp] = await Promise.all([
      fetch("assets/elements/weapons.json").then((r) => r.json()),
      img("assets/elements/fuchen.webp"),
      img("assets/elements/cloud-wisp.webp")
    ]);
    return { meta: meta.fuchen, whisk, wisp };
  } catch (_) {
    return null;
  }
}
