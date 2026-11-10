// 畫瑤池湖面（js/lake.js 管湖在哪、漣漪；這裡用 WebGL 把背景圖下半部輕輕扭動）。
// 畫布放在 .sky-img 裡面，跟原本的 CSS 背景圖疊在同一個位置：
// 視差（跟著滑鼠微微移動）、走進門的放大、每位神明的色調（::after）都照舊套用。
// 顯示卡不合作時就不畫，底下原本的 CSS 背景圖還在，看起來只是不會動。
import { coverMap, waterTop, createLake, touch, stepLake, rippleRadius, rippleAmp, remapRipples, HORIZON, MAX_RIPPLES } from "./lake.js";

const POS_Y = 0.6; // 跟 style.css 的 background-position 一樣（center 60%）

const VS = `
attribute vec2 a_pos;
uniform vec2 u_vres; // 跟 u_res 一樣，但頂點、像素兩段的精度可能不同，所以分開
varying vec2 v_pos;
void main() {
  v_pos = a_pos * u_vres;
  gl_Position = vec4(a_pos.x * 2.0 - 1.0, 1.0 - a_pos.y * 2.0, 0.0, 1.0);
}`;

// v_pos：這一點在 .sky-img 裡的位置（CSS 像素）。水平線以下：
// 1. 倒影慢慢晃：兩道很慢的波，越近（越下面）越大、越遠（靠水平線）越細越密
// 2. 水光：幾條很淡的橫向亮線慢慢閃
// 3. 漣漪：一圈一圈往外推（上下壓扁成橢圓，像從斜上方看水面）
const FS = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform sampler2D u_img;
uniform vec2 u_res;
uniform vec3 u_map;
uniform vec2 u_isize;
uniform float u_top;
uniform float u_hz; // 水平線在圖上的高度（取顏色時水面不能取到水平線以上的天空）
uniform vec4 u_ph; // 各道波的相位（在 JS 算好、繞 2π，時間再久也不會失去精度）
uniform float u_ph2;
uniform vec4 u_rip[${MAX_RIPPLES}];
varying vec2 v_pos;
void main() {
  vec2 p = v_pos;
  vec2 off = vec2(0.0);
  float light = 0.0;
  float depth = (p.y - u_top) / max(1.0, u_res.y - u_top);
  if (depth > 0.0) {
    float fade = smoothstep(0.0, 0.06, depth);
    float persp = 0.25 + depth;
    float w1 = sin(p.y / persp * 0.09 - u_ph.x + sin(p.x * 0.004 + u_ph.y) * 1.5);
    float w2 = sin(p.y / persp * 0.031 + p.x * 0.006 - u_ph.z);
    off.x += (w1 * 3.2 + w2 * 2.4) * persp * fade;
    off.y += w2 * 1.4 * persp * fade;
    // 波的明暗：波峰亮一點、波谷暗一點（背景很柔，只扭動看不太出來，加上明暗才看得到在晃）
    light += (w1 * 0.018 + w2 * 0.012) * fade;
    float g = sin(p.y / persp * 0.22 + sin(p.x * 0.01 - u_ph.w) * 2.0 - u_ph2);
    // 切成一小段一小段、每一列錯開（不然會變成一條條整齊的白線）
    float brk = sin(p.x * 0.012 / persp + p.y / persp * 0.7 + u_ph.y * 3.0) * 0.5 + 0.5;
    light += smoothstep(0.86, 1.0, g) * smoothstep(0.5, 0.95, brk) * 0.09 * fade * (1.0 - depth * 0.5);
    for (int i = 0; i < ${MAX_RIPPLES}; i++) {
      vec4 r = u_rip[i];
      if (r.w <= 0.0) continue;
      vec2 d = p - r.xy;
      d.y *= 2.6;
      float dist = length(d);
      float x = dist - r.z;
      float env = exp(-x * x / 648.0);
      float wave = sin(x * 0.3) * env * r.w;
      off += (dist > 0.0 ? d / dist : vec2(0.0)) * wave * 6.0 * fade;
      light += wave * 0.075 * fade;
    }
  }
  vec2 uv = (p + off - u_map.yz) / (u_map.x * u_isize);
  if (depth > 0.0) uv.y = max(uv.y, u_hz);
  vec3 c = texture2D(u_img, uv).rgb;
  gl_FragColor = vec4(c + light, 1.0);
}`;

export class LakeView {
  constructor(host, img, gateImg, gate) {
    this.host = host; // .sky-img
    this.img = img;
    this.gateEl = gateImg; // 大門（實的地方後面看不到湖，漣漪就不冒）
    this.gate = gate; // 大門設計座標（門洞：裡面是珠簾，也看不到湖）
    this.gateMask = null;
    this.lake = createLake();
    this.frame = 0;
    this.c = document.createElement("canvas");
    this.c.className = "lake";
    this.c.setAttribute("aria-hidden", "true");
    this.gl = this.c.getContext("webgl", { alpha: false, antialias: false });
    if (!this.gl || !this.init()) {
      this.gl = null;
      return;
    }
    host.appendChild(this.c);
    // 顯示卡重置（睡眠喚醒、驅動更新）：先藏起來（底下的 CSS 背景圖頂著），恢復後重建
    this.c.addEventListener("webglcontextlost", (e) => {
      e.preventDefault();
      this.lost = true;
      this.c.style.visibility = "hidden";
    });
    this.c.addEventListener("webglcontextrestored", () => {
      if (!this.init()) return;
      this.lost = false;
      this.c.style.visibility = "";
    });
    window.addEventListener("pointermove", (e) => this.poke("move", e));
    window.addEventListener("pointerdown", (e) => {
      if (e.target.closest && e.target.closest("button, a, nav, header")) return;
      this.poke("click", e);
    });
    this.resize();
  }

  init() {
    const gl = this.gl;
    const sh = (type, src) => {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      return s;
    };
    const prog = gl.createProgram();
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS));
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return false;
    gl.useProgram(prog);
    this.u = {};
    for (const n of ["u_vres", "u_res", "u_map", "u_isize", "u_top", "u_hz", "u_ph", "u_ph2", "u_rip"]) this.u[n] = gl.getUniformLocation(prog, n);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "a_pos");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, this.img);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.uniform2f(this.u.u_isize, this.img.width, this.img.height);
    gl.uniform1f(this.u.u_hz, HORIZON + 0.5 / this.img.height);
    this.rip = new Float32Array(MAX_RIPPLES * 4);
    return true;
  }

  // .sky-img 自己的大小（不含視差的位移、放大）
  resize() {
    this.ew = this.host.offsetWidth;
    this.eh = this.host.offsetHeight;
    // 背景本來就柔和，解析度不用太高（省顯示卡）
    this.dpr = Math.min(1.25, window.devicePixelRatio || 1);
    this.c.width = Math.round(this.ew * this.dpr);
    this.c.height = Math.round(this.eh * this.dpr);
    const old = this.map;
    this.map = coverMap(this.ew, this.eh, this.img.width, this.img.height, POS_Y);
    this.top = waterTop(this.map, this.img.height);
    if (old) remapRipples(this.lake, old, this.map); // 漣漪留在湖上同一點
  }

  // 畫面座標 → .sky-img 裡的座標（扣掉視差的位移和放大）
  local(x, y) {
    const r = this.host.getBoundingClientRect();
    return { x: ((x - r.left) / r.width) * this.ew, y: ((y - r.top) / r.height) * this.eh };
  }

  // 湖面（水平線）在畫面上的高度：給花瓣判斷落水
  screenWaterTop() {
    if (!this.gl) return null;
    const r = this.host.getBoundingClientRect();
    return r.top + (this.top / this.eh) * r.height;
  }

  // 碰一下水面（點擊、滑鼠滑過、花瓣落水）；在大門後面看不到的地方就不冒
  poke(kind, e) {
    this.at(kind, e.clientX, e.clientY);
  }

  // (x, y) 看得到湖嗎：水平線以下、不在大門後面（花瓣落水前先問）
  visibleWater(x, y) {
    if (!this.gl || this.lost) return false;
    return y > this.screenWaterTop() + 4 && !this.behindGate(x, y);
  }

  at(kind, x, y) {
    if (!this.gl || this.lost || this.behindGate(x, y)) return;
    const p = this.local(x, y);
    touch(this.lake, kind, p.x, p.y, this.top);
  }

  behindGate(x, y) {
    if (!this.gateMask) this.gateMask = makeMask(this.gateEl);
    const m = this.gateMask;
    if (!m) return false;
    const r = this.gateEl.getBoundingClientRect();
    if (x < r.left || x >= r.right || y < r.top || y >= r.bottom) return false;
    const k = r.width / this.gate.w;
    const d = this.gate.door;
    if (x > r.left + d.x0 * k && x < r.left + d.x1 * k && y > r.top + d.y0 * k && y < r.top + d.y1 * k) return true;
    const mx = Math.floor(((x - r.left) / r.width) * m.w);
    const my = Math.floor(((y - r.top) / r.height) * m.h);
    return m.solid[my * m.w + mx] === 1;
  }

  tick() {
    if (!this.gl || this.lost) return;
    if (this.ew !== this.host.offsetWidth || this.eh !== this.host.offsetHeight) this.resize();
    stepLake(this.lake);
    this.frame += 1;
    this.draw();
  }

  draw() {
    const gl = this.gl;
    gl.viewport(0, 0, this.c.width, this.c.height);
    gl.uniform2f(this.u.u_res, this.ew, this.eh);
    gl.uniform2f(this.u.u_vres, this.ew, this.eh);
    gl.uniform3f(this.u.u_map, this.map.scale, this.map.ox, this.map.oy);
    gl.uniform1f(this.u.u_top, this.top);
    const t = this.frame / 60;
    const ph = (k) => (t * k) % (Math.PI * 2);
    gl.uniform4f(this.u.u_ph, ph(0.6), ph(0.1), ph(0.35), ph(0.3));
    gl.uniform1f(this.u.u_ph2, ph(0.8));
    this.rip.fill(0);
    this.lake.ripples.forEach((r, i) => this.rip.set([r.x, r.y, rippleRadius(r), rippleAmp(r)], i * 4));
    gl.uniform4fv(this.u.u_rip, this.rip);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }
}

// 大門圖縮小成一張「哪裡是實的」的小表（只做一次）
function makeMask(img) {
  if (!img || !img.naturalWidth) return null;
  const w = 240;
  const h = Math.round((w * img.naturalHeight) / img.naturalWidth);
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(img, 0, 0, w, h);
  const data = ctx.getImageData(0, 0, w, h).data;
  const solid = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) solid[i] = data[i * 4 + 3] > 128 ? 1 : 0;
  return { w, h, solid };
}

export function loadLakeImage() {
  return new Promise((res) => {
    const im = new Image();
    im.onload = () => res(im);
    im.onerror = () => res(null);
    im.src = "assets/bg-yaochi.webp";
  });
}
