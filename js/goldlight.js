// 金母頁的金色光線。純計算，畫面在 js/goldlight-view.js。
// 丹鳳從左邊天空慢慢飛到右邊；warm（0～1）是天空有多暖、多亮：
// 鳳凰飛過時才亮（飛進來慢慢亮、中間最亮、飛走慢慢退）。平常是月白色。
// 時間單位是「格」（固定 1/60 秒一格；畫面那邊照真實時間決定一次走幾格，高刷新率螢幕也一樣快）。

export const FLIGHT = 600; // 飛過一次 10 秒
export const MAX_EMBERS = 120;
const RATE = 1 / 60; // 光每格最多變這麼多（從 0 到滿要 1 秒以上）
const FIRST = 120; // 進來 2 秒後第一次飛過
const GAP = [20, 35]; // 之後每隔 20～35 秒飛一次

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const smooth = (t) => {
  const x = clamp(t, 0, 1);
  return x * x * (3 - 2 * x);
};

// 鳳凰在 p（0～1）時在畫面上的位置：x, y 是中心，w, h 是大小
// 在大門前面、屋頂上方的天空飛（2026-11-15 使用者覺得不自然：原本太大、躲在屋頂後面只看得到一半）
export function flightPose(p, W, H) {
  const w = W * 0.36;
  const h = w / 1.305; // 鳳凰圖的長寬比
  const x0 = -w / 2 - 20;
  const x1 = W + w / 2 + 20;
  return {
    x: x0 + (x1 - x0) * p,
    y: H * (0.19 - 0.05 * Math.sin(Math.PI * p)), // 微微往上弧
    w,
    h
  };
}

export function createLight() {
  return { warm: 0, show: 0, flying: false, p: 0, wait: FIRST };
}

// 鳳凰飛過時光的強弱：飛進來慢慢亮、中間最亮、快飛出去時退掉
const bell = (p) => smooth(p / 0.3) * (1 - smooth((p - 0.65) / 0.3));

export function stepLight(s, { active, random }) {
  if (s.flying) {
    s.p += 1 / FLIGHT;
    if (s.p >= 1) {
      s.flying = false;
      s.p = 0;
      s.wait = 60 * (GAP[0] + random() * (GAP[1] - GAP[0]));
    }
  } else if (active) {
    s.wait -= 1;
    if (s.wait <= 0) {
      s.flying = true;
      s.p = 0;
    }
  }
  const target = active && s.flying ? bell(s.p) : 0;
  s.warm = s.warm < target ? Math.min(target, s.warm + RATE) : Math.max(target, s.warm - RATE);
  // 鳳凰本身：離開金母頁時半秒慢慢淡掉（還在飛也一樣），回來時慢慢出現
  s.show = active ? Math.min(1, s.show + 1 / 30) : Math.max(0, s.show - 1 / 30);
}

// 火星：從 sources（鳳凰身上幾個點）冒出來，慢慢往下飄（也往後飄，因為鳳凰往右飛），慢慢淡掉
export function stepEmbers(list, sources, random, rate) {
  const out = [];
  for (const e of list) {
    e.age += 1;
    if (e.age >= e.life) continue;
    e.x += e.vx;
    e.y += e.vy;
    e.vx *= 0.995;
    e.alpha = (1 - e.age / e.life) ** 1.5;
    out.push(e);
  }
  for (const src of sources) {
    if (out.length >= MAX_EMBERS) break;
    if (random() > rate * 0.6) continue;
    out.push({
      x: src.x + (random() - 0.5) * 40,
      y: src.y + (random() - 0.5) * 30,
      vx: -0.3 - random() * 0.4,
      vy: 0.25 + random() * 0.35,
      age: 0,
      life: 120 + random() * 90,
      size: 1.2 + random() * 2,
      alpha: 1
    });
  }
  return out;
}

// 拍翅動畫：t 是畫面格數（60 格／秒）；frames 是圖集的每一格 [x, y, w, h, 播幾個影片格]（影片 24 格／秒）。
// 回傳現在這格 a、下一格 b、混到 b 的比例 w（0～1），播完接回第一格
export function flapFrame(t, frames) {
  const len = (f) => (f[4] / 24) * 60;
  const total = frames.reduce((sum, f) => sum + len(f), 0);
  let x = ((t % total) + total) % total;
  for (let i = 0; i < frames.length; i++) {
    const l = len(frames[i]);
    if (x < l) return { a: i, b: (i + 1) % frames.length, w: x / l };
    x -= l;
  }
  return { a: 0, b: 1 % frames.length, w: 0 };
}
