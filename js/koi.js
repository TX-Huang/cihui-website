// 會游的鯉魚（拆零件版）。
// 每隻魚 = 身體 ＋ 尾巴 ＋ 好幾片鰭，圖都在 assets/koi/{色}.webp（tools/prep_koi_parts.py 做的）。
//   身體：沿著「脊椎」（js/spine.js）彎的帶子；前半身幾乎不動，只有後半身擺。
//   尾巴：自己一條有慣性的鍊子，接在身體末端，像絲帶一樣慢半拍跟著甩（js/koi-parts.js）。
//   鰭：硬的小圖，黏在身上固定的位置，各自輕輕划動。
// 畫的順序（由下往上）：影子 → 尾巴 → 鰭 → 身體。
// 瀏覽器不支援 WebGL 時，退回 2D：零件一樣分開畫，只是身體不彎。
// 行為（js/swim.js）：平常挑遠處的點游過去；滑鼠停著會游過來看一下；揮太快或點一下會被嚇跑。

import { createSpine, followHead, buildStrip, waveLine } from "./spine.js";
import { placeOnLine, createTail, stepTail, finQuad, tailStrip, rigidLine, padRect } from "./koi-parts.js";
import { steer, cruiseSpeed } from "./swim.js";

const SPINE_POINTS = 16;
const SUBDIV = 4; // 畫的時候每節再切 4 小段，輪廓才會是平滑曲線
const MAX_BEND = 0.22; // 身體每一節最多彎多少（弧度）
const WAVE_K = 3.6; // 身上的波有多密
const TAIL_POINTS = 8;
const SHADOW_ALPHA = 0.16;
const BODY_SHARE = 0.68; // 身體佔整隻魚（含尾巴）長度的比例
const FIN_FLAP = 0.16; // 鰭划動的幅度（弧度）

