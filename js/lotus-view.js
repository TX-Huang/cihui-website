// 畫中壇元帥頁的蓮花（js/lotus.js 決定什麼時候開、開到哪，這裡只負責畫）。
// 荷葉是從正上方看的圓葉，壓扁一點像平躺在水面上；花苞從荷葉中間長出來，再換成開好的花。
import { createPond, stepPond, lotusPose, fadeOutAll } from "./lotus.js";

export class LotusView {
  constructor(canvas, kit, water) {
    this.c = canvas;
    this.ctx = canvas.getContext("2d");
    this.kit = kit; // { open, bud, leaf }：三張圖
    this.water = water; // (x, y) → 這裡看得到湖水嗎（水平線以下、不在大門和門洞後面）
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

  // 蓮花長在湖裡：只開在看得到湖水的地方（點在門上、天空、珠簾門洞都不開）；
  // 標題、說明文字上也不放（會擋住字）
  free(x, y) {
    if (!this.water(x, y)) return false;
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
    // 花苞：從荷葉中間長出來（越長越高）
    const base = y + lh * 0.1; // 花苞、花的底都踩在這裡
    const bh = s * 0.95 * p.scale;
    const bw = bh * (bud.width / bud.height);
    if (p.budA > 0) {
      ctx.globalAlpha = p.alpha * p.budA;
      ctx.drawImage(bud, x - bw / 2, base - bh, bw, bh);
    }
    // 開好的花：一開始收得跟花苞差不多窄、差不多高，再慢慢往外張開
    if (p.flowerA > 0) {
      const fullW = s;
      const fullH = fullW * (open.height / open.width);
      const fw = bw * 1.25 + (fullW - bw * 1.25) * p.spread;
      const fh = bh * 0.92 + (fullH - bh * 0.92) * p.spread;
      const drop = fullH * 0.22 * p.spread; // 全開時下面的花瓣垂到荷葉上
      ctx.globalAlpha = p.alpha * p.flowerA;
      ctx.drawImage(open, x - fw / 2, base - lh * 0.1 + drop - fh, fw, fh);
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
