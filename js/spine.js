// 魚的脊椎：一串等距的點。頭往哪游，後面的點一個接一個跟上（像拖著的鍊子），
// 轉彎時身體自然彎成 C 形；再疊上一個「從頭傳到尾」的波，就是游泳時的 S 形擺動。
// 純計算、不碰畫面，方便測試。

// 擺動幅度沿身體怎麼長：s 的幾次方（越大，前半身越不動、只有尾巴擺；鯉魚就是這樣游的，
// 前半身一扭，長在那裡的胸鰭、背鰭就會被擠成一塊一塊）
const WAVE_ENVELOPE = 3;
// 急彎時內側最多用到彎曲半徑的幾成（1 = 剛好碰到圓心，會翻面）
const RADIUS_FRACTION = 0.9;

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
// subdiv：每一節再切成幾小段（沿平滑曲線補點）。脊椎點不多，直接連起來輪廓會一節一節有折角；
//         切細之後輪廓是平滑的曲線。
export function buildStrip(spine, { halfWidth, amp, phase, waveK, subdiv = 1 }, out) {
  const p = smoothPoints(spine.pts, subdiv);
  const n = p.length;
  const disp = new Array(n);
  const f = { x: 0, y: 0 };
  // 1) 先算每個點被波推開後的位置（頭幾乎不動、越往尾擺越大）
  for (let i = 0; i < n; i++) {
    const s = i / (n - 1);
    forward(p, i, f);
    const off = Math.sin(phase - s * waveK) * amp * Math.pow(s, WAVE_ENVELOPE);
    // 法向量 = 往頭方向轉 90°
    disp[i] = { x: p[i].x - f.y * off, y: p[i].y + f.x * off };
  }
  // 2) 防止「翻面」：急彎時，內側的寬度不能超過彎曲半徑，否則內側的邊會交叉打結。
  //    彎越急，內側收越窄；外側不受影響。
  const wNeg = new Array(n).fill(halfWidth); // -法向量那一側（v = 0）
  const wPos = new Array(n).fill(halfWidth); // +法向量那一側（v = 1）
  for (let i = 0; i < n; i++) {
    const turn = turnAt(disp, i);
    if (turn === 0) continue;
    const radius = (segAvg(disp, i) / Math.abs(turn)) * RADIUS_FRACTION;
    if (turn > 0) wPos[i] = Math.min(halfWidth, radius);
    else wNeg[i] = Math.min(halfWidth, radius);
  }
  // 寬度突然收窄會讓輪廓有缺口，所以「先取附近最窄、再平均」：
  // 每一點都不會比自己原本允許的寬（不會翻面），但變化是平順的
  const r = Math.max(1, subdiv);
  smoothWidth(wNeg, r);
  smoothWidth(wPos, r);
  // 3) 用推開後的形狀重新算方向，讓圖跟著彎（不是只上下平移）
  const v = out && out.length === n * 8 ? out : new Float32Array(n * 8);
  for (let i = 0; i < n; i++) {
    forward(disp, i, f);
    const nx = -f.y;
    const ny = f.x;
    const u = 1 - i / (n - 1);
    const k = i * 8;
    v[k] = disp[i].x - nx * wNeg[i];
    v[k + 1] = disp[i].y - ny * wNeg[i];
    v[k + 2] = u;
    v[k + 3] = 0;
    v[k + 4] = disp[i].x + nx * wPos[i];
    v[k + 5] = disp[i].y + ny * wPos[i];
    v[k + 6] = u;
    v[k + 7] = 1;
  }
  return v;
}

// 沿著脊椎點畫一條平滑曲線（Catmull-Rom：會通過每個原本的點），每一節補成 subdiv 小段
function smoothPoints(pts, subdiv) {
  if (subdiv <= 1) return pts;
  const n = pts.length;
  const out = [];
  for (let i = 0; i < n - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(n - 1, i + 2)];
    for (let s = 0; s < subdiv; s++) {
      const t = s / subdiv;
      const t2 = t * t;
      const t3 = t2 * t;
      const cr = (a, b, c, d) =>
        0.5 * (2 * b + (c - a) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (3 * b - a - 3 * c + d) * t3);
      out.push({ x: cr(p0.x, p1.x, p2.x, p3.x), y: cr(p0.y, p1.y, p2.y, p3.y) });
    }
  }
  out.push({ x: pts[n - 1].x, y: pts[n - 1].y });
  return out;
}

// 先取前後 2r 點裡最窄的，再做兩次「前後 r 點平均」（三角形的平滑，比一次平均更順）。
// 結果每一點都 ≤ 原本的值：兩次平均最遠只用到前後 2r 點的值，而那些值都是「包含自己那一點」的最小值。
function smoothWidth(w, r) {
  const n = w.length;
  const mins = new Array(n);
  for (let i = 0; i < n; i++) {
    let m = w[i];
    for (let j = Math.max(0, i - 2 * r); j <= Math.min(n - 1, i + 2 * r); j++) m = Math.min(m, w[j]);
    mins[i] = m;
  }
  const avg = (src) => {
    const out = new Array(n);
    for (let i = 0; i < n; i++) {
      let sum = 0;
      let cnt = 0;
      for (let j = Math.max(0, i - r); j <= Math.min(n - 1, i + r); j++) {
        sum += src[j];
        cnt++;
      }
      out[i] = sum / cnt;
    }
    return out;
  };
  const sm = avg(avg(mins));
  for (let i = 0; i < n; i++) w[i] = sm[i];
}

// 第 i 點的轉彎角（往頭的方向看；正 = 往 +法向量那邊彎）。兩端回傳 0
function turnAt(p, i) {
  if (i === 0 || i === p.length - 1) return 0;
  const ax = p[i].x - p[i + 1].x;
  const ay = p[i].y - p[i + 1].y;
  const bx = p[i - 1].x - p[i].x;
  const by = p[i - 1].y - p[i].y;
  return Math.atan2(ax * by - ay * bx, ax * bx + ay * by);
}

function segAvg(p, i) {
  const a = p[Math.max(0, i - 1)];
  const b = p[Math.min(p.length - 1, i + 1)];
  return Math.hypot(a.x - b.x, a.y - b.y) / 2;
}
