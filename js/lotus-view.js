// 畫中壇元帥頁的蓮花（js/lotus.js 決定什麼時候開、開到哪，這裡只負責畫）。
// 荷葉是從正上方看的圓葉，壓扁一點像平躺在水面上；花苞從荷葉中間長出來，再換成開好的花。
import { createPond, stepPond, lotusPose, fadeOutAll } from "./lotus.js";

export class LotusView {
  constructor(canvas, kit, gate, gateEl) {
    this.c = canvas;
    this.ctx = canvas.getContext("2d");
    this.kit = kit; // { open, bud, leaf }：三張圖
    this.gate = gate;
    this.gateEl = gateEl;
    this.pond = createPond();
    this.active = false;
    this.click = null;
    window.addEventListener("pointerdown", (e) => {
      // 按鈕、選單上的點擊不算
      if (e.target.closest && e.target.closest("button, a, nav, header")) return;
      this.click = { x: e.clientX, y: e.clientY };
    });
    this.resize();
    window.addEventListener("resize", () => this.resize());
  }

  resize() {
    const old = { w: this.w, h: this.h };
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.w = window.innerWidth;
    this.h = window.innerHeight;
    this.c.width = this.w * this.dpr;
    this.c.height = this.h * this.dpr;
    // 畫面大小真的變了（不算手機捲動時網址列伸縮那一點點），原本的位置可能跑進門洞或字上：
    // 已經開的慢慢淡掉
    if (old.w && (old.w !== this.w || Math.abs(old.h - this.h) > old.h * 0.1)) fadeOutAll(this.pond);
  }

  // 珠簾門洞裡不放蓮花（那裡是拉珠簾、敲風鈴的地方）；標題、說明文字上也不放（會擋住字）
  free(x, y) {
    const r = this.gateEl.getBoundingClientRect();
    if (r.width) {
      const k = r.width / this.gate.w;
      const d = this.gate.door;
      if (x > r.left + d.x0 * k && x < r.left + d.x1 * k && y > r.top + d.y0 * k && y < r.top + d.y1 * k) return false;
    }
    const pad = 70; // 花的半徑左右：花邊也不要蓋到字
    for (const el of document.querySelectorAll("#copy .heading, #copy .aside")) {
      const t = el.getBoundingClientRect();
      if (t.width && x > t.left - pad && x < t.right + pad && y > t.top - pad && y < t.bottom + pad) return false;
    }
    return true;
  }

  tick() {
    if (this.w !== window.innerWidth || this.h !== window.innerHeight) this.resize();
    if (this.w < 50) return;
    stepPond(this.pond, {
      w: this.w,
      h: this.h,
      active: this.active,
      click: this.click,
      free: (x, y) => this.free(x, y),
      random: Math.random
    });
    this.click = null;
    this.draw();
  }

  draw() {
    const { ctx } = this;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, this.w, this.h);
    for (const l of this.pond.lotus) this.lotus(l);
    ctx.globalAlpha = 1;
  }

  lotus(l) {
    const { ctx } = this;
    const { open, bud, leaf } = this.kit;
    const p = lotusPose(l);
    if (p.alpha <= 0) return;
    const x = l.x + p.dx;
    const y = l.y + p.dy;
    const s = l.size;
    // 荷葉：寬 1.5 朵花，壓扁成 0.45（平躺在水面上）
    const lw = s * 1.5 * (0.85 + 0.15 * p.leaf);
    const lh = lw * 0.45 * (leaf.height / leaf.width);
    ctx.globalAlpha = p.alpha * p.leaf * 0.92;
    ctx.drawImage(leaf, x - lw / 2, y - lh / 2, lw, lh);
    // 花苞：從荷葉中間長出來（越長越高），開花時慢慢淡出
    const budA = p.bud * (1 - p.open);
    if (budA > 0) {
      const bh = s * 0.95 * p.scale;
      const bw = bh * (bud.width / bud.height);
      ctx.globalAlpha = p.alpha * budA;
      ctx.drawImage(bud, x - bw / 2, y - bh + lh * 0.1, bw, bh);
    }
    // 開好的花：坐在荷葉中間
    if (p.open > 0) {
      const fw = s * (0.8 + 0.2 * p.open) * Math.max(p.scale, 0.8);
      const fh = fw * (open.height / open.width);
      ctx.globalAlpha = p.alpha * p.open;
      ctx.drawImage(open, x - fw / 2, y - fh * 0.78, fw, fh);
    }
  }
}

export async function loadLotusKit() {
  const img = (u) =>
    new Promise((res, rej) => {
      const im = new Image();
      im.onload = () => res(im);
      im.onerror = rej;
      im.src = u;
    });
  try {
    const [open, bud, leaf] = await Promise.all([
      img("assets/elements/lotus-open.webp"),
      img("assets/elements/lotus-bud.webp"),
      img("assets/elements/lotus-leaf.webp")
    ]);
    return { open, bud, leaf };
  } catch (_) {
    return null;
  }
}
