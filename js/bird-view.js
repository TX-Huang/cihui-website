// 畫青鳥（js/birds.js 決定牠們在哪、在做什麼，這裡只負責畫）。
// 飛的時候：往上／展翅／往下三格輪流（翻頁動畫，直接切換），拍幾下滑翔一段，身體跟著起伏。
// 停著：側面那張；偶爾換成正面（像轉過來看你）；轉身時跳一下。
import { createFlock, stepFlock } from "./birds.js";

const FLY_LEN = 160; // 飛行時整隻鳥多長（大門設計座標）
const PERCH_H = 115; // 停著時多高（大門設計座標）
const FLY_FEET = [0.625, 0.755];
const FLAP_ORDER = ["up", "mid", "down", "mid"]; // 往上 → 展翅 → 往下 → 展翅
const SETTLE = 12; // 落地後幾格內輕輕一沉再站直 // 飛行圖裡腳的位置（比例）：飛和停用同一個點，降落時才不會跳

export class BirdView {
  constructor(canvas, kit, gate, gateEl) {
    this.c = canvas;
    this.ctx = canvas.getContext("2d");
    this.kit = kit; // { meta, img }
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
      if (b.state !== "perched") this.drawFlying(b, k, P, meta);
      else this.drawPerched(b, k, P, meta);
    }
  }

  // 飛：三格直接切換（不淡入淡出，才不會有重影）；拍翅膀時身體跟著上下起伏；
  // 滑翔時翅膀張開不動；快降落時翅膀舉高、頭抬起來煞車
  drawFlying(b, k, P, meta) {
    let name;
    if (b.brake) name = b.flap % 1 < 0.6 ? "up" : "mid";
    else if (b.glide > 0) name = "mid";
    else name = FLAP_ORDER[Math.floor(((b.flap % 1) + 1) % 1 * 4)];
    // 往下拍時身體往上浮：用拍翅膀的相位算，滑翔時慢慢回到 0
    const target = b.glide > 0 ? 0 : Math.sin(b.flap * Math.PI * 2) * 0.035 * FLY_LEN * k;
    const bob = lerp(this.bob.get(b) ?? target, target, 0.35);
    this.bob.set(b, bob);
    const s = (FLY_LEN * k) / meta.flyLength;
    // 往右飛：照路線方向傾斜；往左飛：鏡像
    const tilt = b.facing > 0 ? b.angle : Math.PI - b.angle;
    let bank = Math.max(-0.55, Math.min(0.55, Math.atan2(Math.sin(tilt), Math.cos(tilt))));
    if (b.brake) bank -= 0.3; // 抬頭
    const p = P[name];
    this.sprite(p, b.x, b.y - bob, b.facing, b.facing > 0 ? bank : -bank, s, s, [p.rect[2] * FLY_FEET[0], p.rect[3] * FLY_FEET[1]]);
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
    this.sprite(p, b.x, b.y - hopY, b.facing, 0, s * sx, s * sy, p.pivot);
  }

  sprite(part, x, y, facing, angle, sx, sy, pivot) {
    const { ctx } = this;
    const [rx, ry, rw, rh] = part.rect;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(facing, 1);
    ctx.rotate(angle);
    ctx.scale(sx, sy);
    ctx.drawImage(this.kit.img, rx, ry, rw, rh, -pivot[0], -pivot[1], rw, rh);
    ctx.restore();
  }
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

export async function loadBirdKit(name) {
  try {
    const meta = await fetch(`assets/birds/${name}.json`).then((r) => r.json());
    const img = await new Promise((res, rej) => {
      const im = new Image();
      im.onload = () => res(im);
      im.onerror = rej;
      im.src = `assets/birds/${name}.webp`;
    });
    return { meta, img };
  } catch (_) {
    return null;
  }
}
