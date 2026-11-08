// 會游的鯉魚。
// 做法：一張「從上往下看、頭朝右」的鯉魚圖，切成很多直條，
// 每條上下錯開一點（越靠尾巴錯越多），連起來就像身體在擺動。
// 行為：平常隨意游；滑鼠停著會慢慢游過來；滑鼠揮太快或點一下，會被嚇跑。

const SLICES = 28;
const SHADOW_ALPHA = 0.16; // 影子很淡
const SHADOW_COLOR = "rgb(92, 80, 68)"; // 暖灰色，不用純黑（配月白背景比較柔和）

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
      fear: 0,
      // 每隻魚自己的小畫布：先在這裡把切條拼好（不旋轉），再整張轉向貼到畫面上
      bodyBuf: document.createElement("canvas"),
      shadowBuf: document.createElement("canvas")
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
    const amp = L * (0.05 + Math.min(0.06, f.speed * 0.012));
    // 先把身體和影子各自「拼」在不旋轉的小畫布上
    this.warp(sp, sp.body, f.bodyBuf, L, amp, f.phase);
    this.warp(sp, sp.shadow, f.shadowBuf, L, amp, f.phase);

    // 影子：光從左上照下來，所以影子固定往右下偏（不跟著魚轉）
    this.blit(f.shadowBuf, f.x + L * 0.05, f.y + L * 0.09, f.angle, SHADOW_ALPHA);
    this.blit(f.bodyBuf, f.x, f.y, f.angle, 0.96);
  }

  // 把小畫布轉向後貼到畫面上（只貼一次，所以半透明的地方不會疊出條紋）
  blit(buf, x, y, angle, alpha) {
    const { ctx } = this;
    const w = buf.width / this.dpr;
    const h = buf.height / this.dpr;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.drawImage(buf, -w / 2, -h / 2, w, h);
    ctx.restore();
  }

  // 切條擺動：在「沒有旋轉」的小畫布上畫，每條的左右邊界都對齊整數像素，
  // 所以條與條之間不用重疊、也不會有縫（重疊會讓半透明處疊出條紋）
  warp(sp, src, buf, L, amp, phase) {
    const k = (L / sp.w) * this.dpr; // 圖上 1px = 小畫布上 k px
    const tw = src.width;
    const th = src.height;
    const H = th * k;
    const margin = Math.ceil(L * 0.12 * this.dpr); // 上下留空間給擺動
    const bw = Math.ceil(tw * k);
    const bh = Math.ceil(H + margin * 2);
    if (buf.width !== bw || buf.height !== bh) {
      buf.width = bw;
      buf.height = bh;
    }
    const b = buf.getContext("2d");
    b.clearRect(0, 0, bw, bh);
    const sw = tw / SLICES;
    for (let i = 0; i < SLICES; i++) {
      const sx0 = i * sw;
      const dx0 = Math.round(sx0 * k);
      const dx1 = Math.round((sx0 + sw) * k);
      // u：0 = 頭（右邊）, 1 = 尾（左邊）
      const u = Math.min(1, Math.max(0, 1 - (sx0 + sw / 2 - sp.pad) / sp.w));
      const off = Math.sin(phase - u * 3.4) * amp * Math.pow(u, 1.5) * this.dpr;
      b.drawImage(src, sx0, 0, sw, th, dx0, margin + off, dx1 - dx0, H);
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
  const pad = Math.ceil(w * 0.08); // 留邊給影子的模糊
  const make = () => {
    const c = document.createElement("canvas");
    c.width = w + pad * 2;
    c.height = h + pad * 2;
    return c;
  };
  const body = make();
  body.getContext("2d").drawImage(img, pad, pad, w, h);
  // 影子：先把魚的形狀塗成暖灰色（半透明的鰭影子也會比較淡），再柔柔地模糊
  const tint = make();
  const tc = tint.getContext("2d");
  tc.drawImage(img, pad, pad, w, h);
  tc.globalCompositeOperation = "source-in";
  tc.fillStyle = SHADOW_COLOR;
  tc.fillRect(0, 0, tint.width, tint.height);
  const shadow = make();
  const sc = shadow.getContext("2d");
  sc.filter = `blur(${Math.max(3, w * 0.022)}px)`;
  sc.drawImage(tint, 0, 0);
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
