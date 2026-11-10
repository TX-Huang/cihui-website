// 飄落的蟠桃花瓣（瑤池金母的蟠桃典故）。滑鼠經過會把花瓣吹開。

export class Petals {
  constructor(canvas, count = 46) {
    this.c = canvas;
    this.ctx = canvas.getContext("2d");
    this.color = "#ffb3c1";
    this.mouse = { x: -9999, y: -9999 };
    this.waterTop = null; // 湖面（水平線）在畫面上的高度；知道了花瓣才會落水（js/lake-view.js 給）
    this.onLand = null; // 花瓣落水時呼叫 (x, y)：冒一個小漣漪
    this.canLand = null; // (x, y) 那裡看得到湖嗎（大門前面看不到）
    this.list = [];
    this.resize();
    for (let i = 0; i < count; i++) this.list.push(this.spawn(true));
    window.addEventListener("resize", () => this.resize());
    window.addEventListener("pointermove", (e) => {
      this.mouse.x = e.clientX;
      this.mouse.y = e.clientY;
    });
  }

  resize() {
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.w = window.innerWidth;
    this.h = window.innerHeight;
    this.c.width = this.w * this.dpr;
    this.c.height = this.h * this.dpr;
  }

  spawn(anywhere) {
    const size = 4 + Math.random() * 6;
    return {
      x: Math.random() * this.w,
      y: anywhere ? Math.random() * this.h : -20,
      vx: 0,
      vy: 0,
      size,
      fall: 0.18 + Math.random() * 0.32, // 慢慢飄
      sway: Math.random() * Math.PI * 2,
      swaySpeed: 0.005 + Math.random() * 0.008,
      rot: Math.random() * Math.PI * 2,
      spin: (Math.random() - 0.5) * 0.024,
      flip: Math.random() * Math.PI * 2,
      alpha: 0.5 + Math.random() * 0.5,
      // 大約一半會落在湖面上（一開始就散在畫面上的那批不算，免得一載入就一起落水）
      land: !anywhere && Math.random() < 0.5 ? Math.random() : null,
      landed: 0
    };
  }

  // 走進門時：花瓣迎面輕輕散開（不是噴出去）
  burst(dir) {
    for (const p of this.list) {
      const dx = p.x - this.w / 2;
      const dy = p.y - this.h * 0.6;
      const d = Math.hypot(dx, dy) || 1;
      p.vx += (dx / d) * 2.4 * dir;
      p.vy += (dy / d) * 2.4 * dir;
    }
  }

  tick(wind = 0) {
    const { ctx } = this;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, this.w, this.h);
    ctx.fillStyle = this.color;
    for (let i = 0; i < this.list.length; i++) {
      const p = this.list[i];
      const landY = landingY(p, this.waterTop, this.h);
      if (p.landed) {
        // 停在水面上：原本的速度慢慢停下來（不是一下子停住），跟著水微微漂，慢慢淡掉
        p.sway += p.swaySpeed;
        p.vx *= 0.92;
        p.vy *= 0.85;
        p.x += p.vx + Math.sin(p.sway) * 0.06;
        p.y += p.vy * 0.4;
        if (settle(p, landY) === "gone") {
          this.list[i] = this.spawn(false);
          continue;
        }
        // 落水後 0.7 秒內慢慢躺平（不是一下子變扁）
        const s0 = Math.abs(Math.cos(p.flip)) * 0.7 + 0.3;
        const k = Math.min(1, p.landed / 40);
        this.drawPetal(ctx, p, landedAlpha(p), s0 + (0.32 - s0) * k * k * (3 - 2 * k));
        continue;
      }
      p.sway += p.swaySpeed;
      p.flip += 0.018;
      p.rot += p.spin;
      const mdx = p.x - this.mouse.x;
      const mdy = p.y - this.mouse.y;
      const md2 = mdx * mdx + mdy * mdy;
      if (md2 < 120 * 120 && md2 > 1) {
        const f = (1 - md2 / (120 * 120)) * 0.35;
        const md = Math.sqrt(md2);
        p.vx += (mdx / md) * f;
        p.vy += (mdy / md) * f;
      }
      p.vx = (p.vx + wind * 0.3) * 0.975;
      p.vy *= 0.975;
      p.x += p.vx + Math.sin(p.sway) * 0.6;
      p.y += p.vy + p.fall;
      if (p.y > this.h + 20 || p.x < -40 || p.x > this.w + 40) {
        this.list[i] = this.spawn(false);
        continue;
      }
      const ev = p.y >= landY ? settle(p, landY, !this.canLand || this.canLand(p.x, p.y)) : null;
      if (ev === "land" && this.onLand) {
        p.vx += Math.sin(p.sway) * 0.6; // 落水前一格還在左右飄，把那份速度也帶著慢慢停
        this.onLand(p.x, p.y);
      }
      this.drawPetal(ctx, p, p.alpha, Math.abs(Math.cos(p.flip)) * 0.7 + 0.3);
    }
  }

  // 畫一片花瓣；squash＝上下壓扁多少（翻轉時、平躺在水面上時）
  drawPetal(ctx, p, alpha, squash) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);
    ctx.scale(1, squash);
    ctx.beginPath();
    // 花瓣形：一頭圓一頭尖
    ctx.moveTo(0, -p.size);
    ctx.bezierCurveTo(p.size * 0.9, -p.size * 0.6, p.size * 0.7, p.size * 0.8, 0, p.size);
    ctx.bezierCurveTo(-p.size * 0.7, p.size * 0.8, -p.size * 0.9, -p.size * 0.6, 0, -p.size);
    ctx.fill();
    ctx.restore();
  }
}

// ── 落在湖面上 ──
// 大約一半的花瓣有落點（p.land：落在水平線到畫面底之間的哪裡，0～1），另一半照舊飄出畫面。
export const LAND_FADE = 90; // 落水後在水面上停 1.5 秒慢慢淡掉

export function landingY(p, top, h) {
  if (p.land == null || top == null) return Infinity;
  return top + 12 + p.land * Math.max(0, h - top - 24);
}

// 這一格：剛落水回傳 "land"（這時冒漣漪）；在水面上淡完回傳 "gone"（換一片新的）。
// visible＝落點看得到湖嗎（大門前面就看不到）：看不到就不落水，繼續往下飄
export function settle(p, landY, visible = true) {
  if (!p.landed) {
    if (p.y < landY) return null;
    if (!visible) {
      p.land = null;
      return null;
    }
    p.landed = 1;
    return "land";
  }
  p.landed += 1;
  return p.landed >= LAND_FADE ? "gone" : null;
}

export function landedAlpha(p) {
  return p.landed ? p.alpha * Math.max(0, 1 - p.landed / LAND_FADE) : p.alpha;
}
