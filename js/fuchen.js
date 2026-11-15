// 九天玄女的拂塵：訪客可以拿起來揮，把霧拂開（「拂去塵埃」；呼應標語「智慧之神，指引明路」）。
// 純計算（方便測試），畫面在 js/fuchen-view.js。時間單位是「格」（60 格 ≈ 1 秒）。
//
// 拂塵的姿勢照廟裡神像拿的樣子：(x, y) 是頭（毛掛的地方），玉柄從頭往右下斜 angle（從垂直量；
// 另一端是手握的地方）。平常浮在右邊；按住它就拿起來，跟著手走；放開就慢慢飄回原位。
//
// 毛：綁在頭裡的那段弧（形狀固定：從金箍順著玉柄往外冒、繞個弧往下），接著垂下來的兩節擺錘
//   （中段、毛尖；有慣性、重力、空氣阻力）。拖著走時毛尖落在後面，停下來會晃過頭一點再慢慢停；
//   中段最多彎一個角度，不會對折。風輕輕吹；滑鼠劃過會把毛撥開。
//
// 雲海：大門下半部飄著一片雲（畫面用開場動畫的雲圖）。這裡只記「每個地方還剩多少雲」
// （FOG_COLS × FOG_ROWS 格，每格 0～1）。拂塵的毛掃過的地方雲散開，放著不管慢慢合回來（約 6 秒回一半）。

export const MAX_WISPS = 3;
export const FOG_COLS = 96;
export const FOG_ROWS = 54;
const COOL = 90; // 甩一下之後 1.5 秒內不會再掃出雲
const WISP_LIFE = 300; // 一朵雲 5 秒
const ASPECT = 394 / 900; // 拂塵圖的寬高比（tools/prep_weapons.py）
// 毛從整支的哪裡開始：拂塵圖第 307 列（900 列裡）＝頭的金箍下緣，以上是玉柄（金箍在第 278～306 列）。
// weapons.json 的 fuchen.root（0.376）量的是「毛開始變寬」的地方，比金箍低，切在那裡會有一截毛跟著玉柄斜
export const HAIR_ROOT = 307 / 900;
const ROOT = HAIR_ROOT;
const REST_TILT = 0.6; // 玉柄平常斜 約 34 度（神像拿拂塵的角度）
const HAIR_OUT = 0.5; // 毛冒出來的方向：順著玉柄往外（左上），再往下偏一點
export const HAIR_N = 60; // 毛沿著長度取幾段（畫的時候切幾條）
export const HAIR_TURN = 0.3; // 毛的前 30% 是弧（綁在頭裡，形狀固定），後面垂下來
const HAIR_GRAVITY = 0.0009; // 重力（× 整支長度，每格²）：擺一下約 2.5 秒，輕飄飄的
const HAIR_DRAG = 0.965; // 空氣阻力：每格速度留 96.5%（毛很多根，阻力大，晃兩三下就停）
const HAIR_BEND = 0.06; // 一點點硬度：中段想順著弧往下、毛尖想順著中段
const HAIR_MAX_BEND = 1.2; // 中段最多彎 1.2（約 70 度），不會對折
const FOG_BACK = Math.LN2 / 360; // 雲每格補回「差多少」的一小部分：約 6 秒補回一半

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const smooth = (a, b, x) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

// 拂塵平常的位置：x, y 是頭，len 是整支（玉柄 + 毛）的長度。
// 玉柄往右下、毛往下；右邊留給神明的名字（右側那一排）
export function fuchenAnchor(W, H) {
  const len = clamp(Math.min(H * 0.48, W * 0.6), 180, 480);
  return { x: W * 0.8, y: H * 0.26, len };
}

function fogBase(row) {
  return smooth(0.42, 0.62, (row + 0.5) / FOG_ROWS); // 0.42 以上沒有雲（屋頂、標題）
}

