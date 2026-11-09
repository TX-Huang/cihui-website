// 畫青鳥（js/birds.js 決定牠們在哪、在做什麼，這裡只負責畫）。
// 飛的時候：影片拆出來的 36 格依序播（tools/prep_bird_video.py），拍一兩下滑翔一段，身體跟著起伏。
// 停著：側面那張；偶爾換成正面（像轉過來看你）；轉身時跳一下。
import { createFlock, stepFlock } from "./birds.js";

const FLY_LEN = 190; // 飛行時整隻鳥多長（大門設計座標）
const PERCH_H = 115; // 停著時多高（大門設計座標）
const SETTLE = 12; // 落地後幾格內輕輕一沉再站直

export class BirdView {
  constructor(canvas, kit, gate, gateEl) {
    this.c = canvas;
    this.ctx = canvas.getContext("2d");
    this.kit = kit; // { meta, img：停著的圖, fly, flyImg：拍翅膀的 36 格 }
    this.gate = gate;
    this.gateEl = gateEl;
    this.flock = createFlock();
    this.mouse = { x: -9999, y: -9999, speed: 0 };
    this.active = true;
    this.bob = new Map(); // 每隻鳥：身體上下起伏（平滑過）
    window.addEventListener("pointermove", (e) => {
      this.mouse.speed = Math.hypot(e.clientX - this.mouse.x, e.clientY - this.mouse.y);
      this.mouse.x = e.clientX;
      this.mouse.y = e.clientY;
    });
    window.addEventListener("pointerdown", (e) => {
      // 點一下也會嚇到附近的鳥
      this.mouse.x = e.clientX;
      this.mouse.y = e.clientY;
      this.mouse.speed = 99;
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

  // 大門設計座標 → 畫面座標
  frame() {
    const r = this.gateEl.getBoundingClientRect();
    const k = r.width / this.gate.w;
    return { r, k };
  }

  tick() {
    if (this.w !== window.innerWidth || this.h !== window.innerHeight) this.resize();
    if (this.w < 50) return;
    const { r, k } = this.frame();
    const perches = this.gate.perches;
    const env = {
      w: this.w,
      h: this.h,
      active: this.active,
      mouse: this.mouse,
      perchCount: perches.length,
      perch: (i) => ({ x: r.left + perches[i].x * k, y: r.top + perches[i].y * k, face: perches[i].face }),
      visible: (i) => {
        const x = r.left + perches[i].x * k;
        return x > 40 && x < this.w - 40;
      },
      random: Math.random
    };
    stepFlock(this.flock, env);
    this.mouse.speed *= 0.8;
    this.draw(k);
  }

  draw(k) {
    const { ctx } = this;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, this.w, this.h);
    const { meta, img } = this.kit;
    const P = meta.parts;
    for (const b of this.flock.birds) {
      if (b.state === "gone" || b.state === "wait") {
        this.bob.delete(b);
        continue;
      }
      if (b.state !== "perched") this.drawFlying(b, k);
      else this.drawPerched(b, k, P, meta);
    }
  }

  // 飛：用影片拆出來的 36 格（一下完整的拍翅膀）依序播；滑翔時停在翅膀最平的那格；
  // 拍翅膀時身體跟著上下起伏（往下拍時往上浮）；快降落時抬頭煞車
  drawFlying(b, k) {
    const fly = this.kit.fly;
    const n = fly.frames.length;
    const idx = b.glide > 0 ? fly.glideFrame : Math.floor((((b.flap % 1) + 1) % 1) * n) % n;
    const target = b.glide > 0 ? 0 : Math.sin((b.flap - 0.45) * Math.PI * 2) * 0.03 * FLY_LEN * k;
    const bob = lerp(this.bob.get(b) ?? target, target, 0.25);
    this.bob.set(b, bob);
    const s = (FLY_LEN * k) / fly.length;
    // 往右飛：照路線方向傾斜；往左飛：鏡像
    const tilt = b.facing > 0 ? b.angle : Math.PI - b.angle;
    let bank = Math.max(-0.5, Math.min(0.5, Math.atan2(Math.sin(tilt), Math.cos(tilt))));
    if (b.brake) bank -= 0.3; // 抬頭
    this.sprite(this.kit.flyImg, fly.frames[idx], b.x, b.y - bob, b.facing, b.facing > 0 ? bank : -bank, s, s, fly.pivot);
  }

  // 停：剛落地輕輕一沉再站直；平常微微呼吸；轉身時跳一下
  drawPerched(b, k, P, meta) {
    const s = (PERCH_H * k) / meta.perchHeight;
    let sx = 1;
    let sy = 1;
    if (b.landed < SETTLE) {
      const t = 1 - (1 - b.landed / SETTLE) ** 3;
      sy = 0.88 + 0.12 * t;
      sx = 1.06 - 0.06 * t;
    }
    sy *= 1 + 0.012 * Math.sin(b.age * 0.09);
    const hopY = b.hop < 14 ? Math.sin((Math.PI * b.hop) / 14) * 0.06 * PERCH_H * k : 0;
    const p = b.pose === "front" ? P.front : P.perch;
    this.sprite(this.kit.img, p.rect, b.x, b.y - hopY, b.facing, 0, s * sx, s * sy, p.pivot);
  }

  sprite(img, rect, x, y, facing, angle, sx, sy, pivot) {
    const { ctx } = this;
    const [rx, ry, rw, rh] = rect;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(facing, 1);
    ctx.rotate(angle);
    ctx.scale(sx, sy);
    ctx.drawImage(img, rx, ry, rw, rh, -pivot[0], -pivot[1], rw, rh);
    ctx.restore();
  }
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

export async function loadBirdKit(name) {
  const img = (u) =>
    new Promise((res, rej) => {
      const im = new Image();
      im.onload = () => res(im);
      im.onerror = rej;
      im.src = u;
    });
  try {
    const [meta, fly, perchImg, flyImg] = await Promise.all([
      fetch(`assets/birds/${name}.json`).then((r) => r.json()),
      fetch(`assets/birds/${name}-fly.json`).then((r) => r.json()),
      img(`assets/birds/${name}.webp`),
      img(`assets/birds/${name}-fly.webp`)
    ]);
    return { meta, img: perchImg, fly, flyImg };
  } catch (_) {
    return null;
  }
}
