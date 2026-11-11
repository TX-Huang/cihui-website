// 畫瑤池金母頁的蟠桃樹（js/peach.js 決定位置、什麼時候飄、飄到哪，這裡只負責畫）。
// 點樹變成 LINE 的 QR code：樹搖一下，桃花瓣翻轉飄落到旁邊的宣紙卡片上，像墨滴一樣暈開成格子。
// 下面一行字和「打開 LINE」連結是一般的網頁元素（字比較清楚，鍵盤和讀屏也用得到）。
import {
  treeRect,
  qrBox,
  assignParticles,
  petalPose,
  treeSway,
  createPeach,
  stepPeach,
  togglePeach,
  hitPeach,
  cardAlpha,
  hintPose,
  QR_DARK,
  QR_LIGHT
} from "./peach.js";
import { LINE_QR, LINE_URL } from "./line-qr.js";

export class PeachView {
  constructor(canvas, img, ui, { still = false } = {}) {
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
    // 不含捲軸的寬度：畫布（position: fixed、寬 100%）實際就這麼寬，QR 才不會被擠扁
    this.w = document.documentElement.clientWidth;
    this.h = window.innerHeight;
    this.c.width = Math.round(this.w * this.dpr);
    this.c.height = Math.round(this.h * this.dpr);
    this.tree = treeRect(this.w, this.h, this.img.width / this.img.height);
    // 右邊的神明選單：卡片不蓋過去（蓋到的話點卡片會換頁）
    const rail = document.getElementById("rail");
    const r = rail ? rail.getBoundingClientRect() : null;
    const right = r && r.width && r.left > this.w / 2 ? Math.min(this.w - 12, r.left - 8) : this.w - 12;
    this.box = qrBox(LINE_QR.length, this.tree, this.w, this.h, { right });
  }

  tick() {
    if (this.w !== document.documentElement.clientWidth || this.h !== window.innerHeight) this.resize();
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
    this.drawPetals();
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

  // 樹搖一下，花瓣翻轉飄落，落下後像墨一樣暈開
  drawPetals() {
    const { ctx, s, tree, box } = this;
    this.drawTree(1, treeSway(s.t));
    this.drawCard(cardAlpha(s.t));
    if (s.t <= 0) return;
    const m = box.m;
    // 先畫墨（在下面），再畫還在飄的花瓣（在上面）
    ctx.fillStyle = QR_DARK;
    // 已經暈好的格子一起畫成一個形狀：相鄰的格子之間不會有細縫（螢幕縮放 125%、150% 時）
    const done = new Path2D();
    for (const p of this.parts) {
      const q = (p.q = petalPose(p, s.t, tree, box));
      if (q.ink <= 0) continue;
      if (q.ink >= 1) {
        done.rect(q.x - m / 2, q.y - m / 2, m, m);
        continue;
      }
      ctx.globalAlpha = s.alpha * q.ink;
      const sz = m * (0.35 + 0.65 * q.ink);
      roundRect(ctx, q.x - sz / 2, q.y - sz / 2, sz, sz, (sz / 2) * (1 - q.ink));
      ctx.fill();
    }
    ctx.globalAlpha = s.alpha;
    ctx.fill(done);
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

  // 說明文字：樹的時候在樹下（「點蟠桃樹 · 道場 LINE」），QR 的時候在卡片下（「用手機掃描…」＋打開 LINE）
  // 慢慢從樹下滑到卡片下（hintPose），換字時剛好是透明的，「打開 LINE」最後才浮現
  place() {
    const { ui, s, tree, box } = this;
    const h = hintPose(s.t, tree, box, this.h);
    ui.box.style.opacity = String(s.alpha);
    ui.box.style.visibility = s.alpha > 0.02 ? "visible" : "hidden";
    const want = h.qr ? "用手機掃描 · 加入道場 LINE" : "點蟠桃樹 · 道場 LINE";
    if (ui.hint.textContent !== want) ui.hint.textContent = want;
    ui.hint.style.opacity = String(h.textAlpha);
    ui.hint.setAttribute("aria-expanded", String(h.qr));
    // 「打開 LINE」掛在說明文字右邊（不撐寬整行，浮現的時候整行才不會跳）；看不到時也點不到、讀屏也跳過
    ui.link.style.visibility = h.linkAlpha > 0 && s.alpha > 0.02 ? "visible" : "hidden";
    ui.link.style.opacity = String(h.linkAlpha);
    // 置中對齊，但整行一定留在畫面裡（手機上樹很靠右）。寬度只在換字那一刻（透明時）改變
    const bw = ui.hint.offsetWidth + (h.qr ? ui.link.offsetWidth + 6 : 0);
    const left = Math.max(8, Math.min(this.w - 8 - bw, h.cx - bw / 2));
    ui.box.style.transform = `translate(${Math.round(left)}px, ${Math.round(h.top)}px)`;
  }
}

// 樹冠上的點（圖上的比例）：樹圖上半部、不透明的地方
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
      if (d[i + 3] > 245) pts.push({ x: (x + 0.5) / w, y: (y + 0.5) / h });
    }
  return pts.length ? pts : [{ x: 0.5, y: 0.3 }];
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
