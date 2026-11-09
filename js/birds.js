// 三青鳥：金母的使者（《山海經》三青鳥為西王母取食；《漢武故事》青鳥先飛來報信）。
// 純計算（方便測試），畫面在 js/bird-view.js。時間單位是「格」（60 格 ≈ 1 秒）。
//
// 一群 1～2 隻：從畫面外飛進來（從停的方向後面來，一路不轉身） → 降落（倒播起飛影片）停在大門上（屋脊、匾額上緣）→ 休息一陣子（偶爾轉過來看你、轉身）
// → 起飛（起飛影片）飛走。滑鼠在旁邊揮太快會被嚇飛；切到其他神明時也會飛走。每隔 20～40 秒來一群。

export const FLY_IN = 260; // 飛進來最少幾格（約 4 秒）；路遠就飛久一點，速度維持差不多
const FLY_IN_MAX = 660;
const CRUISE = 2.8; // 飛進來的平均速度（每格幾像素）
export const FLY_OUT = 300; // 飛走最少幾格（約 5 秒）；路遠就飛久一點
export const FLY_OUT_MAX = 600;
const REST_MIN = 480; // 停多久（8～17 秒）
const REST_MAX = 1020;
const GAP_MIN = 1200; // 一群走了之後，下一群隔多久來（20～40 秒）
const GAP_MAX = 2400;
const SCARE_R = 140;
const SCARE_SPEED = 25;

// 飛行路線：一條彎彎的曲線（三次貝茲）。bend：往旁邊彎多少（正負決定往哪邊）
export function curve(from, to, bend) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  return {
    p0: { ...from },
    p1: { x: from.x + dx * 0.35 + nx * bend * len, y: from.y + dy * 0.35 + ny * bend * len },
    // 最後一段從稍微上方滑下來降落
    p2: { x: to.x - dx * 0.2, y: to.y - Math.max(30, len * 0.12) },
    p3: { ...to }
  };
}

export function curveAt(c, t) {
  const u = 1 - t;
  const b0 = u * u * u;
  const b1 = 3 * u * u * t;
  const b2 = 3 * u * t * t;
  const b3 = t * t * t;
  const x = b0 * c.p0.x + b1 * c.p1.x + b2 * c.p2.x + b3 * c.p3.x;
  const y = b0 * c.p0.y + b1 * c.p1.y + b2 * c.p2.y + b3 * c.p3.y;
  // 切線方向
  const d0 = 3 * u * u;
  const d1 = 6 * u * t;
  const d2 = 3 * t * t;
  const tx = d0 * (c.p1.x - c.p0.x) + d1 * (c.p2.x - c.p1.x) + d2 * (c.p3.x - c.p2.x);
  const ty = d0 * (c.p1.y - c.p0.y) + d1 * (c.p2.y - c.p1.y) + d2 * (c.p3.y - c.p2.y);
  return { x, y, angle: Math.atan2(ty, tx) };
}

// 飛行時身體要傾斜多少（弧度，朝右飛時負的是抬頭）：跟著實際飛的方向，最多約 57 度；快降落時再抬頭煞車
export const MAX_TILT = 1.0;
export function bodyTilt(b) {
  const t = b.facing > 0 ? b.angle : Math.PI - b.angle; // 往左飛：鏡像
  let tilt = Math.max(-MAX_TILT, Math.min(MAX_TILT, Math.atan2(Math.sin(t), Math.cos(t))));
  if (b.brake) tilt -= 0.3;
  return tilt;
}
// 起飛影片最後一格，鳥身體大約抬頭幾度（接一般飛行時從這個角度開始轉）
export const TAKEOFF_END_TILT = -0.6;

export function createFlock({ firstIn } = {}) {
  return { birds: [], timer: firstIn ?? 300 + Math.random() * 600 };
}

// 飛進來：一開始速度是平均的 2 倍，慢慢減速到 0（以前用 3 次方，一進畫面衝太快）
const easeOut = (t) => 1 - (1 - t) ** 2;
// 飛走：一開始的速度是平均的 a 倍（接起飛影片的速度），之後平順地變到巡航
const easeIn = (t, a = 0.4) => a * t + (1 - a) * t * t;

