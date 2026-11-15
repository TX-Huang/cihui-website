// 九天玄女的拂塵：訪客可以拿起來揮，把霧拂開（「拂去塵埃」；呼應標語「智慧之神，指引明路」）。
// 純計算（方便測試），畫面在 js/fuchen-view.js。時間單位是「格」（60 格 ≈ 1 秒）。
//
// 拂塵的姿勢照廟裡神像拿的樣子：(x, y) 是頭（毛掛的地方），玉柄從頭往右下斜 angle（從垂直量；
// 另一端是手握的地方）。毛從頭順著玉柄的反方向冒出來（往左），繞一個柔順的弧再往下垂（重力），
// 像神像手上的拂塵；毛根藏在頭的金箍底下，不會看到一刀切平的邊。
// 平常浮在右邊；按住它就拿起來，跟著手走；放開就慢慢飄回原位。
// bend：毛尖往左右偏多少（像素）。像彈簧一樣被拉回「風」要的位置，所以擺得慢、不會抖；
// 拂塵在動的時候，毛往移動的反方向拖。毛的每一段照 hairOffset 偏：毛根不動，越往毛尖偏越多。
//
// 雲海：大門下半部飄著一片雲（畫面用開場動畫的雲圖）。這裡只記「每個地方還剩多少雲」
// （FOG_COLS × FOG_ROWS 格，每格 0～1）。拂塵的毛掃過的地方雲散開，放著不管幾秒內慢慢合回來。

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
export const HAIR_TURN = 0.3; // 毛在前 30% 的長度裡彎下來，之後直直垂
export const HAIR_STEPS = 100;
const FOG_BACK = 0.01; // 霧每格補回「差多少」的 1%：1 秒補回約一半，5 秒幾乎補滿

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

// 毛的第 s 段（0 = 毛根、1 = 毛尖）往旁邊偏多少
export function hairOffset(s, bend) {
  return bend * s * s;
}

function fogBase(row) {
  return smooth(0.42, 0.62, (row + 0.5) / FOG_ROWS); // 0.42 以上沒有雲（屋頂、標題）
}

export function createFuchen() {
  const fog = new Float32Array(FOG_COLS * FOG_ROWS);
  for (let r = 0; r < FOG_ROWS; r++) fog.fill(fogBase(r), r * FOG_COLS, (r + 1) * FOG_COLS);
  return {
    t: 0,
    bend: 0,
    bendV: 0,
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
    fog
  };
}

export function whiskPose(s, W, H) {
  const a = fuchenAnchor(W, H);
  return { x: s.x ?? a.x, y: s.y ?? a.y, angle: s.angle, len: a.len, bend: s.bend };
}

// 毛的形狀：從頭出發，方向（從「往下」量的角度）一開始是 HAIR_OUT 那邊，慢慢轉成直直往下。
// 回傳 HAIR_STEPS+1 個點（沿著毛等距），再加上隨風擺的偏移（越往毛尖越多）
export function hairPath(p) {
  const out = p.angle - Math.PI + HAIR_OUT;
  const ds = ((1 - ROOT) * p.len) / HAIR_STEPS;
  const pts = [];
  let x = 0;
  let y = 0;
  for (let i = 0; i <= HAIR_STEPS; i++) {
    const u = i / HAIR_STEPS;
    pts.push({ x: p.x + x + hairOffset(u, p.bend), y: p.y + y });
    const phi = out * (1 - smooth(0, HAIR_TURN, u + 0.5 / HAIR_STEPS));
    x += ds * Math.sin(phi);
    y += ds * Math.cos(phi);
  }
  return pts;
}

// 毛上第 u 段（0 = 毛根、1 = 毛尖）
function hairAt(pts, u) {
  const f = clamp(u, 0, 1) * HAIR_STEPS;
  const i = Math.min(HAIR_STEPS - 1, Math.floor(f));
  const w = f - i;
  return { x: pts[i].x + (pts[i + 1].x - pts[i].x) * w, y: pts[i].y + (pts[i + 1].y - pts[i].y) * w };
}

// 拂塵上第 t 段在畫面上的位置（拂塵圖由上到下：0 = 玉柄末端（手握）、ROOT = 頭、1 = 毛尖）
export function whiskPoint(p, t) {
  if (t <= ROOT) {
    const d = (ROOT - t) * p.len; // 從頭沿著玉柄往右下
    return { x: p.x + d * Math.sin(p.angle), y: p.y + d * Math.cos(p.angle) };
  }
  return hairAt(hairPath(p), (t - ROOT) / (1 - ROOT));
}

// 這一點在毛上嗎（from：從毛的第幾成開始算）。沿著毛的每一段看：離中線夠近就算
function onHair(p, q, from = 0) {
  const pts = hairPath(p);
  for (let i = Math.ceil(from * HAIR_STEPS); i <= HAIR_STEPS; i++) {
    const u = i / HAIR_STEPS;
    const half = p.len * ASPECT * 0.5 * (0.35 + 0.65 * u); // 毛根窄、毛尖散開
    if (Math.hypot(q.x - pts[i].x, q.y - pts[i].y) < half) return true;
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

function flick(s, tip, dir, len) {
  if (s.cool > 0) return; // 冷卻中：不再加力（不然一直劃會被推到底卡住）
  s.cool = COOL;
  s.bendV += dir * len * 0.03;
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
  // 很快放開、幾乎沒動：算「點一下」→ 甩一下
  const pr = s.press;
  if (pr && s.t - pr.t < 15 && Math.hypot(s.x - pr.x, s.y - pr.y) < 10) {
    flick(s, whiskPoint(pose, 1), s.bend >= 0 ? -1 : 1, pose.len);
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

// 毛：風 + 移動時往反方向拖；沒拿著時，滑鼠快速劃過毛就甩一下
function bendHair(s, pose, active, mouse) {
  const len = pose.len;
  const wind = len * 0.035 * (Math.sin(s.t * 0.011) + 0.5 * Math.sin(s.t * 0.027 + 1));
  s.bendV -= s.vx * 0.04;
  if (active && !s.held && mouse && onHair(pose, mouse, 0.15)) {
    const vx = mouse.vx || 0;
    s.bendV += clamp(vx, -40, 40) * 0.015;
    if (Math.abs(vx) > 12) flick(s, whiskPoint(pose, 1), Math.sign(vx), len);
  }
  s.bendV += (wind - s.bend) * 0.01;
  s.bendV *= 0.92;
  s.bend = clamp(s.bend + s.bendV, -len * 0.35, len * 0.35);
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
  bendHair(s, pose, active, mouse);
  stepFog(s, active, W, H);
  stepWisps(s);
}
