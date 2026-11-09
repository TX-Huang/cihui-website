// 會游的鯉魚。
// 做法（WebGL）：每隻魚有一條「脊椎」（js/spine.js）。頭往前游，身體一節一節跟上，
// 轉彎時自然彎成 C 形；再疊上從頭傳到尾的波，就是游泳的 S 形擺動。
// 魚的圖（從上往下看、頭朝右）貼在沿著脊椎的一條帶子上，由顯示卡畫，沒有切條的縫或條紋。
// 瀏覽器不支援 WebGL 時，退回舊的「切條平移」畫法。
// 行為：平常隨意游；滑鼠停著會慢慢游過來；滑鼠揮太快或點一下，會被嚇跑。

import { createSpine, followHead, buildStrip } from "./spine.js";
import { steer } from "./swim.js";

const SPINE_POINTS = 16;
const SUBDIV = 4; // 畫的時候每節再切 4 小段，輪廓才會是平滑曲線（不是一節一節）
const MAX_BEND = 0.22; // 每一節最多彎多少（弧度）：太大像蛇，太小像木棍
const WAVE_K = 3.6; // 身上的波有多密
const SHADOW_ALPHA = 0.16; // 影子很淡
const SHADOW_COLOR = "rgb(92, 80, 68)"; // 暖灰色，不用純黑（配月白背景比較柔和）
const SLICES = 28; // 只給沒有 WebGL 時的備用畫法用

export class KoiPond {
  constructor(canvas, sprites, count = 5) {
    this.c = canvas;
    this.mouse = { x: -9999, y: -9999, speed: 0, still: 0 };
    this.env = { mouse: this.mouse, w: 0, h: 0 };
    this.ripples = [];
    this.fish = [];
    // 水波另外用一張 2D 畫布（WebGL 畫布不能同時用 2D 畫線），放在魚的下面
    this.rc = document.createElement("canvas");
    this.rc.className = canvas.className;
    this.rc.style.zIndex = "4";
    this.rc.setAttribute("aria-hidden", "true");
    canvas.before(this.rc);
    this.rctx = this.rc.getContext("2d");

    this.gl = canvas.getContext("webgl", { alpha: true, premultipliedAlpha: true, antialias: true });
    if (!this.gl) this.ctx = canvas.getContext("2d");
    // WebGL 被系統收回（例如顯示卡驅動重置）時：先暫停，恢復後重新上傳圖片
    canvas.addEventListener("webglcontextlost", (e) => {
      e.preventDefault();
      this.lost = true;
    });
    canvas.addEventListener("webglcontextrestored", () => {
      this.lost = false;
      if (this.sprites) this.initGL();
    });

    this.resize();
    this.images = sprites;
    this.count = count;
    this.sprites = null; // 等視窗有大小了才準備（見 ready()）
    window.addEventListener("resize", () => this.resize());
    window.addEventListener("pointermove", (e) => this.onMove(e));
    window.addEventListener("pointerdown", (e) => this.splash(e.clientX, e.clientY));
  }

  resize() {
    this.dpr = Math.min(1.5, window.devicePixelRatio || 1);
    this.w = window.innerWidth;
    this.h = window.innerHeight;
    if (this.env) {
      this.env.w = this.w;
      this.env.h = this.h;
    }
    for (const c of [this.c, this.rc]) {
      c.width = this.w * this.dpr;
      c.height = this.h * this.dpr;
    }
  }

  // 視窗剛打開時大小可能還是 0：這時先不放魚（圖會變 0 寬、魚全擠在角落），等有大小再放
  ready() {
    if (this.sprites) return true;
    if (this.w !== window.innerWidth || this.h !== window.innerHeight) this.resize(); // 不一定有 resize 事件
    if (this.w < 50 || this.h < 50) return false;
    // 每隻魚的圖先縮成顯示大小、影子先模糊好（只做一次）
    const maxLen = Math.min(this.w, this.h) * 0.24;
    this.sprites = this.images.map((img) => prepareSprite(img, Math.ceil(maxLen * this.dpr)));
    if (this.gl) this.initGL();
    for (let i = 0; i < this.count; i++) this.fish.push(this.spawn(i));
    return true;
  }

