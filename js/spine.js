// 魚的脊椎：一串等距的點。頭往哪游，後面的點一個接一個跟上（像拖著的鍊子），
// 轉彎時身體自然彎成 C 形；再疊上一個「從頭傳到尾」的波，就是游泳時的 S 形擺動。
// 純計算、不碰畫面，方便測試。

export function createSpine(n, segLen, x, y, angle) {
  const pts = [];
  for (let i = 0; i < n; i++) {
    pts.push({ x: x - Math.cos(angle) * segLen * i, y: y - Math.sin(angle) * segLen * i });
  }
  return { pts, segLen };
}

// 把頭移到 (x, y)，身體跟上。maxBend：相鄰兩節最多能彎幾度（弧度），避免身體折斷似的急彎
export function followHead(spine, x, y, maxBend) {
  const { pts, segLen } = spine;
  pts[0].x = x;
  pts[0].y = y;
  let prev = null; // 上一節的方向（從頭往尾）
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1];
    const b = pts[i];
    let dir = Math.atan2(b.y - a.y, b.x - a.x);
    if (b.x === a.x && b.y === a.y) dir = prev ?? 0;
    if (prev !== null) {
      let d = Math.atan2(Math.sin(dir - prev), Math.cos(dir - prev));
      if (d > maxBend) d = maxBend;
      else if (d < -maxBend) d = -maxBend;
      dir = prev + d;
    }
    b.x = a.x + Math.cos(dir) * segLen;
    b.y = a.y + Math.sin(dir) * segLen;
    prev = dir;
  }
}

// 中央差分：第 i 點「往頭的方向」（單位向量）
function forward(p, i, out) {
  const a = p[Math.max(0, i - 1)];
  const b = p[Math.min(p.length - 1, i + 1)];
  let fx = a.x - b.x;
  let fy = a.y - b.y;
  const len = Math.hypot(fx, fy) || 1;
  out.x = fx / len;
  out.y = fy / len;
  return out;
}

// 沿著脊椎做一條「帶子」（三角形帶），魚的圖就貼在上面。
// 每個脊椎點兩個頂點：[x, y, u, v]。u：頭 = 1、尾 = 0；v：魚的左邊 = 0、右邊 = 1。
// amp：擺動幅度；phase：波的相位；waveK：身體上有幾段波（越大波越密）。
export function buildStrip(spine, { halfWidth, amp, phase, waveK }, out) {
  const p = spine.pts;
  const n = p.length;
  const disp = new Array(n);
  const f = { x: 0, y: 0 };
  // 1) 先算每個點被波推開後的位置（頭幾乎不動、越往尾擺越大）
  for (let i = 0; i < n; i++) {
    const s = i / (n - 1);
    forward(p, i, f);
    const off = Math.sin(phase - s * waveK) * amp * Math.pow(s, 1.5);
    // 法向量 = 往頭方向轉 90°
    disp[i] = { x: p[i].x - f.y * off, y: p[i].y + f.x * off };
  }
  // 2) 用推開後的形狀重新算方向，讓圖跟著彎（不是只上下平移）
  const v = out && out.length === n * 8 ? out : new Float32Array(n * 8);
  for (let i = 0; i < n; i++) {
    forward(disp, i, f);
    const nx = -f.y;
    const ny = f.x;
    const u = 1 - i / (n - 1);
    const k = i * 8;
    v[k] = disp[i].x - nx * halfWidth;
    v[k + 1] = disp[i].y - ny * halfWidth;
    v[k + 2] = u;
    v[k + 3] = 0;
    v[k + 4] = disp[i].x + nx * halfWidth;
    v[k + 5] = disp[i].y + ny * halfWidth;
    v[k + 6] = u;
    v[k + 7] = 1;
  }
  return v;
}
