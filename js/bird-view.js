// 畫青鳥（js/birds.js 決定牠們在哪、在做什麼，這裡只負責畫）。
// 飛的時候：影片拆出來的 36 格依序播（tools/prep_bird_video.py），一直拍，身體跟著起伏。
// 停著：轉頭、原地拍翅都是影片拆出來的（tools/prep_bird_perch.py）；轉身時跳一下。
import { createFlock, stepFlock, HOP, CLIP_SPEED } from "./birds.js";

const FLY_LEN = 190; // 飛行時整隻鳥多長（大門設計座標）
const PERCH_H = 70; // 停著時頭冠到腳多高（大門設計座標）

export class BirdView {
  constructor(canvas, kit, gate, gateEl) {
    this.c = canvas;
    this.ctx = canvas.getContext("2d");
    this.kit = kit; // { fly, flyImg：飛行 36 格；perch, perchImg：停著的動作影片 }
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
      random: Math.random,
      animLength: (name) => this.animLength(name),
      clipLength: () => this.animLength("takeoff"),
      // 降落前先飛到的點＝起飛影片最後一格鳥的位置（照停的方向左右翻）
      hover: (i) => {
        const at = env.perch(i);
        const off = this.kit.perch.clips.takeoff.endOffset;
        const s = (PERCH_H * k) / this.kit.perch.height;
        return { x: at.x + off[0] * s * at.face, y: at.y + off[1] * s };
      }
    };
    stepFlock(this.flock, env);
    this.mouse.speed *= 0.8;
    this.draw(k);
  }

  draw(k) {
    const { ctx } = this;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, this.w, this.h);
    for (const b of this.flock.birds) {
      if (b.state === "gone" || b.state === "wait") {
        this.bob.delete(b);
        continue;
      }
      if (b.state === "in" || b.state === "out") this.drawFlying(b, k);
      else this.drawPerched(b, k);
    }
  }

  // 飛：用影片拆出來的 36 格（一下完整的拍翅膀）一直依序播；
  // 拍翅膀時身體跟著上下起伏（往下拍時往上浮）；快降落時抬頭煞車
  drawFlying(b, k) {
    const fly = this.kit.fly;
    const n = fly.frames.length;
    const idx = Math.floor((((b.flap % 1) + 1) % 1) * n) % n;
    const target = Math.sin((b.flap - 0.45) * Math.PI * 2) * 0.03 * FLY_LEN * k;
    const bob = lerp(this.bob.get(b) ?? target, target, 0.25);
    this.bob.set(b, bob);
    const s = (FLY_LEN * k) / fly.length;
    // 往右飛：照路線方向傾斜；往左飛：鏡像
    const tilt = b.facing > 0 ? b.angle : Math.PI - b.angle;
    let bank = Math.max(-0.5, Math.min(0.5, Math.atan2(Math.sin(tilt), Math.cos(tilt))));
    if (b.brake) bank -= 0.3; // 抬頭
    this.sprite(this.kit.flyImg, fly.frames[idx], b.x, b.y - bob, b.facing, b.facing > 0 ? bank : -bank, s, s, fly.pivot);
  }

  // 停：平常是轉頭影片的第一格（兩段影片都從這個姿勢開始，所以接得起來）；
  // 轉頭／原地拍翅時播那段影片（拍翅播完倒著播回來，才會回到原本的站姿）；
  // 起飛／降落：播起飛影片（降落倒著播）；平常微微呼吸；轉身時跳一下
  drawPerched(b, k) {
    const perch = this.kit.perch;
    let clip = perch.clips.head;
    let frame = clip.frames[0];
    if (b.state === "landing" || b.state === "takeoff") {
      // 起飛影片：起飛時正著播；降落時倒著播（鳥從上方降下來，最後剛好是站姿）
      clip = perch.clips.takeoff;
      const n = clip.frames.length;
      const i = Math.min(n - 1, Math.floor((b.clipT / 60) * clip.fps * CLIP_SPEED));
      frame = clip.frames[b.state === "takeoff" ? i : n - 1 - i];
    } else if (b.anim) {
      clip = perch.clips[b.anim];
      const n = clip.frames.length;
      const seq = clip.pingpong ? n * 2 - 1 : n;
      let i = Math.min(seq - 1, Math.floor((b.animT / 60) * clip.fps * CLIP_SPEED));
      if (i >= n) i = seq - 1 - i; // 倒著播回來
      frame = clip.frames[i];
    }
    const s = (PERCH_H * k) / perch.height;
    let sy = 1;
    if (b.state === "perched" && !b.anim) sy = 1 + 0.012 * Math.sin(b.age * 0.09); // 微微呼吸
    const hopY = b.hop < HOP ? Math.sin((Math.PI * b.hop) / HOP) * 0.08 * PERCH_H * k : 0;
    this.sprite(this.kit.perchImg, perch.rects[frame], b.x, b.y - hopY, b.facing, 0, s, s * sy, clip.pivot);
  }

  // 動作影片要播多久（換成 60 格 = 1 秒的單位），給 birds.js 判斷什麼時候播完
  animLength(name) {
    const clip = this.kit.perch.clips[name];
    const n = clip.pingpong ? clip.frames.length * 2 - 1 : clip.frames.length;
    return Math.ceil((n / (clip.fps * CLIP_SPEED)) * 60);
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
    const [fly, perch, flyImg, perchImg] = await Promise.all([
      fetch(`assets/birds/${name}-fly.json`).then((r) => r.json()),
      fetch(`assets/birds/${name}-perch.json`).then((r) => r.json()),
      img(`assets/birds/${name}-fly.webp`),
      img(`assets/birds/${name}-perch.webp`)
    ]);
    return { fly, perch, flyImg, perchImg };
  } catch (_) {
    return null;
  }
}