  // ── WebGL 設定 ──
  initGL() {
    const gl = this.gl;
    const vs = `
      attribute vec2 a_pos;
      attribute vec2 a_uv;
      uniform vec2 u_res;
      uniform vec2 u_off;
      varying vec2 v_uv;
      void main() {
        vec2 p = (a_pos + u_off) / u_res * 2.0 - 1.0;
        gl_Position = vec4(p.x, -p.y, 0.0, 1.0);
        v_uv = a_uv;
      }`;
    const fs = `
      precision mediump float;
      varying vec2 v_uv;
      uniform sampler2D u_tex;
      uniform float u_alpha;
      void main() {
        gl_FragColor = texture2D(u_tex, v_uv) * u_alpha;
      }`;
    const compile = (type, src) => {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      return s;
    };
    const prog = gl.createProgram();
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, vs));
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      // 顯示卡不合作：改用備用畫法
      this.useFallback();
      return;
    }
    gl.useProgram(prog);
    this.loc = {
      pos: gl.getAttribLocation(prog, "a_pos"),
      uv: gl.getAttribLocation(prog, "a_uv"),
      res: gl.getUniformLocation(prog, "u_res"),
      off: gl.getUniformLocation(prog, "u_off"),
      alpha: gl.getUniformLocation(prog, "u_alpha"),
      tex: gl.getUniformLocation(prog, "u_tex")
    };
    this.vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
    gl.enableVertexAttribArray(this.loc.pos);
    gl.enableVertexAttribArray(this.loc.uv);
    gl.vertexAttribPointer(this.loc.pos, 2, gl.FLOAT, false, 16, 0);
    gl.vertexAttribPointer(this.loc.uv, 2, gl.FLOAT, false, 16, 8);
    gl.uniform1i(this.loc.tex, 0);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA); // 預乘 alpha 的混色
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
    const upload = (canvas) => {
      const t = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      return t;
    };
    for (const sp of this.sprites) {
      sp.bodyTex = upload(sp.body);
      sp.shadowTex = upload(sp.shadow);
    }
  }

  // 同一張畫布一旦拿過 WebGL，就再也拿不到 2D 畫筆，所以換一張新的畫布
  useFallback() {
    const nc = this.c.cloneNode(false);
    this.c.replaceWith(nc);
    this.c = nc;
    this.gl = null;
    this.ctx = nc.getContext("2d");
    this.resize();
  }

  spawn(i) {
    const sprite = this.sprites[i % this.sprites.length];
    const len = Math.min(this.w, this.h) * (0.16 + Math.random() * 0.08);
    const x = Math.random() * this.w;
    const y = this.h * (0.35 + Math.random() * 0.55);
    const angle = Math.random() * Math.PI * 2;
    // 脊椎長度 = 整張圖（含留邊）的長度；f.x / f.y 是頭的位置
    const k = len / sprite.w;
    const total = sprite.body.width * k;
    return {
      sprite,
      len,
      x,
      y,
      angle,
      speed: 0.6,
      cruise: 0.5 + Math.random() * 0.4,
      phase: Math.random() * 10,
      wander: Math.random() * Math.PI * 2,
      fear: 0,
      halfWidth: (sprite.body.height / 2) * k,
      spine: createSpine(SPINE_POINTS, total / (SPINE_POINTS - 1), x, y, angle),
      verts: null,
      // 備用畫法用
      bodyBuf: null,
      shadowBuf: null
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
    if (!this.ready()) return;
    this.mouse.still++;
    this.mouse.speed *= 0.85;
    for (const f of this.fish) {
      steer(f, this.env);
      followHead(f.spine, f.x, f.y, MAX_BEND);
    }
    this.drawRipples();
    if (this.gl) {
      if (!this.lost) this.drawGL();
    } else if (this.ctx) this.draw2D();
  }

  amp(f) {
    // 游越快擺越大；停下來時還是會輕輕擺
    return f.len * (0.07 + Math.min(0.06, f.speed * 0.014));
  }

  drawGL() {
    const gl = this.gl;
    // 顯示卡可能給的比要求的小（記憶體不夠時），用實際大小
    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform2f(this.loc.res, this.w, this.h);
    for (const f of this.fish) {
      f.verts = buildStrip(
        f.spine,
        { halfWidth: f.halfWidth, amp: this.amp(f), phase: f.phase, waveK: WAVE_K, subdiv: SUBDIV },
        f.verts
      );
      const n = f.verts.length / 4; // 每個頂點 4 個數字
      gl.bufferData(gl.ARRAY_BUFFER, f.verts, gl.DYNAMIC_DRAW);
      // 影子：光從左上照下來，所以影子固定往右下偏
      gl.bindTexture(gl.TEXTURE_2D, f.sprite.shadowTex);
      gl.uniform2f(this.loc.off, f.len * 0.05, f.len * 0.09);
      gl.uniform1f(this.loc.alpha, SHADOW_ALPHA);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, n);
      // 身體
      gl.bindTexture(gl.TEXTURE_2D, f.sprite.bodyTex);
      gl.uniform2f(this.loc.off, 0, 0);
      gl.uniform1f(this.loc.alpha, 0.96);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, n);
    }
  }

  // ── 備用畫法（沒有 WebGL 時）：切條平移，整隻沿著頭→尾的方向貼上 ──
  draw2D() {
    const { ctx } = this;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, this.w, this.h);
    for (const f of this.fish) {
      // 用脊椎「沿身體一半長度」的位置當中心（彎曲時頭尾連線的中點會偏掉）
      const p = f.spine.pts;
      const a = p[Math.floor((p.length - 1) / 2)];
      const b = p[Math.ceil((p.length - 1) / 2)];
      const cx = (a.x + b.x) / 2;
      const cy = (a.y + b.y) / 2;
      const front = p[Math.max(0, Math.floor((p.length - 1) / 2) - 2)];
      const back = p[Math.min(p.length - 1, Math.ceil((p.length - 1) / 2) + 2)];
      const ang = Math.atan2(front.y - back.y, front.x - back.x);
      f.bodyBuf ??= document.createElement("canvas");
      f.shadowBuf ??= document.createElement("canvas");
      const amp = this.amp(f) * 0.7;
      this.warp(f.sprite, f.sprite.body, f.bodyBuf, f.len, amp, f.phase);
      this.warp(f.sprite, f.sprite.shadow, f.shadowBuf, f.len, amp, f.phase);
      this.blit(f.shadowBuf, cx + f.len * 0.05, cy + f.len * 0.09, ang, SHADOW_ALPHA);
      this.blit(f.bodyBuf, cx, cy, ang, 0.96);
    }
  }

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

  warp(sp, src, buf, L, amp, phase) {
    const k = (L / sp.w) * this.dpr;
    const tw = src.width;
    const th = src.height;
    const H = th * k;
    const margin = Math.ceil(L * 0.14 * this.dpr);
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
      const u = Math.min(1, Math.max(0, 1 - (sx0 + sw / 2 - sp.pad) / sp.w));
      const off = Math.sin(phase - u * WAVE_K) * amp * Math.pow(u, 1.5) * this.dpr;
      b.drawImage(src, sx0, 0, sw, th, dx0, margin + off, dx1 - dx0, H);
    }
  }

  drawRipples() {
    const ctx = this.rctx;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, this.w, this.h);
    if (!this.ripples.length) return;
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

// 把鯉魚圖縮成需要的大小，並先做好一張模糊的暖灰色影子（只做一次）
function prepareSprite(img, w) {
  const s = w / img.width;
  const h = Math.ceil(img.height * s);
  const pad = Math.ceil(w * 0.08); // 留邊給影子的模糊和擺動
  const make = () => {
    const c = document.createElement("canvas");
    c.width = w + pad * 2;
    c.height = h + pad * 2;
    return c;
  };
  const body = make();
  body.getContext("2d").drawImage(img, pad, pad, w, h);
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