export function createFuchen() {
  const fog = new Float32Array(FOG_COLS * FOG_ROWS);
  for (let r = 0; r < FOG_ROWS; r++) fog.fill(fogBase(r), r * FOG_COLS, (r + 1) * FOG_COLS);
  return {
    t: 0,
    alpha: 0,
    cool: 0,
    wisps: [],
    x: null, // 還沒走過第一格：放在原位
    y: null,
    vx: 0,
    vy: 0,
    angle: REST_TILT,
    held: false,
    grab: null, // 拿起來時，手抓在哪裡（相對頭）
    press: null, // 按下去的時間、位置（放開時判斷算不算「點一下」）
    lastTip: null,
    hair: null, // 擺錘：中段 m、毛尖 t（現在 x,y、上一格 px,py）
    pts: null, // 這一格整條毛的形狀（HAIR_N+1 個點）
    fog
  };
}

// ── 毛 ──
// 毛分兩部分：
//   1. 弧：從頭的金箍順著玉柄往外（左上）冒出來，繞個弧彎成往下。這段綁在頭裡，形狀固定，跟著拂塵走。
//   2. 垂下來的部分：兩節的擺錘（中段 m、毛尖 t），有慣性、重力、空氣阻力。
//      每節長度固定；中段想順著弧的方向往下、毛尖想順著中段的方向（一點點硬度）；
//      中段那裡最多只能彎 HAIR_MAX_BEND（不會對折）。
// 畫的時候用平滑的曲線把弧、中段、毛尖接起來，再沿著曲線等距取 HAIR_N+1 個點。

// 弧的形狀（從頭出發，方向從「往左上」慢慢轉成「往下」）；回傳點和弧尾端
function arcPoints(x, y, angle, arcLen) {
  const out = angle - Math.PI + HAIR_OUT;
  const K = 24;
  const ds = arcLen / K;
  const pts = [{ x, y }];
  let px = x;
  let py = y;
  for (let i = 0; i < K; i++) {
    const phi = out * (1 - smooth(0, 1, (i + 0.5) / K));
    px += ds * Math.sin(phi);
    py += ds * Math.cos(phi);
    pts.push({ x: px, y: py });
  }
  return pts;
}

function hairLens(len) {
  const hairLen = (1 - ROOT) * len;
  const arc = hairLen * HAIR_TURN;
  return { hairLen, arc, link: (hairLen - arc) / 2 };
}

// 新的毛：擺錘直直垂在弧的尾端下面
function makeHair(x, y, angle, len) {
  const { arc, link } = hairLens(len);
  const a = arcPoints(x, y, angle, arc).at(-1);
  return { mx: a.x, my: a.y + link, mpx: a.x, mpy: a.y + link, tx: a.x, ty: a.y + 2 * link, tpx: a.x, tpy: a.y + 2 * link };
}

// Catmull-Rom 曲線：p1 到 p2 這一段，第 u 位置
function cr(p0, p1, p2, p3, u) {
  const u2 = u * u;
  const u3 = u2 * u;
  const f = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * u + (2 * a - 5 * b + 4 * c - d) * u2 + (-a + 3 * b - 3 * c + d) * u3);
  return { x: f(p0.x, p1.x, p2.x, p3.x), y: f(p0.y, p1.y, p2.y, p3.y) };
}

// 沿著折線等距取 n+1 個點
function resample(line, n) {
  const cum = [0];
  for (let i = 1; i < line.length; i++) cum.push(cum[i - 1] + Math.hypot(line[i].x - line[i - 1].x, line[i].y - line[i - 1].y));
  const total = cum.at(-1);
  const out = [];
  let j = 1;
  for (let k = 0; k <= n; k++) {
    const d = (total * k) / n;
    while (j < line.length - 1 && cum[j] < d) j++;
    const w = cum[j] > cum[j - 1] ? (d - cum[j - 1]) / (cum[j] - cum[j - 1]) : 0;
    out.push({ x: line[j - 1].x + (line[j].x - line[j - 1].x) * w, y: line[j - 1].y + (line[j].y - line[j - 1].y) * w });
  }
  return out;
}

// 整條毛的形狀：弧 + 經過中段、毛尖的平滑曲線
function hairShape(x, y, angle, len, h) {
  const { arc, link } = hairLens(len);
  const line = arcPoints(x, y, angle, arc);
  const A = line.at(-1);
  const M = { x: h.mx, y: h.my };
  const T = { x: h.tx, y: h.ty };
  const before = { x: A.x, y: A.y - link }; // 弧尾端是往下的：曲線一開始也往下，接得順
  const after = { x: 2 * T.x - M.x, y: 2 * T.y - M.y };
  const S = 16;
  for (let i = 1; i <= S; i++) line.push(cr(before, A, M, T, i / S));
  for (let i = 1; i <= S; i++) line.push(cr(A, M, T, after, i / S));
  return resample(line, HAIR_N);
}

