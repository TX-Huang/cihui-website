// 畫青鳥（js/birds.js 決定牠們在哪、在做什麼，這裡只負責畫）。
// 飛的時候：往上／展翅／往下三格輪流（翻頁動畫，中間淡入淡出）。
// 停著：側面那張；偶爾換成正面（像轉過來看你），淡入淡出。
import { flapPose, createFlock, stepFlock } from "./birds.js";

const FLY_LEN = 160; // 飛行時整隻鳥多長（大門設計座標）
const PERCH_H = 115; // 停著時多高（大門設計座標）
const FLY_FEET = [0.625, 0.755]; // 飛行圖裡腳的位置（比例）：飛和停用同一個點，降落時才不會跳

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
    this.fade = new Map(); // 每隻鳥：0 = 飛的圖、1 = 停的圖
    this.front = new Map(); // 每隻鳥：正面圖的比例
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
        this.fade.delete(b);
        this.front.delete(b);
        continue;
      }
      const perched = b.state === "perched";
      const f = lerp(this.fade.get(b) ?? 0, perched ? 1 : 0, 0.18);
      const fr = lerp(this.front.get(b) ?? 0, perched && b.pose === "front" ? 1 : 0, 0.08);
      this.fade.set(b, f);
      this.front.set(b, fr);
      // 飛的樣子
      if (f < 0.99) {
        const pose = flapPose(b.flap);
        const s = (FLY_LEN * k) / meta.flyLength;
        // 往右飛：照路線方向傾斜；往左飛：鏡像
        const tilt = b.facing > 0 ? b.angle : Math.PI - b.angle;
        const bank = Math.max(-0.55, Math.min(0.55, Math.atan2(Math.sin(tilt), Math.cos(tilt))));
        for (const [name, a] of [
          [pose.a, 1 - pose.mix],
          [pose.b, pose.mix]
        ]) {
          if (a <= 0.01) continue;
          const p = P[name];
          this.sprite(p, b.x, b.y, b.facing, b.facing > 0 ? bank : -bank, s, [p.rect[2] * FLY_FEET[0], p.rect[3] * FLY_FEET[1]], a * (1 - f));
        }
      }
      // 停著的樣子
      if (f > 0.01) {
        const s = (PERCH_H * k) / meta.perchHeight;
        if (fr < 0.99) this.sprite(P.perch, b.x, b.y, b.facing, 0, s, P.perch.pivot, f * (1 - fr));
        if (fr > 0.01) this.sprite(P.front, b.x, b.y, b.facing, 0, s, P.front.pivot, f * fr);
      }
    }
  }

  sprite(part, x, y, facing, angle, s, pivot, alpha) {
    const { ctx } = this;
    const [rx, ry, rw, rh] = part.rect;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(x, y);
    ctx.scale(facing, 1);
    ctx.rotate(angle);
    ctx.scale(s, s);
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