function spawn(flock, e) {
  const free = [];
  for (let i = 0; i < e.perchCount; i++) if (!e.visible || e.visible(i)) free.push(i); // 手機上兩側屋頂在畫面外，不停那裡
  const n = Math.min(free.length, 1 + Math.floor(e.random() * 2)); // 一次 1～2 隻
  if (!n) return;
  flock.birds = [];
  for (let k = 0; k < n; k++) {
    const perch = free.splice(Math.floor(e.random() * free.length), 1)[0];
    // 從停的方向的「後面」飛來（朝右停 → 從左邊來），一路朝同一邊，落地不用轉身
    const fromLeft = e.perch(perch).face > 0;
    const start = {
      x: fromLeft ? -120 - k * 60 : e.w + 120 + k * 60,
      y: e.h * (0.08 + e.random() * 0.3)
    };
    flock.birds.push({
      state: k === 0 ? "in" : "wait",
      delay: k * (40 + e.random() * 50), // 一隻接一隻來
      perch,
      start,
      bend: (e.random() - 0.5) * 0.5,
      t: 0,
      x: start.x,
      y: start.y,
      angle: 0,
      flap: e.random(),
      facing: fromLeft ? 1 : -1,
      pose: "fly",
      rest: 0,
      look: 0,
      brake: false, // 快降落：翅膀舉高煞車
      landed: 0, // 降落後過了幾格（落地時輕輕一沉）
      hop: 99, // 轉身的小跳躍進行到第幾格
      flipPending: false,
      clipT: 0, // 起飛／降落影片播到第幾格
      anim: null, // 停著時正在播的動作影片："head"（轉頭）或 "flutter"（原地拍翅）
      animT: 0,
      age: 0
    });
  }
}

export const HOP = 20; // 轉身跳一下要幾格（1/3 秒）
// 停著的動作影片（轉頭、原地拍翅、起飛／降落）播放速度：比原本影片慢，比較從容
export const CLIP_SPEED = 0.7;

// 降落前要先飛到的點＝起飛影片最後一格鳥的位置（畫面那邊依影片算好給我；測試或沒給時用上方 40px）
function hoverPoint(b, e) {
  if (e.hover) return e.hover(b.perch);
  const p = e.perch(b.perch);
  return { x: p.x, y: p.y - 40 };
}
const clipLength = (e) => e.clipLength?.() ?? 80; // 起飛／降落影片多長（格）

function takeOff(b, e) {
  b.state = "out";
  b.t = 0;
  b.pose = "fly";
  b.brake = false;
  const toLeft = b.facing < 0; // 朝哪邊起飛就往哪邊飛走，不用在空中轉身
  b.outCurve = curve(
    { x: b.x, y: b.y },
    { x: toLeft ? -160 : e.w + 160, y: -120 - e.random() * 80 },
    (toLeft ? 1 : -1) * 0.25
  );
  // 起飛：往上的曲線，所以 p2 不要「從上方滑下來」，改成直接往目標
  b.outCurve.p2 = { x: (b.x + b.outCurve.p3.x) / 2, y: Math.min(b.y, b.outCurve.p3.y) - 40 };
  // 飛走要幾格：照路長算（平均 2.8 像素／格）
  const len = Math.hypot(b.outCurve.p3.x - b.x, b.outCurve.p3.y - b.y) * 1.15;
  b.outLen = Math.max(FLY_OUT, Math.min(FLY_OUT_MAX, len / 3.3));
  // 接著起飛影片：一開始的方向、速度跟影片最後一樣（影片裡鳥幾乎是往上飛），再慢慢加速
  b.outA = 0.4;
  const v = e.leaveVelocity?.(b.perch);
  const sp = v ? Math.hypot(v.x, v.y) : 0;
  if (sp > 0) {
    const d = len * 0.3;
    b.outCurve.p1 = { x: b.x + (v.x / sp) * d, y: b.y + (v.y / sp) * d };
    // 曲線一開始每格走 3·d·a / outLen；讓它等於影片的速度
    b.outA = Math.max(0.1, Math.min(1.8, (sp * b.outLen) / (3 * d)));
  }
}

