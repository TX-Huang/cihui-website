// 畫丹鳳（js/phoenix.js 決定牠在哪、在做什麼，這裡只負責畫）。
// 正面展翅、側面飛行都是影片拆出來的一格一格（tools/prep_phoenix_video.py），照拍翅位置依序播。
import { createPhoenix, stepPhoenix, frameIndex } from "./phoenix.js";

export class PhoenixView {
  constructor(canvas, kit, gate, gateEl) {
    this.c = canvas;
    this.gate = gate; // 大門設計座標（門洞、匾額在哪）
    this.gateEl = gateEl;
    this.ctx = canvas.getContext("2d");
    this.kit = kit; // { front, frontImg：正面展翅 100 格；side, sideImg：側面飛 56 格 }
    this.p = createPhoenix();
    this.active = false;
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

  tick() {
    if (this.w !== window.innerWidth || this.h !== window.innerHeight) this.resize();
    if (this.w < 50) return;
    stepPhoenix(this.p, { w: this.w, h: this.h, active: this.active, door: this.door(), random: Math.random });
    this.draw();
  }

  // 門洞中線、匾額下緣在畫面上的位置（丹鳳正面展翅時停在這裡，不擋匾額）
  door() {
    const r = this.gateEl.getBoundingClientRect();
    if (!r.width) return null;
    const k = r.width / this.gate.w;
    const { door, plaque } = this.gate;
    return { x: r.left + ((door.x0 + door.x1) / 2) * k, top: r.top + (plaque.cy + plaque.h / 2) * k };
  }

  draw() {
    const { ctx, p } = this;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, this.w, this.h);
    if (p.mode === "idle" || p.alpha <= 0) return;
    const isFront = p.mode === "front";
    const clip = isFront ? this.kit.front : this.kit.side;
    const img = isFront ? this.kit.frontImg : this.kit.sideImg;
    const [rx, ry, rw, rh] = clip.frames[frameIndex(p.flap, clip.frames.length)];
    const s = p.size / clip.width; // p.size＝整隻鳥（含翅膀、尾羽）畫多寬
    ctx.save();
    ctx.globalAlpha = p.alpha;
    ctx.imageSmoothingQuality = "high";
    ctx.translate(p.x, p.y);
    ctx.scale(p.facing * s, s); // 影片裡朝右；往左飛就左右翻
    ctx.drawImage(img, rx, ry, rw, rh, -rw / 2, -rh / 2, rw, rh);
    ctx.restore();
  }
}

export async function loadPhoenixKit() {
  const img = (u) =>
    new Promise((res, rej) => {
      const im = new Image();
      im.onload = () => res(im);
      im.onerror = rej;
      im.src = u;
    });
  try {
    const [front, side, frontImg, sideImg] = await Promise.all([
      fetch("assets/phoenix/phoenix-front.json").then((r) => r.json()),
      fetch("assets/phoenix/phoenix-side.json").then((r) => r.json()),
      img("assets/phoenix/phoenix-front.webp"),
      img("assets/phoenix/phoenix-side.webp")
    ]);
    return { front, side, frontImg, sideImg };
  } catch (_) {
    return null;
  }
}