export class KoiPond {
  constructor(canvas, kits, count = 5) {
    this.c = canvas;
    this.mouse = { x: -9999, y: -9999, speed: 0, still: 0 };
    this.env = { mouse: this.mouse, w: 0, h: 0 };
    this.ripples = [];
    this.fish = [];
    this.kits = kits; // [{ meta, atlas, shadow }]
    this.count = count;
    this.started = false;
    // 水波另外用一張 2D 畫布，放在魚的下面
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
      if (this.started) this.initGL();
    });

    this.resize();
    window.addEventListener("resize", () => this.resize());
    window.addEventListener("pointermove", (e) => this.onMove(e));
    window.addEventListener("pointerdown", (e) => this.splash(e.clientX, e.clientY));
  }

  resize() {
    this.dpr = Math.min(1.5, window.devicePixelRatio || 1);
    this.w = window.innerWidth;
    this.h = window.innerHeight;
    this.env.w = this.w;
    this.env.h = this.h;
    for (const c of [this.c, this.rc]) {
      c.width = this.w * this.dpr;
      c.height = this.h * this.dpr;
    }
  }

  // 視窗剛打開時大小可能還是 0：這時先不放魚，等有大小再放
  ready() {
    if (this.started) return true;
    if (this.w !== window.innerWidth || this.h !== window.innerHeight) this.resize();
    if (this.w < 50 || this.h < 50) return false;
    if (this.gl) this.initGL();
    for (let i = 0; i < this.count; i++) this.fish.push(this.spawn(i));
    this.started = true;
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
      uniform vec4 u_rect;
      varying vec2 v_uv;
      void main() {
        vec2 p = (a_pos + u_off) / u_res * 2.0 - 1.0;
        gl_Position = vec4(p.x, -p.y, 0.0, 1.0);
        v_uv = u_rect.xy + a_uv * u_rect.zw;
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
      this.useFallback(); // 顯示卡不合作：改用 2D
      return;
    }
    gl.useProgram(prog);
    this.loc = {
      pos: gl.getAttribLocation(prog, "a_pos"),
      uv: gl.getAttribLocation(prog, "a_uv"),
      res: gl.getUniformLocation(prog, "u_res"),
      off: gl.getUniformLocation(prog, "u_off"),
      rect: gl.getUniformLocation(prog, "u_rect"),
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
    const upload = (img) => {
      const t = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      return t;
    };
    for (const kit of this.kits) {
      kit.tex = upload(kit.atlas);
      kit.shadowTex = upload(kit.shadow);
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
    const kit = this.kits[i % this.kits.length];
    const { meta } = kit;
    const len = Math.min(this.w, this.h) * (0.16 + Math.random() * 0.08); // 整隻魚（含尾巴）
    const bodyLen = len * BODY_SHARE;
    const scale = bodyLen / meta.L; // 圖集像素 → 畫面像素
    const x = Math.random() * this.w;
    const y = this.h * (0.35 + Math.random() * 0.55);
    const angle = Math.random() * Math.PI * 2;
    const spine = createSpine(SPINE_POINTS, bodyLen / (SPINE_POINTS - 1), x, y, angle);
    const tailPart = meta.parts.find((p) => p.kind === "tail");
    // 尾巴圖的右緣（接在身上的那一端）在身體哪個位置
    const tailEdgeS = tailPart.s - (tailPart.rect[2] - tailPart.pivot[0]) / meta.L;
    const tailLen = tailPart.rect[2] * scale;
    const line = waveLine(spine, { amp: 0, phase: 0, waveK: WAVE_K, subdiv: SUBDIV });
    const base = placeOnLine(line, tailEdgeS, 0, bodyLen);
    return {
      kit,
      len,
      bodyLen,
      scale,
      x,
      y,
      angle,
      speed: 0.4,
      cruise: cruiseSpeed(),
      phase: Math.random() * 10,
      wander: Math.random() * Math.PI * 2,
      fear: 0,
      spine,
      tailPart,
      tailEdgeS,
      tail: createTail(TAIL_POINTS, tailLen / (TAIL_POINTS - 1), base, { maxBend: 0.13 }),
      body: meta.parts.find((p) => p.kind === "body"),
      fins: meta.parts.filter((p) => p.kind === "fin").map((p, k) => ({ ...p, seed: k * 1.7 + Math.random() }))
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
      this.pose(f);
    }
    this.drawRipples();
    if (this.gl) {
      if (!this.lost) this.drawGL();
    } else if (this.ctx) this.draw2D();
  }

  amp(f) {
    // 游越快擺越大；停下來時還是會輕輕擺（以身體長度為準）
    return f.bodyLen * (0.1 + Math.min(0.08, f.speed * 0.02));
  }

  // 算出這一格每個零件的位置
  pose(f) {
    f.line = waveLine(f.spine, { amp: this.amp(f), phase: f.phase, waveK: WAVE_K, subdiv: SUBDIV });
    if (!this.gl) {
      // 備用 2D：身體畫成一張不彎的圖，所以中線也用直的（鰭和尾巴才會接在畫出來的身體上）
      const p = f.line;
      const k = Math.floor(p.length / 2);
      f.line = rigidLine(p[0], Math.atan2(p[0].y - p[k].y, p[0].x - p[k].x), f.bodyLen, p.length);
    }
    stepTail(f.tail, placeOnLine(f.line, f.tailEdgeS, 0, f.bodyLen));
    const t = f.phase * 0.45;
    for (const fin of f.fins) {
      const at = placeOnLine(f.line, fin.s, fin.d, f.bodyLen);
      // 胸鰭（靠前面的）划比較大；左右兩邊方向相反，像在划水
      const strength = fin.s < 0.45 ? 1 : 0.5;
      const flap = Math.sin(t + fin.seed) * FIN_FLAP * strength * Math.sign(fin.d || 1);
      fin.at = at;
      fin.angle = at.angle + flap;
    }
  }

  // ── WebGL 畫法 ──
  drawGL() {
    const gl = this.gl;
    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform2f(this.loc.res, this.w, this.h);
    for (const f of this.fish) {
      // 影子：光從左上照下來，所以影子固定往右下偏；影子圖比零件大一圈（模糊暈開的部分）
      gl.bindTexture(gl.TEXTURE_2D, f.kit.shadowTex);
      gl.uniform2f(this.loc.off, f.len * 0.05, f.len * 0.09);
      gl.uniform1f(this.loc.alpha, SHADOW_ALPHA);
      for (const g of this.geometry(f, f.kit.meta.pad || 0)) this.drawPart(f, g);
      gl.bindTexture(gl.TEXTURE_2D, f.kit.tex);
      gl.uniform2f(this.loc.off, 0, 0);
      gl.uniform1f(this.loc.alpha, 0.96);
      for (const g of this.geometry(f, 0)) this.drawPart(f, g);
    }
  }

  // 每個零件的頂點（由下往上：尾巴、鰭、身體）。pad > 0：畫影子，每個零件往外多一圈
  // （身體、尾巴是帶子，只往兩側加寬；頭尖、尾尖那一點點不加）
  geometry(f, pad) {
    const s = f.scale;
    const key = pad ? "shadow" : "main";
    f.verts ??= { main: {}, shadow: {} };
    const buf = f.verts[key];
    const tp = f.tailPart;
    buf.tail = tailStrip(f.tail, (tp.up + pad) * s, (tp.down + pad) * s, buf.tail);
    const widen = (r) => [r[0], r[1] - pad, r[2], r[3] + pad * 2];
    const parts = [{ rect: widen(tp.rect), verts: buf.tail }];
    f.fins.forEach((fin, i) => {
      const { rect, pivot } = pad ? padRect(fin, pad) : fin;
      buf[i] = finQuad(fin.at, fin.angle, { pivot, w: rect[2], h: rect[3] }, s, buf[i]);
      parts.push({ rect, verts: buf[i] });
    });
    const b = f.body;
    buf.body = buildStrip(
      f.spine,
      { halfWidth: (b.rect[3] / 2 + pad) * s, amp: this.amp(f), phase: f.phase, waveK: WAVE_K, subdiv: SUBDIV, line: f.line },
      buf.body
    );
    parts.push({ rect: widen(b.rect), verts: buf.body });
    return parts;
  }

  drawPart(f, { rect, verts }) {
    const gl = this.gl;
    const [aw, ah] = f.kit.meta.atlas;
    gl.uniform4f(this.loc.rect, rect[0] / aw, rect[1] / ah, rect[2] / aw, rect[3] / ah);
    gl.bufferData(gl.ARRAY_BUFFER, verts, gl.DYNAMIC_DRAW);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, verts.length / 4);
  }

  // ── 備用 2D 畫法：零件分開畫，身體不彎 ──
  draw2D() {
    const { ctx } = this;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, this.w, this.h);
    for (const f of this.fish) {
      const head = placeOnLine(f.line, 0, 0, f.bodyLen);
      const mid = placeOnLine(f.line, 0.5, 0, f.bodyLen);
      const bodyAngle = Math.atan2(head.y - mid.y, head.x - mid.x);
      const tailBase = f.tail.pts[0];
      const tailAngle = Math.atan2(f.tail.pts[0].y - f.tail.pts[2].y, f.tail.pts[0].x - f.tail.pts[2].x);
      const tp = f.tailPart;
      const items = [
        { part: { rect: tp.rect, pivot: [tp.rect[2], tp.up] }, at: tailBase, angle: tailAngle },
        ...f.fins.map((fin) => ({ part: fin, at: fin.at, angle: fin.angle })),
        { part: f.body, at: head, angle: bodyAngle }
      ];
      const pad = f.kit.meta.pad || 0;
      for (const [img, alpha, dx, dy, grow] of [
        [f.kit.shadow, SHADOW_ALPHA, f.len * 0.05, f.len * 0.09, pad],
        [f.kit.atlas, 0.96, 0, 0, 0]
      ]) {
        ctx.globalAlpha = alpha;
        for (const { part: raw, at, angle } of items) {
          const part = grow ? padRect(raw, grow) : raw;
          const pivot = part.pivot;
          const [rx, ry, rw, rh] = part.rect;
          ctx.save();
          ctx.translate(at.x + dx, at.y + dy);
          ctx.rotate(angle);
          ctx.scale(f.scale, f.scale);
          ctx.drawImage(img, rx, ry, rw, rh, -pivot[0], -pivot[1], rw, rh);
          ctx.restore();
        }
      }
      ctx.globalAlpha = 1;
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

// 讀每隻魚的零件圖集、影子圖集、說明檔
export function loadKoiKits(colors) {
  const img = (u) =>
    new Promise((res) => {
      const im = new Image();
      im.onload = () => res(im);
      im.onerror = () => res(null);
      im.src = u;
    });
  return Promise.all(
    colors.map(async (c) => {
      try {
        const [meta, atlas, shadow] = await Promise.all([
          fetch(`assets/koi/${c}.json`).then((r) => r.json()),
          img(`assets/koi/${c}.webp`),
          img(`assets/koi/${c}-shadow.webp`)
        ]);
        return atlas && shadow ? { meta, atlas, shadow } : null;
      } catch (_) {
        return null;
      }
    })
  ).then((list) => list.filter(Boolean));
}
