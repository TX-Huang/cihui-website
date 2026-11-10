// 丹鳳（九天玄女頁）。《墉城集仙錄》：九天玄女乘丹鳳。
// 純計算（方便測試），畫面在 js/phoenix-view.js。時間單位是「格」（60 格 ≈ 1 秒）。
//
// 一次造訪的流程：
// 1. 進到這一頁，停一下 → 丹鳳從畫面下方升上來，正面朝我們（正面展翅影片）
// 2. 停在畫面中間，原地展翅一整段（兩下拍翅）
// 3. 往上飛走，越飛越遠（慢慢變小），從畫面上方離開
// 4. 之後偶爾從側面慢慢飛過（側面拍翅影片），不停下來、不轉身
// 換到別的神明：慢慢淡掉，不再出現；再回來會再正面出現一次。
// 優雅不躁動：移動都很慢、起停都平順，拍翅也慢（見 test/phoenix.test.mjs）。

export const FRONT_LOOP = 300; // 正面影片一段（兩下拍翅）播幾格：5 秒
export const SIDE_LOOP = 168; // 側面影片一下拍翅播幾格：2.8 秒

const RISE_MAX_SPEED = 2.6; // 升上來時最快每格幾像素
const LEAVE_MAX_SPEED = 2.8; // 飛走時最快（快離開畫面時）
const LEAVE_SHRINK = 0.2; // 飛走時越飛越遠：最後縮小兩成
const HOVER = FRONT_LOOP + 2; // 停在中間展翅多久：完整一段
const SIDE_SPEED = 1.8; // 側面飛過的速度（每格像素）：約 17 秒飛過畫面
const SIDE_GAP_MIN = 900; // 兩次飛過之間隔多久（15～30 秒）
const SIDE_GAP_MAX = 1800;
const FADE = 1 / 60; // 換到別的神明：1 秒淡掉

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const smooth = (t) => t * t * (3 - 2 * t); // 慢慢開始、慢慢停下

// 拍翅位置（0～1，會一直累加）→ 第幾格；超過 1 就從頭接回去
export function frameIndex(flap, n) {
  return Math.floor((((flap % 1) + 1) % 1) * n) % n;
}

export function createPhoenix() {
  return { mode: "idle", phase: null, next: "front", timer: 0, visit: false, alpha: 0, x: 0, y: 0, size: 0, base: 0, flap: 0, facing: 1, t: 0 };
}

export function stepPhoenix(p, e) {
  if (!e.active) return away(p, e);
  if (!p.visit) {
    // 剛進到這一頁：停一下再正面出現
    p.visit = true;
    p.next = "front";
    p.timer = 90 + e.random() * 45;
  }
  p.alpha = Math.min(1, p.alpha + FADE);
  if (p.mode === "idle") return wait(p, e);
  if (p.mode === "front") return front(p, e);
  side(p, e);
}

// 不在這一頁：正在飛的那隻繼續飛、慢慢淡掉；淡完就收起來
function away(p, e) {
  p.visit = false;
  if (p.mode === "idle") return;
  p.alpha = Math.max(0, p.alpha - FADE);
  if (p.mode === "front") front(p, e);
  else side(p, e);
  if (p.alpha <= 0) p.mode = "idle";
}

function wait(p, e) {
  p.timer -= 1;
  if (p.timer > 0) return;
  if (p.next === "front") startFront(p, e);
  else startSide(p, e);
}

function startFront(p, e) {
  p.mode = "front";
  p.phase = "rise";
  p.next = "side"; // 這次造訪的正面已經開始了
  p.base = Math.min(clamp(e.w * 0.28, 240, 440), e.w * 0.7, e.h * 0.55);
  p.size = p.base;
  // 停在大門門洞前面：頭冠在匾額下緣以下（e.door＝畫面上的門洞中線、匾額下緣；沒給就用畫面比例）
  const d = e.door;
  p.x = d ? d.x : e.w / 2; // 飛的途中不再改（調整視窗大小時才不會跳）
  p.hoverY = d ? d.top + p.base * 0.52 : e.h * 0.6; // 翅膀舉最高時翅尖在中心上方約 0.49 個鳥寬
  p.y0 = Math.max(e.h, p.hoverY) + p.base * 0.6; // 從畫面下方外面開始
  p.y = p.y0;
  // 走這段距離要多久：用 smooth 移動，最快的地方是平均的 1.5 倍
  p.len = Math.ceil((1.5 * (p.y0 - p.hoverY)) / RISE_MAX_SPEED);
  p.facing = 1;
  p.flap = 0;
  p.t = 0;
  p.alpha = 1;
}

function front(p, e) {
  p.flap += 1 / FRONT_LOOP;
  p.t += 1;
  if (p.phase === "rise") {
    p.y = p.y0 + (p.hoverY - p.y0) * smooth(Math.min(1, p.t / p.len));
    if (p.t >= p.len) nextPhase(p, "hover", HOVER);
  } else if (p.phase === "hover") {
    p.y = p.hoverY;
    if (p.t >= p.len) startLeave(p);
  } else leave(p, e);
}

function nextPhase(p, phase, len) {
  p.phase = phase;
  p.t = 0;
  p.len = len;
}

function startLeave(p) {
  const dist = p.hoverY + p.base * 0.6; // 飛到完全離開畫面上方
  // 慢慢加速往上（t²）：最快的地方（最後）是平均的 2 倍
  nextPhase(p, "leave", Math.ceil((2 * dist) / LEAVE_MAX_SPEED));
  p.dist = dist;
}

function leave(p, e) {
  const t = Math.min(1, p.t / p.len);
  p.y = p.hoverY - p.dist * t * t;
  p.size = p.base * (1 - LEAVE_SHRINK * t);
  if (t >= 1) endFlight(p, e);
}

function startSide(p, e) {
  p.mode = "side";
  p.phase = "glide";
  p.size = clamp(e.w * 0.22, 200, 340);
  p.facing = e.random() < 0.5 ? 1 : -1;
  p.x = p.facing > 0 ? -p.size * 0.6 : e.w + p.size * 0.6;
  p.y0 = e.h * (0.15 + e.random() * 0.17);
  p.amp = e.h * 0.025; // 高度慢慢起伏
  p.wave = e.random() * Math.PI * 2;
  p.y = p.y0 + Math.sin(p.wave) * p.amp;
  p.flap = e.random();
  p.alpha = 1;
}

function side(p, e) {
  // 上一格已經整隻飛出畫面了才收起來（最後一格畫的時候已經看不到）
  const out = p.facing > 0 ? p.x - p.size / 2 > e.w : p.x + p.size / 2 < 0;
  if (out) return endFlight(p, e);
  p.flap += 1 / SIDE_LOOP;
  p.x += p.facing * SIDE_SPEED;
  p.wave += (Math.PI * 2) / 600;
  p.y = p.y0 + Math.sin(p.wave) * p.amp;
}

// 飛完一趟：之後隔一陣子從側面飛過。
// 如果飛的途中離開又回來（還在淡出就回來），這次造訪的正面還沒演：飛完馬上接正面
function endFlight(p, e) {
  p.mode = "idle";
  p.phase = null;
  p.timer = p.next === "front" ? 90 : SIDE_GAP_MIN + e.random() * (SIDE_GAP_MAX - SIDE_GAP_MIN);
}