// 走一格：慣性 + 重力 + 風 → 想順著前一段 → 長度固定 → 中段不能彎太多
function stepHair(h, x, y, angle, len, windX) {
  const { arc, link } = hairLens(len);
  const A = arcPoints(x, y, angle, arc).at(-1);
  const g = len * HAIR_GRAVITY;
  const vmx = (h.mx - h.mpx) * HAIR_DRAG;
  const vmy = (h.my - h.mpy) * HAIR_DRAG;
  const vtx = (h.tx - h.tpx) * HAIR_DRAG;
  const vty = (h.ty - h.tpy) * HAIR_DRAG;
  h.mpx = h.mx;
  h.mpy = h.my;
  h.tpx = h.tx;
  h.tpy = h.ty;
  h.mx += vmx + windX * 0.5;
  h.my += vmy + g;
  h.tx += vtx + windX;
  h.ty += vty + g;
  // 中段想順著弧尾端往下，毛尖想順著中段的方向
  h.mx += (A.x - h.mx) * HAIR_BEND;
  h.my += (A.y + link - h.my) * HAIR_BEND;
  let dx = h.mx - A.x;
  let dy = h.my - A.y;
  let d = Math.hypot(dx, dy) || 1;
  h.tx += (h.mx + (dx / d) * link - h.tx) * HAIR_BEND;
  h.ty += (h.my + (dy / d) * link - h.ty) * HAIR_BEND;
  // 長度固定
  h.mx = A.x + (dx / d) * link;
  h.my = A.y + (dy / d) * link;
  dx = h.mx - A.x;
  dy = h.my - A.y;
  const a1 = Math.atan2(dx, dy);
  let a2 = Math.atan2(h.tx - h.mx, h.ty - h.my);
  // 中段最多彎 HAIR_MAX_BEND
  let turn = a2 - a1;
  while (turn > Math.PI) turn -= 2 * Math.PI;
  while (turn < -Math.PI) turn += 2 * Math.PI;
  if (Math.abs(turn) > HAIR_MAX_BEND) a2 = a1 + Math.sign(turn) * HAIR_MAX_BEND;
  h.tx = h.mx + Math.sin(a2) * link;
  h.ty = h.my + Math.cos(a2) * link;
}

// 推一下毛（中段推一半、毛尖全推）：dx, dy 是毛尖這一格多走的距離
function pushHair(h, dx, dy) {
  h.mpx -= dx * 0.5;
  h.mpy -= dy * 0.5;
  h.tpx -= dx;
  h.tpy -= dy;
}

export function whiskPose(s, W, H) {
  const a = fuchenAnchor(W, H);
  const x = s.x ?? a.x;
  const y = s.y ?? a.y;
  if (!s.hair) s.hair = makeHair(x, y, s.angle, a.len);
  if (!s.pts) s.pts = hairShape(x, y, s.angle, a.len, s.hair);
  return { x, y, angle: s.angle, len: a.len, pts: s.pts };
}

// 毛的每一點（給畫面用）：HAIR_N+1 個，沿著毛等距
export function hairPath(p) {
  return p.pts;
}

// 拂塵上第 t 段在畫面上的位置（拂塵圖由上到下：0 = 玉柄末端（手握）、ROOT = 頭、1 = 毛尖）
export function whiskPoint(p, t) {
  if (t <= ROOT) {
    const d = (ROOT - t) * p.len; // 從頭沿著玉柄往右下
    return { x: p.x + d * Math.sin(p.angle), y: p.y + d * Math.cos(p.angle) };
  }
  const f = clamp((t - ROOT) / (1 - ROOT), 0, 1) * HAIR_N;
  const i = Math.min(HAIR_N - 1, Math.floor(f));
  const w = f - i;
  const q = p.pts;
  return { x: q[i].x + (q[i + 1].x - q[i].x) * w, y: q[i].y + (q[i + 1].y - q[i].y) * w };
}