function stepBird(b, e) {
  if (b.state === "gone") return;
  b.age = (b.age || 0) + 1;
  if (b.state === "wait") {
    if (!e.active) {
      b.state = "gone";
      return;
    }
    b.delay -= 1;
    if (b.delay <= 0) b.state = "in";
    return;
  }
  if (b.state === "in") {
    if (!e.active) return takeOff(b, e);
    b.inLen ??= inFrames(b, e);
    b.t = Math.min(1, b.t + 1 / b.inLen);
    const target = hoverPoint(b, e);
    const p = curveAt(curve(b.start, target, b.bend), easeOut(b.t));
    b.x = p.x;
    b.y = p.y;
    b.angle = p.angle;
    // 方向固定（spawn 時已照停的方向決定），不跟著曲線一下翻過去
    // 最後一段：翅膀舉高、拍得急，像在煞車
    b.brake = b.t > 0.82;
    b.flap += b.brake ? 0.013 : 0.008; // 一直拍（拍一下約 2 秒），煞車時拍快一點
    if (b.t >= 1) {
      // 飛到降落點了：接著播「倒著的起飛影片」，鳥自己從上方降到桿子上
      const at = e.perch(b.perch);
      b.state = "landing";
      b.clipT = 0;
      b.brake = false;
      b.x = at.x;
      b.y = at.y;
    }
    return;
  }
  if (b.state === "landing" || b.state === "takeoff") {
    const at = e.perch(b.perch);
    b.x = at.x;
    b.y = at.y;
    b.clipT += 1;
    if (b.clipT < clipLength(e)) return;
    if (b.state === "landing") {
      b.state = "perched";
      b.pose = "perch";
      b.anim = null;
      b.landed = 0;
      b.rest = REST_MIN + e.random() * (REST_MAX - REST_MIN);
      b.look = 120 + e.random() * 180;
    } else {
      // 起飛影片播完：鳥在桿子上方，從那裡接一般的飛行飛走
      const h = hoverPoint(b, e);
      b.x = h.x;
      b.y = h.y;
      takeOff(b, e);
    }
    return;
  }
  if (b.state === "perched") {
    const at = e.perch(b.perch); // 視窗大小變了，跟著大門走
    b.x = at.x;
    b.y = at.y;
    const m = e.mouse;
    const scared = m.speed > SCARE_SPEED && Math.hypot(m.x - b.x, m.y - b.y) < SCARE_R;
    b.rest -= 1;
    b.landed += 1;
    if (!e.active || scared || b.rest <= 0) {
      b.state = "takeoff"; // 先播起飛影片，播完才飛走
      b.clipT = 0;
      b.anim = null;
      return;
    }
    // 轉身是跳一下：跳到一半（最高點）才轉過去
    if (b.hop < HOP) {
      b.hop += 1;
      if (b.flipPending && b.hop >= HOP / 2) {
        b.facing = -b.facing;
        b.flipPending = false;
      }
    }
    // 正在播動作影片：播完才做下一件事
    if (b.anim) {
      b.animT += 1;
      if (b.animT >= (e.animLength?.(b.anim) ?? 200)) {
        b.anim = null;
        b.animT = 0;
      }
      return;
    }
    // 休息時偶爾：轉頭看看、原地拍拍翅膀、或跳一下轉身
    b.look -= 1;
    if (b.look <= 0 && b.hop >= HOP) {
      const r = e.random();
      if (r < 0.4) b.anim = "head";
      else if (r < 0.7) b.anim = "flutter";
      else {
        b.hop = 0;
        b.flipPending = true;
      }
      b.animT = 0;
      b.look = 150 + e.random() * 240;
    }
    return;
  }
  if (b.state === "out") {
    b.t = Math.min(1, b.t + 1 / b.outLen);
    const p = curveAt(b.outCurve, easeIn(b.t, b.outA));
    b.x = p.x;
    b.y = p.y;
    b.angle = p.angle;
    b.flap += b.t < 0.3 ? 0.015 : 0.009; // 起飛時拍得最急
    if (b.t >= 1) b.state = "gone";
  }
}

export function stepFlock(flock, e) {
  for (const b of flock.birds) stepBird(b, e);
  const alive = flock.birds.some((b) => b.state !== "gone");
  if (!e.active || alive) return;
  flock.timer -= 1;
  if (flock.timer <= 0) {
    spawn(flock, e);
    flock.timer = GAP_MIN + e.random() * (GAP_MAX - GAP_MIN);
    for (const b of flock.birds) stepBird(b, e);
  }
}

// 飛進來要幾格：照路的長短算（曲線比直線長一點）
function inFrames(b, e) {
  const to = hoverPoint(b, e);
  const len = Math.hypot(to.x - b.start.x, to.y - b.start.y) * 1.15;
  return Math.max(FLY_IN, Math.min(FLY_IN_MAX, len / CRUISE));
}
