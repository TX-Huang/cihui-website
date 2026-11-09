// 飄落的蟠桃花瓣（瑤池金母的蟠桃典故）。滑鼠經過會把花瓣吹開。

export class Petals {
  constructor(canvas, count = 46) {
    this.c = canvas;
    this.ctx = canvas.getContext("2d");
    this.color = "#ffb3c1";
    this.mouse = { x: -9999, y: -9999 };
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
      alpha: 0.5 + Math.random() * 0.5
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
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.scale(1, Math.abs(Math.cos(p.flip)) * 0.7 + 0.3);
      ctx.beginPath();
      // 花瓣形：一頭圓一頭尖
      ctx.moveTo(0, -p.size);
      ctx.bezierCurveTo(p.size * 0.9, -p.size * 0.6, p.size * 0.7, p.size * 0.8, 0, p.size);
      ctx.bezierCurveTo(-p.size * 0.7, p.size * 0.8, -p.size * 0.9, -p.size * 0.6, 0, -p.size);
      ctx.fill();
      ctx.restore();
    }
  }
}
