// 畫瑤池金母頁的蟠桃樹（js/peach.js 決定位置、什麼時候飄、飄到哪，這裡只負責畫）。
// 點樹變成 LINE 的 QR code，有三種做法（網址 ?peach=petals / ?peach=scroll 切換，還在比較）：
//   leaves（預設）：樹慢慢變淡，樹冠上的葉子和花一片一片飄起來，排在象牙白的卡片上
//   petals：樹搖一下，桃花瓣翻轉飄落到宣紙上，像墨滴一樣暈開成格子
//   scroll：樹頂的蟠桃發光浮起，化成卷軸往下攤開，上面印著 QR
// 下面一行字和「打開 LINE」連結是一般的網頁元素（字比較清楚，鍵盤和讀屏也用得到）。
import {
  treeRect,
  qrBox,
  assignParticles,
  particlePose,
  petalPose,
  treeSway,
  scrollPose,
  PEACH_SPOT,
  createPeach,
  stepPeach,
  togglePeach,
  hitPeach,
  QR_DARK,
  QR_LIGHT
} from "./peach.js";
import { LINE_QR, LINE_URL } from "./line-qr.js";

const smooth = (t) => {
  const x = Math.max(0, Math.min(1, t));
  return x * x * (3 - 2 * x);
};

export class PeachView {
  constructor(canvas, img, ui, { still = false, mode = "leaves" } = {}) {
    this.mode = ["petals", "scroll"].includes(mode) ? mode : "leaves";
    this.c = canvas;
    this.ctx = canvas.getContext("2d");
    this.img = img;
    this.ui = ui; // { box, hint, link }
    this.s = createPeach({ still });
    this.active = false;
    this.click = null;
    this.parts = assignParticles(LINE_QR, crownPoints(img), Math.random);
    const pinks = ["#f6d3d8", "#f1c0c8", "#f8e0e2", "#efb7c0", "#fbe9e6"];
    for (const p of this.parts) p.pink = pinks[Math.floor(Math.random() * pinks.length)];
    ui.link.href = LINE_URL;
    this.cells = [];
    LINE_QR.forEach((r, row) => [...r].forEach((v, col) => v === "1" && this.cells.push([row, col])));
    ui.hint.addEventListener("click", () => togglePeach(this.s));
    // 先接住點擊（capture）：點到樹就不要再冒漣漪
    window.addEventListener(
      "pointerdown",
      (e) => {
        if (!this.active || this.s.alpha < 0.5) return;
        if (e.target.closest && e.target.closest("button, a, nav, header")) return;
        if (hitPeach(this.s, e.clientX, e.clientY, this.tree, this.box)) {
          this.click = true;
          e.peachTaken = true;
        }
      },
      true
    );
    // 滑鼠移到樹上：手指游標（提示可以點）
    window.addEventListener("pointermove", (e) => {
      const on = this.active && this.s.alpha > 0.5 && hitPeach(this.s, e.clientX, e.clientY, this.tree, this.box);
      document.documentElement.classList.toggle("peach-hover", on);
    });
    this.resize();
  }

  // (x, y) 被桃樹或 QR 卡片蓋住了嗎（珠簾、風鈴就不要反應）
  blocks(x, y) {
    return this.active && this.s.alpha > 0.5 && hitPeach(this.s, x, y, this.tree, this.box);
  }

  resize() {
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.w = window.innerWidth;
    this.h = window.innerHeight;
    this.c.width = Math.round(this.w * this.dpr);
    this.c.height = Math.round(this.h * this.dpr);
    this.tree = treeRect(this.w, this.h, this.img.width / this.img.height);
    this.box = qrBox(LINE_QR.length, this.tree, this.w, this.h, { beside: this.mode !== "leaves" });
  }

  tick() {
    if (this.w !== window.innerWidth || this.h !== window.innerHeight) this.resize();
    if (this.click) togglePeach(this.s);
    this.click = null;
    stepPeach(this.s, { active: this.active });
    this.draw();
    this.place();
  }

