// 會游的鯉魚。
// 做法：一張「從上往下看、頭朝右」的鯉魚圖，切成很多直條，
// 每條上下錯開一點（越靠尾巴錯越多），連起來就像身體在擺動。
// 行為：平常隨意游；滑鼠停著會慢慢游過來；滑鼠揮太快或點一下，會被嚇跑。

const SLICES = 28;

export class KoiPond {
  constructor(canvas, sprites, count = 5) {
    this.c = canvas;
    this.ctx = canvas.getContext("2d");
    this.rawSprites = sprites;
    this.mouse = { x: -9999, y: -9999, speed: 0, still: 0 };
    this.ripples = [];
    this.fish = [];
    this.resize();
    // 效能：每隻魚的圖先縮成顯示大小，影子先模糊好，之後每格只貼圖、不再即時模糊
    const maxLen = Math.min(this.w, this.h) * 0.24;
    this.sprites = sprites.map((img) => prepareSprite(img, Math.ceil(maxLen * this.dpr)));
    for (let i = 0; i < count; i++) this.fish.push(this.spawn(i));
    window.addEventListener("resize", () => this.resize());
    window.addEventListener("pointermove", (e) => this.onMove(e));
    window.addEventListener("pointerdown", (e) => this.splash(e.clientX, e.clientY));
  }

  resize() {
    this.dpr = Math.min(1.5, window.devicePixelRatio || 1);
    this.w = window.innerWidth;
    this.h = window.innerHeight;
    this.c.width = this.w * this.dpr;
    this.c.height = this.h * this.dpr;
  }

  spawn(i) {
    const sprite = this.sprites[i % this.sprites.length];
    const len = Math.min(this.w, this.h) * (0.16 + Math.random() * 0.08);
    return {
      sprite,
      len,
      x: Math.random() * this.w,
      y: this.h * (0.35 + Math.random() * 0.55),
      angle: Math.random() * Math.PI * 2,
      speed: 0.6,
      cruise: 0.5 + Math.random() * 0.4,
      phase: Math.random() * 10,
      wander: Math.random() * Math.PI * 2,
      fear: 0
    };
  }

  onMove(e) {
    const dx = e.clientX - this.mouse.x;
    const dy = e.clientY - this.mouse.y;
    this.mouse.speed = Math.hypot(dx, dy);
    this.mouse.x = e.clientX;
    this.mouse.y = e.clientY;
    this.mouse.still = 0;
  }

  // 點一下：水波 + 附近的魚被嚇跑
  splash(x, y) {
    this.ripples.push({ x, y, r: 0, life: 1 });
    for (const f of this.fish) {
      if (Math.hypot(f.x - x, f.y - y) < 260) f.fear = 1;
    }
  }

  tick() {
    const { ctx } = this;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, this.w, this.h);
    this.mouse.still++;
    this.mouse.speed *= 0.85;