// 這一點在毛上嗎（from：從毛的第幾成開始算）。沿著毛的每一點看：離得夠近就算
function onHair(p, q, from = 0) {
  for (let i = Math.ceil(from * HAIR_N); i <= HAIR_N; i++) {
    const u = i / HAIR_N;
    const half = p.len * ASPECT * 0.5 * (0.35 + 0.65 * u); // 毛根窄、毛尖散開
    if (Math.hypot(q.x - p.pts[i].x, q.y - p.pts[i].y) < half) return true;
  }
  return false;
}

// 這一點在玉柄上嗎（寬鬆一點，好抓）
function onHandle(p, q) {
  const dx = q.x - p.x;
  const dy = q.y - p.y;
  const along = dx * Math.sin(p.angle) + dy * Math.cos(p.angle);
  const across = dx * Math.cos(p.angle) - dy * Math.sin(p.angle);
  return along > -p.len * 0.03 && along < ROOT * p.len && Math.abs(across) < p.len * ASPECT * 0.2;
}

function onWhisk(p, q) {
  return !!q && (onHair(p, q) || onHandle(p, q));
}

// 這一點在拂塵上嗎（畫面用：滑鼠游標、手機上按住拂塵時不要捲動頁面）
export function hitWhisk(s, W, H, q) {
  return onWhisk(whiskPose(s, W, H), q);
}

export function fogAt(s, x, y, W, H) {
  const c = clamp(Math.floor((x / W) * FOG_COLS), 0, FOG_COLS - 1);
  const r = clamp(Math.floor((y / H) * FOG_ROWS), 0, FOG_ROWS - 1);
  return s.fog[r * FOG_COLS + c];
}

// 甩一下：毛往 dir 那邊甩（越往毛尖甩越多），掃出一朵雲氣
function flick(s, tip, dir, len) {
  if (s.cool > 0) return; // 冷卻中：不再加力（不然一直劃會一直甩）
  s.cool = COOL;
  pushHair(s.hair, dir * len * 0.012, 0);
  if (s.wisps.length >= MAX_WISPS) return;
  s.wisps.push({ x: tip.x, y: tip.y, vx: -0.8, vy: -0.15, age: 0, alpha: 0 });
}

// 毛掃過的地方，霧變淡（掃得越快越淡）
function sweepFog(s, p, speed, W, H) {
  const st = clamp((speed - 3) / 15, 0, 1) * 0.45;
  if (st <= 0) return;
  const R = p.len * 0.16;
  const cw = W / FOG_COLS;
  const ch = H / FOG_ROWS;
  for (const t of [0.45, 0.6, 0.75, 0.9, 1]) {
    const q = whiskPoint(p, t);
    const c0 = Math.max(0, Math.floor((q.x - R) / cw));
    const c1 = Math.min(FOG_COLS - 1, Math.floor((q.x + R) / cw));
    const r0 = Math.max(0, Math.floor((q.y - R) / ch));
    const r1 = Math.min(FOG_ROWS - 1, Math.floor((q.y + R) / ch));
    for (let r = r0; r <= r1; r++) {
      for (let c = c0; c <= c1; c++) {
        const d = Math.hypot((c + 0.5) * cw - q.x, (r + 0.5) * ch - q.y);
        if (d < R) s.fog[r * FOG_COLS + c] *= 1 - st * (1 - d / R);
      }
    }
  }
}

// 按下、放開（先按下再放開：同一格裡按了又放 = 點一下，不會黏在手上）
function handlePress(s, pose, active, click, release) {
  if (!active) s.held = false; // 離開玄女頁：放下
  if (active && click && s.alpha > 0.5 && onWhisk(pose, click)) {
    s.held = true;
    s.grab = { dx: click.x - s.x, dy: click.y - s.y };
    s.press = { t: s.t, x: s.x, y: s.y };
  }
  if (!release || !s.held) return;
  s.held = false;
  // 很快放開、幾乎沒動：算「點一下」→ 甩一下（往毛尖現在偏的反方向）
  const pr = s.press;
  if (pr && s.t - pr.t < 15 && Math.hypot(s.x - pr.x, s.y - pr.y) < 10) {
    const tip = whiskPoint(pose, 1);
    flick(s, tip, tip.x >= whiskPoint(pose, 0.6).x ? -1 : 1, pose.len);
  }
}

