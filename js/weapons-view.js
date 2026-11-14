// 畫中壇元帥的乾坤圈、火尖槍和槍尖的火星（js/weapons.js 決定怎麼動，這裡只負責畫）。
import { createWeapons, stepWeapons, ringPose, spearPose } from "./weapons.js";

export class WeaponsView {
  constructor(canvas, kit) {
    this.c = canvas;
    this.ctx = canvas.getContext("2d");
    this.kit = kit; // { ring, spear }
    this.s = createWeapons();
    this.active = false;
    this.click = null;
    this.over = false;
    this.last = 0; // 上一次畫的時間
    this.debt = 0; // 還沒走的時間（格）
    window.addEventListener("pointerdown", (e) => {
      if (e.target.closest && e.target.closest("button, a, nav, header")) return;
      this.click = { x: e.clientX, y: e.clientY };
    });
    // 滑鼠移到圈上：手指游標（提示可以點）
    window.addEventListener("pointermove", (e) => {
      const p = ringPose(this.s, this.w, this.h);
      const over = this.active && !this.s.thrown && Math.hypot(e.clientX - p.x, e.clientY - p.y) < p.size * 0.6;
      if (over !== this.over) document.body.classList.toggle("over-ring", (this.over = over));
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
    // 照真實時間走（1/60 秒一格）：高刷新率螢幕上圈一樣飛 2.7 秒；切回分頁最多補 4 格
    this.debt = Math.min(4, this.debt + (this.last ? ((now - this.last) * 60) / 1000 : 1));
    this.last = now;
    if (this.debt < 1) return;
    for (let i = 0; this.debt >= 1; i++, this.debt--) {
      stepWeapons(s, { W: this.w, H: this.h, active: this.active, random: Math.random, click: i === 0 ? this.click : null });
    }
    this.click = null;
    if (!this.active && this.over) document.body.classList.toggle("over-ring", (this.over = false));
    const ctx = this.ctx;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, this.w, this.h);
    if (s.alpha <= 0) return;
    this.drawSpear(ctx);
    this.drawSparks(ctx);
    this.drawRing(ctx);
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