    for (const f of this.fish) this.steer(f);
    this.drawRipples();
    for (const f of this.fish) this.drawFish(f);
  }

  steer(f) {
    const m = this.mouse;
    const mdx = m.x - f.x;
    const mdy = m.y - f.y;
    const md = Math.hypot(mdx, mdy);

    // 滑鼠揮很快又很近 → 害怕
    if (md < 180 && m.speed > 28) f.fear = 1;

    let target;
    if (f.fear > 0.05) {
      target = Math.atan2(-mdy, -mdx); // 往反方向逃
    } else if (md < 420 && m.still < 240) {
      target = Math.atan2(mdy, mdx); // 好奇，游過去
    } else {
      f.wander += (Math.random() - 0.5) * 0.15;
      target = f.angle + Math.sin(f.wander) * 0.6;
    }

    // 別游出畫面：靠邊時轉回中間
    const margin = f.len * 0.8;
    if (f.x < margin || f.x > this.w - margin || f.y < this.h * 0.2 || f.y > this.h - margin * 0.6) {
      target = Math.atan2(this.h * 0.62 - f.y, this.w / 2 - f.x);
    }

    // 慢慢轉向（魚不會瞬間轉彎）
    let diff = target - f.angle;
    diff = Math.atan2(Math.sin(diff), Math.cos(diff));
    const turn = f.fear > 0.05 ? 0.09 : 0.025;
    f.angle += Math.max(-turn, Math.min(turn, diff));

    // 靠近滑鼠時放慢，像在聞
    let want = f.cruise;
    if (f.fear > 0.05) want = 4.5;
    else if (md < 90 && m.still < 240) want = 0.15;
    f.speed += (want - f.speed) * 0.05;
    f.fear *= 0.97;

    f.x += Math.cos(f.angle) * f.speed;
    f.y += Math.sin(f.angle) * f.speed;
    // 尾巴擺動的速度跟游速有關
    f.phase += 0.06 + f.speed * 0.09;
  }

  drawFish(f) {
    const { ctx } = this;
    const sp = f.sprite;
    const L = f.len;
    const k = L / sp.w; // 圖上 1px = 畫面上 k px
    const amp = L * (0.05 + Math.min(0.06, f.speed * 0.012));

    ctx.save();
    ctx.translate(f.x, f.y);
    ctx.rotate(f.angle);
    // 水下的影子（已經模糊好的圖），往右下偏一點
    ctx.globalAlpha = 0.22;
    this.slices(sp, sp.shadow, k, L, amp, f.phase, 10, 14);
    ctx.globalAlpha = 0.95;
    this.slices(sp, sp.body, k, L, amp, f.phase, 0, 0);
    ctx.restore();
  }

  slices(sp, src, k, L, amp, phase, ox, oy) {
    const { ctx } = this;
    const tw = src.width;
    const th = src.height;
    const sw = tw / SLICES;
    const H = th * k;
    for (let i = 0; i < SLICES; i++) {
      const sx = i * sw;
      // u：0 = 頭（右邊）, 1 = 尾（左邊）
      const u = Math.min(1, Math.max(0, 1 - (sx + sw / 2 - sp.pad) / sp.w));
      const off = Math.sin(phase - u * 3.4) * amp * Math.pow(u, 1.5);
      ctx.drawImage(src, sx, 0, sw + 1, th, -L / 2 + (sx - sp.pad) * k + ox, -H / 2 + off + oy, sw * k + 1, H);
    }
  }

  drawRipples() {
    const { ctx } = this;
    ctx.lineWidth = 1.5;
    this.ripples = this.ripples.filter((r) => r.life > 0.02);
    for (const r of this.ripples) {
      r.r += 2.2;
      r.life *= 0.965;
      for (let j = 0; j < 3; j++) {
        const rr = r.r - j * 18;
        if (rr <= 0) continue;
        ctx.strokeStyle = `rgba(110, 100, 90, ${r.life * (0.35 - j * 0.1)})`;
        ctx.beginPath();
        ctx.ellipse(r.x, r.y, rr, rr * 0.45, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  }
}

// 把鯉魚圖縮成需要的大小，並先做好一張模糊的黑色影子
function prepareSprite(img, w) {
  const s = w / img.width;
  const h = Math.ceil(img.height * s);
  const pad = Math.ceil(w * 0.06);
  const make = () => {
    const c = document.createElement("canvas");
    c.width = w + pad * 2;
    c.height = h + pad * 2;
    return c;
  };
  const body = make();
  body.getContext("2d").drawImage(img, pad, pad, w, h);
  const shadow = make();
  const sc = shadow.getContext("2d");
  sc.filter = `blur(${Math.max(2, pad * 0.4)}px) brightness(0)`;
  sc.drawImage(img, pad, pad, w, h);
  return { body, shadow, w, h, pad };
}

export function loadImages(urls) {
  return Promise.all(
    urls.map(
      (u) =>
        new Promise((res) => {
          const im = new Image();
          im.onload = () => res(im);
          im.onerror = () => res(null);
          im.src = u;
        })
    )
  ).then((list) => list.filter(Boolean));
}
