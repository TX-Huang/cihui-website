// 金母頁的金色光線：丹鳳飛過時天空才變金。計算在 js/goldlight.js。
// 三層：
//   1. 鳳凰（在大門前面、屋頂上方的天空飛）：放在舞台（#stage）裡、大門和青鳥之間（z 14），標題文字（z 20）蓋在牠上面
//   2. 暖色調（z 11，色彩相乘）：天空、霧、大門的白牆一起被染成暖金色（月白底色用柔光幾乎看不出來，所以用相乘）
//   3. 光（z 12，濾色混合）：光柱、鳳凰身上的光暈、飄落的火星
// 鳳凰是 AI Video 做的拍翅影片去背後的圖集（tools/prep_phoenix2.py）；光柱、光暈也是 AI 圖。
import { createLight, stepLight, flightPose, stepEmbers, flapFrame, flapLift } from "./goldlight.js";

const smooth = (t) => {
  const x = Math.max(0, Math.min(1, t));
  return x * x * (3 - 2 * x);
};

function layer(tag, z, blend, parent = document.body) {
  const e = document.createElement(tag);
  e.setAttribute("aria-hidden", "true");
  Object.assign(e.style, { position: "fixed", inset: "0", width: "100%", height: "100%", pointerEvents: "none", zIndex: String(z) });
  if (blend) e.style.mixBlendMode = blend;
  parent.append(e);
  return e;
}

export class GoldLightView {
  constructor(kit) {
    this.kit = kit; // { fly, flyImg, rays?, glow? }
    this.s = createLight();
    this.t = 0; // 拍翅動畫走到哪（格數）
    this.last = 0; // 上一次畫的時間
    this.debt = 0; // 還沒走的時間（格）
    // 拍翅兩格混在一起用的小畫布
    this.mixer = document.createElement("canvas");
    this.mixer.width = kit.fly.width;
    this.mixer.height = kit.fly.height;
    this.active = false;
    this.embers = [];
    this.bird = null; // 等光那一層建好再建（同一個 z，後建的在上面）
    this.grade = layer("div", 11, "multiply");
    // 右上方（鳳凰飛的天空）比較亮、比較金，往下慢慢變成暖橘
    this.grade.style.background =
      "radial-gradient(130% 110% at 75% 12%, rgb(255, 226, 170) 0%, rgb(252, 206, 145) 50%, rgb(240, 190, 140) 100%)";
    this.grade.style.opacity = "0";
    this.light = layer("canvas", 12, "screen");
    this.bird = layer("canvas", 14, null, document.getElementById("stage") || document.body);
    this.resize();
    addEventListener("resize", () => this.resize());
  }

  resize() {
    this.dpr = Math.min(2, devicePixelRatio || 1);
    this.W = document.documentElement.clientWidth;
    this.H = innerHeight;
    for (const c of [this.bird, this.light]) {
      c.width = Math.round(this.W * this.dpr);
      c.height = Math.round(this.H * this.dpr);
    }
  }

  tick(now = performance.now()) {
    if (this.W !== document.documentElement.clientWidth || this.H !== innerHeight) this.resize();
    const s = this.s;
    // 照真實時間走：60Hz 一次一格、120Hz 兩次一格；切回分頁時最多補 4 格，不會突然跳一大段
    this.debt = Math.min(4, this.debt + (this.last ? ((now - this.last) * 60) / 1000 : 1));
    this.last = now;
    let steps = 0;
    while (this.debt >= 1) {
      stepLight(s, { active: this.active, random: Math.random });
      this.debt -= 1;
      steps++;
    }
    this.t += steps;
    if (!steps) return;
    const pose = s.flying ? this.withFlap(flightPose(s.p, this.W, this.H)) : null;
    const sources = pose && this.active
      ? [
          { x: pose.x - pose.w * 0.32, y: pose.y + pose.h * 0.22 }, // 尾羽
          { x: pose.x - pose.w * 0.12, y: pose.y - pose.h * 0.05 }, // 翅膀
          { x: pose.x + pose.w * 0.05, y: pose.y + pose.h * 0.1 } // 身體
        ]
      : [];
    this.embers = stepEmbers(this.embers, sources, Math.random, 1);
    this.grade.style.opacity = String(s.warm * 0.6);
    this.drawBird(pose);
    this.drawLight(pose);
  }

  // 拍翅時身體起伏：翅膀往下拍時被推上去；頭跟著上升抬起、下沉時低下
  withFlap(pose) {
    const { frames, lift } = this.kit.fly;
    if (!lift) return pose;
    const L = flapLift(this.t, frames, lift);
    const v = flapLift(this.t + 3, frames, lift) - flapLift(this.t - 3, frames, lift);
    return { ...pose, y: pose.y - L * pose.h * 0.07, tilt: Math.max(-0.08, Math.min(0.08, -v * 0.35)) };
  }