// 位置：拿著 → 跟著手（彈簧，有一點延遲但不跳）；沒拿 → 慢慢飄回原位（輕輕上下浮）
function moveWhisk(s, a, mouse) {
  const hand = s.held && mouse && mouse.x > -9000;
  const tx = hand ? mouse.x - s.grab.dx : a.x;
  const ty = hand ? mouse.y - s.grab.dy : a.y + a.len * 0.012 * Math.sin(s.t * 0.02);
  const k = hand ? 0.08 : 0.0035;
  const damp = 2 * Math.sqrt(k);
  s.vx += (tx - s.x) * k - s.vx * damp;
  s.vy += (ty - s.y) * k - s.vy * damp;
  // 飄回去不要太快（優雅）
  const v = Math.hypot(s.vx, s.vy);
  const vmax = a.len * 0.03;
  if (!hand && v > vmax) {
    s.vx *= vmax / v;
    s.vy *= vmax / v;
  }
  s.x += s.vx;
  s.y += s.vy;
  // 玉柄跟著移動方向斜一點點（像手腕帶著）
  const tilt = REST_TILT + clamp(s.vx * 0.006, -0.15, 0.15);
  s.angle += (tilt - s.angle) * 0.08;
}

// 毛：輕輕的風；沒拿著時，滑鼠劃過毛會把毛撥開，劃得快就甩一下；然後走一格、算出新的形狀
function moveHair(s, pose, active, mouse) {
  const len = pose.len;
  const wind = len * 0.00004 * (Math.sin(s.t * 0.011) + 0.5 * Math.sin(s.t * 0.027 + 1));
  if (active && !s.held && mouse && onHair(pose, mouse, 0.15)) {
    const vx = clamp(mouse.vx || 0, -40, 40);
    pushHair(s.hair, vx * 0.15, 0);
    if (Math.abs(vx) > 12) flick(s, whiskPoint(pose, 1), Math.sign(vx), len);
  }
  stepHair(s.hair, s.x, s.y, s.angle, len, wind);
  s.pts = hairShape(s.x, s.y, s.angle, len, s.hair);
}

// 毛尖走多快：拿著揮得快就掃出雲氣；掃過的地方雲散開；雲慢慢合回來
function stepFog(s, active, W, H) {
  const now = whiskPose(s, W, H);
  const tip = whiskPoint(now, 1);
  const speed = s.lastTip ? Math.hypot(tip.x - s.lastTip.x, tip.y - s.lastTip.y) : 0;
  s.lastTip = tip;
  if (active && s.held && speed > now.len * 0.05) flick(s, tip, 0, now.len);
  if (active && s.alpha > 0.5) sweepFog(s, now, speed, W, H);
  for (let r = 0; r < FOG_ROWS; r++) {
    const b = fogBase(r);
    for (let c = 0; c < FOG_COLS; c++) {
      const i = r * FOG_COLS + c;
      s.fog[i] += (b - s.fog[i]) * FOG_BACK;
    }
  }
}

// 雲氣：往左慢慢飄；慢慢出現、慢慢淡掉
function stepWisps(s) {
  for (const w of s.wisps) {
    w.age++;
    w.x += w.vx;
    w.y += w.vy;
    w.alpha = 0.9 * Math.min(1, w.age / 40) * Math.min(1, (WISP_LIFE - w.age) / 60);
  }
  s.wisps = s.wisps.filter((w) => w.age < WISP_LIFE);
}

export function stepFuchen(s, { W, H, active, mouse, click, release }) {
  const a = fuchenAnchor(W, H);
  if (s.x === null) {
    s.x = a.x;
    s.y = a.y;
  }
  s.t++;
  s.alpha = active ? Math.min(1, s.alpha + 1 / 60) : Math.max(0, s.alpha - 1 / 60);
  if (s.cool > 0) s.cool--;
  const pose = whiskPose(s, W, H);
  handlePress(s, pose, active, click, release);
  moveWhisk(s, a, mouse);
  moveHair(s, pose, active, mouse);
  stepFog(s, active, W, H);
  stepWisps(s);
}
