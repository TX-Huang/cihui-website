// 三青鳥：金母的使者（《山海經》三青鳥為西王母取食；《漢武故事》青鳥先飛來報信）。
// 純計算（方便測試），畫面在 js/bird-view.js。時間單位是「格」（60 格 ≈ 1 秒）。
//
// 一群 1～3 隻：從畫面外飛進來 → 停在大門上（屋脊、匾額上緣）→ 休息一陣子（偶爾轉過來看你、轉身）
// → 飛走。滑鼠在旁邊揮太快會被嚇飛；切到其他神明時也會飛走。每隔 20～40 秒來一群。

export const FLY_IN = 240; // 飛進來要幾格（約 4 秒）
export const FLY_OUT = 200; // 飛走要幾格
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

export function createFlock({ firstIn } = {}) {
  return { birds: [], timer: firstIn ?? 300 + Math.random() * 600 };
}

const easeOut = (t) => 1 - (1 - t) ** 3;
const easeIn = (t) => t * t;

function spawn(flock, e) {
  const free = [];
  for (let i = 0; i < e.perchCount; i++) if (!e.visible || e.visible(i)) free.push(i); // 手機上兩側屋頂在畫面外，不停那裡
  const n = Math.min(free.length, 1 + Math.floor(e.random() * 3));
  if (!n) return;
  const fromLeft = e.random() < 0.5;
  flock.birds = [];
  for (let k = 0; k < n; k++) {
    const perch = free.splice(Math.floor(e.random() * free.length), 1)[0];
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
      age: 0
    });
  }
}

const HOP = 14; // 轉身跳一下要幾格

function takeOff(b, e) {
  b.state = "out";
  b.t = 0;
  b.pose = "fly";
  b.brake = false;
  const toLeft = b.x < e.w / 2;
  b.outCurve = curve(
    { x: b.x, y: b.y },
    { x: toLeft ? -160 : e.w + 160, y: -120 - e.random() * 80 },
    (toLeft ? 1 : -1) * 0.25
  );
  // 起飛：往上的曲線，所以 p2 不要「從上方滑下來」，改成直接往目標
  b.outCurve.p2 = { x: (b.x + b.outCurve.p3.x) / 2, y: Math.min(b.y, b.outCurve.p3.y) - 40 };
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
    b.t = Math.min(1, b.t + 1 / FLY_IN);
    const target = e.perch(b.perch);
    const p = curveAt(curve(b.start, target, b.bend), easeOut(b.t));
    b.x = p.x;
    b.y = p.y;
    b.angle = p.angle;
    b.facing = Math.cos(p.angle) >= 0 ? 1 : -1;
    // 最後一段：翅膀舉高、拍得急，像在煞車
    b.brake = b.t > 0.82;
    b.flap += b.brake ? 0.02 : 0.012; // 一直拍（影片裡拍一下約 1.5 秒），煞車時拍快一點
    if (b.t >= 1) {
      b.brake = false;
      b.landed = 0;
      b.state = "perched";
      b.x = target.x;
      b.y = target.y;
      b.facing = target.face;
      b.pose = "perch";
      b.rest = REST_MIN + e.random() * (REST_MAX - REST_MIN);
      b.look = 120 + e.random() * 180;
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
    if (!e.active || scared || b.rest <= 0) return takeOff(b, e);
    // 轉身是跳一下：跳到一半（最高點）才轉過去
    if (b.hop < HOP) {
      b.hop += 1;
      if (b.flipPending && b.hop >= HOP / 2) {
        b.facing = -b.facing;
        b.flipPending = false;
      }
    }
    // 休息時偶爾轉過來看你（正面），或跳一下轉身
    b.look -= 1;
    if (b.look <= 0) {
      const r = e.random();
      if (b.pose === "front") b.pose = "perch";
      else if (r < 0.5) b.pose = "front";
      else {
        b.hop = 0;
        b.flipPending = true;
      }
      b.look = 120 + e.random() * 240;
    }
    return;
  }
  if (b.state === "out") {
    b.t = Math.min(1, b.t + 1 / FLY_OUT);
    const p = curveAt(b.outCurve, easeIn(b.t));
    b.x = p.x;
    b.y = p.y;
    b.angle = p.angle;
    b.facing = Math.cos(p.angle) >= 0 ? 1 : -1;
    b.flap += b.t < 0.3 ? 0.022 : 0.014; // 起飛時拍得最急
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