  draw() {
    const { ctx, s } = this;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, this.w, this.h);
    if (s.alpha <= 0) return;
    if (this.mode === "petals") this.drawPetals();
    else if (this.mode === "scroll") this.drawScroll();
    else this.drawLeaves();
    ctx.globalAlpha = 1;
  }

  // 樹（sway：繞樹根轉一點點）
  drawTree(alpha, sway = 0) {
    const { ctx, tree } = this;
    ctx.globalAlpha = this.s.alpha * alpha;
    if (!sway) return ctx.drawImage(this.img, tree.x, tree.y, tree.w, tree.h);
    ctx.save();
    ctx.translate(tree.x + tree.w / 2, tree.y + tree.h);
    ctx.rotate(sway);
    ctx.drawImage(this.img, -tree.w / 2, -tree.h, tree.w, tree.h);
    ctx.restore();
  }

  // 象牙白的卡片，細細的金邊
  drawCard(alpha) {
    if (alpha <= 0) return;
    const { ctx, box } = this;
    const c = box.card;
    ctx.globalAlpha = this.s.alpha * alpha;
    ctx.save();
    ctx.shadowColor = "rgba(60, 50, 40, 0.16)";
    ctx.shadowBlur = 24;
    ctx.shadowOffsetY = 6;
    ctx.fillStyle = QR_LIGHT;
    roundRect(ctx, c.x, c.y, c.w, c.h, box.m * 1.5);
    ctx.fill();
    ctx.restore();
    ctx.strokeStyle = "rgba(168, 132, 74, 0.55)";
    ctx.lineWidth = 1;
    roundRect(ctx, c.x + 0.5, c.y + 0.5, c.w - 1, c.h - 1, box.m * 1.5);
    ctx.stroke();
  }

  // 原本的做法：樹變淡，葉子飄起來排成格子
  drawLeaves() {
    const { ctx, s, tree, box } = this;
    this.drawTree(1 - 0.88 * smooth(s.t / 0.55));
    this.drawCard(smooth((s.t - 0.3) / 0.45));
    if (s.t <= 0) return;
    ctx.globalAlpha = s.alpha;
    for (const p of this.parts) {
      const q = particlePose(p, s.t, tree, box);
      ctx.fillStyle = q.e >= 1 ? QR_DARK : `rgb(${q.color[0]}, ${q.color[1]}, ${q.color[2]})`;
      const h = q.size / 2;
      if (q.e >= 1) ctx.fillRect(q.x - h, q.y - h, q.size, q.size);
      else {
        roundRect(ctx, q.x - h, q.y - h, q.size, q.size, h * (1 - q.e));
        ctx.fill();
      }
    }
  }

  // 做法一：樹搖一下，花瓣翻轉飄落，落下後像墨一樣暈開
  drawPetals() {
    const { ctx, s, tree, box } = this;
    this.drawTree(1, treeSway(s.t));
    this.drawCard(smooth(s.t / 0.3));
    if (s.t <= 0) return;
    const m = box.m;
    // 先畫墨（在下面），再畫還在飄的花瓣（在上面）
    ctx.fillStyle = QR_DARK;
    for (const p of this.parts) {
      const q = (p.q = petalPose(p, s.t, tree, box));
      if (q.ink <= 0) continue;
      ctx.globalAlpha = s.alpha * q.ink;
      if (q.ink >= 1) ctx.fillRect(q.x - m / 2, q.y - m / 2, m, m);
      else {
        const sz = m * (0.35 + 0.65 * q.ink);
        roundRect(ctx, q.x - sz / 2, q.y - sz / 2, sz, sz, (sz / 2) * (1 - q.ink));
        ctx.fill();
      }
    }
    for (const p of this.parts) {
      const q = p.q;
      if (q.alpha <= 0) continue;
      ctx.globalAlpha = s.alpha * q.alpha;
      ctx.fillStyle = p.pink;
      ctx.save();
      ctx.translate(q.x, q.y);
      ctx.rotate(q.angle);
      ctx.beginPath();
      // 翻轉：花瓣一下寬一下窄，像在空中翻面
      ctx.ellipse(0, 0, m * 0.65, m * 0.12 + m * 0.36 * Math.abs(Math.cos(q.angle * 0.7)), 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  // 做法二：蟠桃發光浮起、化成卷軸往下攤開
  drawScroll() {
    const { ctx, s, tree, box, img } = this;
    this.drawTree(1);
    if (s.t <= 0) return;
    const q = scrollPose(s.t, tree, box);
    const pk = q.peach;
    if (pk.alpha > 0) {
      // 淡淡的金光
      const g = ctx.createRadialGradient(pk.x, pk.y, pk.r * 0.4, pk.x, pk.y, pk.r * 2.4);
      g.addColorStop(0, `rgba(240, 214, 150, ${0.55 * pk.glow})`);
      g.addColorStop(1, "rgba(240, 214, 150, 0)");
      ctx.globalAlpha = s.alpha * pk.alpha;
      ctx.fillStyle = g;
      ctx.fillRect(pk.x - pk.r * 2.4, pk.y - pk.r * 2.4, pk.r * 4.8, pk.r * 4.8);
      // 從樹圖上剪下那顆桃子
      const sr = PEACH_SPOT.r * img.width;
      ctx.save();
      ctx.beginPath();
      ctx.arc(pk.x, pk.y, pk.r, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(img, PEACH_SPOT.x * img.width - sr, PEACH_SPOT.y * img.height - sr, sr * 2, sr * 2, pk.x - pk.r, pk.y - pk.r, pk.r * 2, pk.r * 2);
      ctx.restore();
    }
    if (q.roll <= 0) return;
    const p = q.paper;
    ctx.globalAlpha = s.alpha * q.roll;
    // 紙
    ctx.save();
    ctx.shadowColor = "rgba(60, 50, 40, 0.16)";
    ctx.shadowBlur = 20;
    ctx.shadowOffsetY = 5;
    ctx.fillStyle = QR_LIGHT;
    ctx.fillRect(p.x, p.y, p.w, p.h);
    ctx.restore();
    // QR：紙打開到哪就露到哪
    ctx.save();
    ctx.beginPath();
    ctx.rect(p.x, p.y, p.w, p.h);
    ctx.clip();
    ctx.fillStyle = QR_DARK;
    for (const c of this.cells) ctx.fillRect(box.x0 + c[1] * box.m, box.y0 + c[0] * box.m, box.m, box.m);
    ctx.restore();
    // 上下兩根軸：金色，兩端深一點
    for (const r of q.rods) {
      const g = ctx.createLinearGradient(0, r.y, 0, r.y + r.h);
      g.addColorStop(0, "#d8bd86");
      g.addColorStop(0.5, "#b8955a");
      g.addColorStop(1, "#8a6a35");
      ctx.fillStyle = g;
      roundRect(ctx, r.x, r.y, r.w, r.h, r.h / 2);
      ctx.fill();
      ctx.fillStyle = "#6e5226";
      roundRect(ctx, r.x - 4, r.y - 1, 8, r.h + 2, 3);
      ctx.fill();
      roundRect(ctx, r.x + r.w - 4, r.y - 1, 8, r.h + 2, 3);
      ctx.fill();
    }
  }

  // 說明文字：樹的時候在樹下（「點蟠桃樹 · 道場 LINE」），QR 的時候在卡片下（「用手機掃描…」＋打開 LINE）
  place() {
    const { ui, s, tree, box } = this;
    const qr = s.t > 0.5;
    ui.box.style.opacity = String(s.alpha);
    ui.box.style.visibility = s.alpha > 0.02 ? "visible" : "hidden";
    const want = qr ? "用手機掃描 · 加入道場 LINE" : "點蟠桃樹 · 道場 LINE";
    if (ui.hint.textContent !== want) ui.hint.textContent = want;
    ui.hint.setAttribute("aria-expanded", String(qr));
    ui.link.hidden = !qr;
    const cx = qr ? box.card.x + box.card.w / 2 : tree.x + tree.w / 2;
    const top = qr ? box.card.y + box.card.h + 12 : Math.min(this.h - 40, tree.y + tree.h - 8);
    // 置中對齊卡片或樹，但整行一定留在畫面裡（手機上樹很靠右）
    const bw = ui.box.offsetWidth;
    const left = Math.max(8, Math.min(this.w - 8 - bw, cx - bw / 2));
    ui.box.style.transform = `translate(${Math.round(left)}px, ${Math.round(top)}px)`;
  }
}

// 樹冠上的點（圖上的比例和顏色）：樹圖上半部、不透明的地方
function crownPoints(img) {
  const w = 120;
  const h = Math.round((w * img.height) / img.width);
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(img, 0, 0, w, h);
  const d = ctx.getImageData(0, 0, w, h).data;
  const pts = [];
  for (let y = 0; y < h * 0.66; y++)
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      // 只要樹本身（樹冠外那圈很淡的光暈不算）
      if (d[i + 3] > 245) pts.push({ x: (x + 0.5) / w, y: (y + 0.5) / h, color: [d[i], d[i + 1], d[i + 2]] });
    }
  return pts.length ? pts : [{ x: 0.5, y: 0.3, color: [90, 120, 90] }];
}

function roundRect(ctx, x, y, w, h, r) {
  const k = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + k, y);
  ctx.arcTo(x + w, y, x + w, y + h, k);
  ctx.arcTo(x + w, y + h, x, y + h, k);
  ctx.arcTo(x, y + h, x, y, k);
  ctx.arcTo(x, y, x + w, y, k);
  ctx.closePath();
}

export function loadPeachImage() {
  return new Promise((res) => {
    const im = new Image();
    im.onload = () => res(im);
    im.onerror = () => res(null); // 還沒有樹的圖：不顯示
    im.src = "assets/elements/peach-tree.webp";
  });
}