  drawBird(pose) {
    const ctx = this.bird.getContext("2d");
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, this.W, this.H);
    if (!pose) return;
    // 進出畫面時淡入淡出，飛的時候身體微微傾斜
    const p = this.s.p;
    const fade = smooth(p / 0.08) * (1 - smooth((p - 0.92) / 0.08)) * this.s.show;
    if (fade <= 0) return;
    const { fly, flyImg } = this.kit;
    // 鳥的身體（第 1 格的框 ref）對齊 pose：寬度 = pose.w
    const [rx, ry, rw, rh] = fly.ref;
    const k = pose.w / rw;
    const { a, b, w } = flapFrame(this.t, fly.frames);
    // 兩格真的照比例混（a 占 1-w、b 占 w，用「相加」疊），身體不會變透明、翅膀也不會換格時突然消失
    const m = this.mixer.getContext("2d");
    m.globalCompositeOperation = "source-over";
    m.globalAlpha = 1;
    m.clearRect(0, 0, fly.width, fly.height);
    m.globalCompositeOperation = "lighter";
    for (const [f, alpha] of [[fly.frames[a], 1 - w], [fly.frames[b], w]]) {
      if (alpha <= 0) continue;
      m.globalAlpha = alpha;
      m.drawImage(flyImg, f[0], f[1], f[2], f[3], 0, 0, fly.width, fly.height);
    }
    ctx.save();
    ctx.translate(pose.x, pose.y);
    ctx.rotate(-0.03 + (pose.tilt || 0));
    ctx.globalAlpha = fade;
    ctx.drawImage(this.mixer, -(rx + rw / 2) * k, -(ry + rh / 2) * k, fly.width * k, fly.height * k);
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  drawLight(pose) {
    const ctx = this.light.getContext("2d");
    const { W, H } = this;
    const warm = this.s.warm;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    if (warm <= 0 && !this.embers.length) return;
    // 光柱：從左上角斜照下來，慢慢飄動
    if (this.kit.rays && warm > 0) {
      const t = performance.now() / 1000;
      ctx.globalAlpha = warm * (0.55 + 0.08 * Math.sin(t * 0.4));
      const rw = W * 1.15;
      const rh = (rw * this.kit.rays.height) / this.kit.rays.width;
      // 圖的左邊和上面是最亮的地方：一直留在畫面外，才不會看到一條邊
      ctx.drawImage(this.kit.rays, -W * 0.08 + (Math.sin(t * 0.15) - 1) * 20, -H * 0.06, rw, Math.max(rh, H * 1.1));
    }
    // 鳳凰身上的光暈：照亮牠經過的雲和大門
    if (pose && warm > 0) {
      // 淡淡的就好：太亮會把鳳凰本身的紅洗掉
      const r = pose.w * 1.1;
      ctx.globalAlpha = warm * 0.4;
      if (this.kit.glow) {
        // 光暈的圖是黑底：用「濾色」疊，黑的地方才不會把底下的光柱蓋掉
        ctx.globalCompositeOperation = "screen";
        ctx.drawImage(this.kit.glow, pose.x - r, pose.y - r, r * 2, r * 2);
        ctx.globalCompositeOperation = "source-over";
      } else {
        const g = ctx.createRadialGradient(pose.x, pose.y, 0, pose.x, pose.y, r);
        g.addColorStop(0, "rgba(255, 200, 120, 0.75)");
        g.addColorStop(0.35, "rgba(255, 170, 90, 0.35)");
        g.addColorStop(1, "rgba(255, 150, 70, 0)");
        ctx.fillStyle = g;
        ctx.fillRect(pose.x - r, pose.y - r, r * 2, r * 2);
      }
    }
    // 火星
    for (const e of this.embers) {
      ctx.globalAlpha = e.alpha;
      const g = ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, e.size * 3);
      g.addColorStop(0, "rgba(255, 230, 170, 1)");
      g.addColorStop(0.4, "rgba(255, 150, 60, 0.6)");
      g.addColorStop(1, "rgba(255, 120, 40, 0)");
      ctx.fillStyle = g;
      ctx.fillRect(e.x - e.size * 3, e.y - e.size * 3, e.size * 6, e.size * 6);
    }
    ctx.globalAlpha = 1;
  }
}

export async function loadGoldLightKit() {
  const img = (u) =>
    new Promise((res) => {
      const im = new Image();
      im.onload = () => res(im);
      im.onerror = () => res(null);
      im.src = u;
    });
  const [fly, flyImg, rays, glow] = await Promise.all([
    fetch("assets/phoenix2/fly.json")
      .then((r) => r.json())
      .catch(() => null),
    img("assets/phoenix2/fly.webp"),
    img("assets/phoenix2/rays.webp"),
    img("assets/phoenix2/glow.webp")
  ]);
  return fly && flyImg ? { fly, flyImg, rays, glow } : null;
}
