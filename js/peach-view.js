// 畫瑤池金母頁的蟠桃樹（js/peach.js 決定位置、什麼時候飄、飄到哪，這裡只負責畫）。
// 點樹：樹慢慢變淡，樹冠上的葉子和花一片一片飄起來，排在象牙白的卡片上變成 LINE 的 QR code。
// 下面一行字和「打開 LINE」連結是一般的網頁元素（字比較清楚，鍵盤和讀屏也用得到）。
import { treeRect, qrBox, assignParticles, particlePose, createPeach, stepPeach, togglePeach, hitPeach, QR_DARK, QR_LIGHT } from "./peach.js";
import { LINE_QR, LINE_URL } from "./line-qr.js";

const smooth = (t) => {
  const x = Math.max(0, Math.min(1, t));
  return x * x * (3 - 2 * x);
};

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
    this.w = window.innerWidth;
    this.h = window.innerHeight;
    this.c.width = Math.round(this.w * this.dpr);
    this.c.height = Math.round(this.h * this.dpr);
    this.tree = treeRect(this.w, this.h, this.img.width / this.img.height);
    this.box = qrBox(LINE_QR.length, this.tree, this.w, this.h);
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
    const { ctx, s, tree, box } = this;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, this.w, this.h);
    if (s.alpha <= 0) return;
    // 樹：葉子飄走的時候慢慢變淡（留一點點樹幹的影子）
    ctx.globalAlpha = s.alpha * (1 - 0.88 * smooth(s.t / 0.55));
    ctx.drawImage(this.img, tree.x, tree.y, tree.w, tree.h);
    // QR 卡片：象牙白，細細的金邊
    const cardA = smooth((s.t - 0.3) / 0.45);
    if (cardA > 0) {
      const c = box.card;
      ctx.globalAlpha = s.alpha * cardA;
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
    // 葉子：飄的時候是圓圓的一片，到了格子變成方的
    if (s.t > 0) {
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
    ctx.globalAlpha = 1;
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
