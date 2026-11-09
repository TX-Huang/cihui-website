// 畫混天綾（js/ribbon.js 決定它怎麼飄，這裡只負責畫）。
// 綢帶圖（assets/ribbon/huntianling.webp，一條拉直的紅綢）沿著那串點彎成一條帶子：
// 長的方向貼圖的左到右，寬的方向貼圖的上到下。兩端照 ribbonWidth 收成尖的、慢慢變透明；
// 綢子偶爾翻轉（寬度變窄、顏色暗一點），看起來比較像真的絲。
import { createFlow, stepFlow, ribbonWidth } from "./ribbon.js";

const SUB = 3; // 每兩個點之間再細分幾段（曲線比較圓順）

export class RibbonView {
  constructor(canvas, img) {
    this.c = canvas;
    this.img = img;
    this.flow = createFlow();
    this.active = false;
    this.mouse = { x: -9999, y: -9999, vx: 0, vy: 0 };
    this.gl = canvas.getContext("webgl", { alpha: true, premultipliedAlpha: true, antialias: true });
    window.addEventListener("pointermove", (e) => {
      if (this.mouse.x > -9000) {
        this.mouse.vx = e.clientX - this.mouse.x;
        this.mouse.vy = e.clientY - this.mouse.y;
      }
      this.mouse.x = e.clientX;
      this.mouse.y = e.clientY;
    });
    this.resize();
    window.addEventListener("resize", () => this.resize());
    if (this.gl) this.initGL();
  }

  resize() {
    this.dpr = Math.min(1.5, window.devicePixelRatio || 1);
    this.w = window.innerWidth;
    this.h = window.innerHeight;
    this.c.width = this.w * this.dpr;
    this.c.height = this.h * this.dpr;
  }

  initGL() {
    const gl = this.gl;
    const vs = `
      attribute vec2 a_pos;
      attribute vec2 a_uv;
      attribute vec2 a_look;
      uniform vec2 u_res;
      varying vec2 v_uv;
      varying vec2 v_look;
      void main() {
        vec2 p = a_pos / u_res * 2.0 - 1.0;
        gl_Position = vec4(p.x, -p.y, 0.0, 1.0);
        v_uv = a_uv;
        v_look = a_look;
      }`;
    // v_look.x：透明度；v_look.y：亮度（翻過去的地方暗一點）
    const fs = `
      precision mediump float;
      varying vec2 v_uv;
      varying vec2 v_look;
      uniform sampler2D u_tex;
      void main() {
        vec4 c = texture2D(u_tex, v_uv);
        gl_FragColor = vec4(c.rgb * v_look.y, c.a) * v_look.x;
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
      this.gl = null; // 顯示卡不合作：就不畫綢帶（不影響其他東西）
      return;
    }
    gl.useProgram(prog);
    const pos = gl.getAttribLocation(prog, "a_pos");
    const uv = gl.getAttribLocation(prog, "a_uv");
    const look = gl.getAttribLocation(prog, "a_look");
    this.res = gl.getUniformLocation(prog, "u_res");
    this.vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
    for (const [loc, off] of [
      [pos, 0],
      [uv, 8],
      [look, 16]
    ]) {
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 24, off);
    }
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA); // 預乘 alpha
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
    const t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.img);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  }

  tick() {
    if (!this.gl) return;
    if (this.w !== window.innerWidth || this.h !== window.innerHeight) this.resize();
    if (this.w < 50) return;
    stepFlow(this.flow, {
      w: this.w,
      h: this.h,
      active: this.active,
      mouse: this.mouse,
      random: Math.random
    });
    this.mouse.vx *= 0.6;
    this.mouse.vy *= 0.6;
    this.draw();
  }

  draw() {
    const gl = this.gl;
    gl.viewport(0, 0, this.c.width, this.c.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    const r = this.flow.ribbon;
    if (!r) return;
    const verts = this.strip(r, this.flow.alpha);
    gl.uniform2f(this.res, this.w, this.h);
    gl.bufferData(gl.ARRAY_BUFFER, verts, gl.DYNAMIC_DRAW);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, verts.length / 6);
  }

  // 沿著點做出一條帶子：每個位置左右各一個頂點
  strip(r, alpha) {
    const line = smoothLine(r.pts, SUB);
    const n = line.length;
    const width = Math.max(22, Math.min(46, this.h * 0.045)); // 綢帶多寬（像素）
    const out = new Float32Array(n * 2 * 6);
    for (let i = 0; i < n; i++) {
      const s = i / (n - 1);
      const a = line[Math.max(0, i - 1)];
      const b = line[Math.min(n - 1, i + 1)];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const d = Math.hypot(dx, dy) || 1;
      const nx = -dy / d;
      const ny = dx / d;
      // 慢慢翻轉：寬度在 55%～100% 之間變化，翻過去（窄）的地方暗一點
      const twist = 0.55 + 0.45 * Math.abs(Math.cos(s * 4.2 + r.t * 0.012 + r.seed));
      const half = (width / 2) * ribbonWidth(s) * twist;
      const shade = 0.8 + 0.2 * twist;
      // 兩端除了變細，也慢慢變透明；整條是半透明的絲
      const a2 = alpha * 0.92 * Math.min(1, ribbonWidth(s) * 2.5);
      const p = line[i];
      const o = i * 12;
      out.set([p.x + nx * half, p.y + ny * half, s, 0, a2, shade], o);
      out.set([p.x - nx * half, p.y - ny * half, s, 1, a2, shade], o + 6);
    }
    return out;
  }
}

// 穿過每個點的平滑曲線（Catmull-Rom），每兩點之間細分 sub 段
function smoothLine(pts, sub) {
  const out = [];
  const n = pts.length;
  for (let i = 0; i < n - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(n - 1, i + 2)];
    for (let k = 0; k < sub; k++) {
      const t = k / sub;
      const t2 = t * t;
      const t3 = t2 * t;
      const f = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      out.push({ x: f(p0.x, p1.x, p2.x, p3.x), y: f(p0.y, p1.y, p2.y, p3.y) });
    }
  }
  out.push({ x: pts[n - 1].x, y: pts[n - 1].y });
  return out;
}

export function loadRibbonImage() {
  return new Promise((res) => {
    const im = new Image();
    im.onload = () => res(im);
    im.onerror = () => res(null);
    im.src = "assets/ribbon/huntianling.webp";
  });
}
