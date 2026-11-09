// 鯉魚拆零件後的計算（純計算，方便測試）。
// 魚 = 身體（沿脊椎彎的帶子）＋ 尾巴（自己一條會慢半拍的鍊子）＋ 各片鰭（硬的小圖，接在身上某一點，各自輕輕擺）。

// 沿著身體中線（頭在 pts[0]）走到 s（0 = 頭、1 = 身體末端），再往側邊推 d×L。
// 回傳那一點和那裡「往頭的方向」（angle）。d > 0 是圖的下方（頭朝右時的 +y）。
// s 照「第幾個點」算（跟身體的圖怎麼貼一樣：u = 1 - i/(n-1)），
// 不照實際長度算：身體擺動時每段長度會稍微變，照長度算的話鰭會在身上滑來滑去。
export function placeOnLine(pts, s, d, L) {
  const n = pts.length;
  const f = Math.min(1, Math.max(0, s)) * (n - 1);
  const i = Math.min(n - 2, Math.floor(f));
  const t = f - i;
  const a = pts[i];
  const b = pts[i + 1];
  const x = a.x + (b.x - a.x) * t;
  const y = a.y + (b.y - a.y) * t;
  const angle = Math.atan2(a.y - b.y, a.x - b.x); // 往頭
  const nx = -Math.sin(angle);
  const ny = Math.cos(angle);
  return { x: x + nx * d * L, y: y + ny * d * L, angle };
}

// 一片硬的鰭：圖上的 pivot 那一點對準 anchor，整片轉 angle。
// 回傳 4 個角（三角形帶的順序：左上、右上、左下、右下），每個 [x, y, u, v]。
export function finQuad(anchor, angle, { pivot, w, h }, scale, out) {
  const v = out && out.length === 16 ? out : new Float32Array(16);
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const corners = [
    [-pivot[0], -pivot[1], 0, 0],
    [w - pivot[0], -pivot[1], 1, 0],
    [-pivot[0], h - pivot[1], 0, 1],
    [w - pivot[0], h - pivot[1], 1, 1]
  ];
  corners.forEach(([lx, ly, u, vv], i) => {
    const x = lx * scale;
    const y = ly * scale;
    v[i * 4] = anchor.x + x * c - y * s;
    v[i * 4 + 1] = anchor.y + x * s + y * c;
    v[i * 4 + 2] = u;
    v[i * 4 + 3] = vv;
  });
  return v;
}

// 尾巴：一串點，第 0 點黏在身體末端。每一點有慣性（會晃、會慢半拍），
// 又被輕輕拉回「順著前一節」的方向（所以最後會拉直），而且每一節最多彎 maxBend（不會打結）。
export function createTail(n, seg, base, { maxBend = 0.15, stiffness = 0.1, damping = 0.75 } = {}) {
  const back = base.angle + Math.PI;
  const pts = [];
  for (let i = 0; i < n; i++) {
    const x = base.x + Math.cos(back) * seg * i;
    const y = base.y + Math.sin(back) * seg * i;
    pts.push({ x, y, px: x, py: y });
  }
  return { pts, seg, maxBend, stiffness, damping };
}

export function stepTail(tail, base) {
  const { pts, seg, maxBend, stiffness, damping } = tail;
  // 1) 慣性：照上一格的速度繼續走（打點折扣）
  for (let i = 1; i < pts.length; i++) {
    const p = pts[i];
    const vx = (p.x - p.px) * damping;
    const vy = (p.y - p.py) * damping;
    p.px = p.x;
    p.py = p.y;
    p.x += vx;
    p.y += vy;
  }
  pts[0].x = pts[0].px = base.x;
  pts[0].y = pts[0].py = base.y;
  // 2) 拉回順著前一節的位置（越靠根部越硬）
  let dir = base.angle + Math.PI; // 從根往尾的方向
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1];
    const p = pts[i];
    const k = stiffness * (1 - (i - 1) / pts.length);
    p.x += (a.x + Math.cos(dir) * seg - p.x) * k;
    p.y += (a.y + Math.sin(dir) * seg - p.y) * k;
    dir = Math.atan2(p.y - a.y, p.x - a.x);
  }
  // 3) 長度固定、彎曲有上限
  let prev = base.angle + Math.PI;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1];
    const p = pts[i];
    let d = Math.atan2(p.y - a.y, p.x - a.x);
    let diff = Math.atan2(Math.sin(d - prev), Math.cos(d - prev));
    if (i === 1) diff = Math.max(-maxBend * 2, Math.min(maxBend * 2, diff)); // 尾柄可以多彎一點
    else diff = Math.max(-maxBend, Math.min(maxBend, diff));
    d = prev + diff;
    p.x = a.x + Math.cos(d) * seg;
    p.y = a.y + Math.sin(d) * seg;
    prev = d;
  }
}

// 尾巴的帶子：每一點兩個頂點 [x, y, u, v]。u：根 = 1、尖 = 0。
// up = 中線往「圖上方」的寬度（v = 0 那邊），down = 往下（v = 1）。
export function tailStrip(tail, up, down, out) {
  const p = tail.pts;
  const n = p.length;
  const v = out && out.length === n * 8 ? out : new Float32Array(n * 8);
  for (let i = 0; i < n; i++) {
    const a = p[Math.max(0, i - 1)];
    const b = p[Math.min(n - 1, i + 1)];
    let fx = a.x - b.x; // 往根的方向（頭的方向）
    let fy = a.y - b.y;
    const len = Math.hypot(fx, fy) || 1;
    fx /= len;
    fy /= len;
    const nx = -fy;
    const ny = fx;
    const u = 1 - i / (n - 1);
    const k = i * 8;
    v[k] = p[i].x - nx * up;
    v[k + 1] = p[i].y - ny * up;
    v[k + 2] = u;
    v[k + 3] = 0;
    v[k + 4] = p[i].x + nx * down;
    v[k + 5] = p[i].y + ny * down;
    v[k + 6] = u;
    v[k + 7] = 1;
  }
  return v;
}

// 備用 2D 畫法的身體是一張不彎的圖：給它一條直的中線，鰭和尾巴才會接在真的畫出來的身體上
export function rigidLine(head, angle, length, n) {
  const pts = [];
  for (let i = 0; i < n; i++) {
    const k = (length * i) / (n - 1);
    pts.push({ x: head.x - Math.cos(angle) * k, y: head.y - Math.sin(angle) * k });
  }
  return pts;
}

// 影子比零件本身大一圈（模糊會往外暈開）：取圖時多取 pad，接點也跟著挪
export function padRect({ rect, pivot }, pad) {
  return {
    rect: [rect[0] - pad, rect[1] - pad, rect[2] + pad * 2, rect[3] + pad * 2],
    pivot: [pivot[0] + pad, pivot[1] + pad]
  };
}
