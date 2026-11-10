// 蓮花（中壇元帥）：哪吒以蓮花化身重生。點空白的地方，那裡會浮出荷葉、長出花苞、慢慢開成蓮花。
// 純計算（方便測試），畫面在 js/lotus-view.js。時間單位是「格」（60 格 ≈ 1 秒）。

export const MAX_LOTUS = 3; // 同時最多幾朵

const LIFE = 960; // 開始後多久開始淡掉（16 秒）
const END = 120; // 淡掉要 2 秒
const LEAVE = 1 / 60; // 換到別的神明：1 秒淡掉
const AMBIENT_GAP = [20, 40]; // 沒人點時，每隔幾秒自己開一朵

const clamp01 = (v) => Math.max(0, Math.min(1, v));
const smooth = (t) => {
  const x = clamp01(t);
  return x * x * (3 - 2 * x);
};

export function createPond() {
  return { lotus: [], visit: false, timer: 0 };
}

// 一朵蓮花現在的樣子（都是 0～1）：
// leaf＝荷葉、bud＝花苞長出來了沒、scale＝花苞多大、alpha＝整朵的透明度、dx/dy＝漂浮
// 開花：花苞長到最大後，開好的花先縮成花苞那麼窄，在花苞的位置接手（budA 淡出、flowerA 淡入，1 秒），
// 再慢慢往外張開（spread 0→1）。這樣不會有「兩張半透明的圖疊在一起」的鬼影
const HANDOFF = 200; // 花苞長好、開始開花
export function lotusPose(l) {
  const a = l.age;
  const alpha = Math.min(smooth(a / 70), 1 - smooth((a - LIFE) / END)) * l.stay;
  const bud = smooth((a - 40) / 60);
  const flowerA = smooth((a - HANDOFF) / 60);
  const spread = smooth((a - HANDOFF - 10) / 220);
  return {
    alpha,
    leaf: smooth(a / 70),
    bud,
    budA: bud * (1 - smooth((a - HANDOFF - 20) / 60)),
    flowerA,
    spread,
    open: spread,
    scale: 0.35 + 0.65 * smooth((a - 40) / 160),
    dx: 3 * Math.sin(a * 0.013 + l.seed),
    dy: 2.5 * Math.sin(a * 0.017 + l.seed * 2)
  };
}

export function stepPond(pond, e) {
  if (!e.active) {
    // 不在這一頁：全部慢慢淡掉，不會再開
    pond.visit = false;
    fadeOutAll(pond);
    age(pond);
    return;
  }
  if (!pond.visit) {
    pond.visit = true;
    pond.timer = 60 * (5 + e.random() * 5); // 進來幾秒後自己開第一朵
  }
  age(pond);
  if (e.click && e.free(e.click.x, e.click.y)) bloom(pond, e, e.click.x, e.click.y);
  pond.timer -= 1;
  if (pond.timer <= 0) {
    // 開成了：等 20～40 秒再開下一朵；沒找到位置（看得到的湖水很少）：1 秒後再找
    pond.timer = ambient(pond, e) ? 60 * (AMBIENT_GAP[0] + e.random() * (AMBIENT_GAP[1] - AMBIENT_GAP[0])) : 60;
  }
}

// 讓每一朵都慢慢淡掉（換頁、調整視窗大小時用）
export function fadeOutAll(pond) {
  for (const l of pond.lotus) l.leaving = true;
}

// 過一格：正在淡掉的停在現在的樣子（不再長大、開花，才不會淡的時候反而變亮），其他的照常長
function age(pond) {
  for (const l of pond.lotus) {
    if (l.leaving) l.stay = Math.max(0, l.stay - LEAVE);
    else l.age += 1;
  }
  pond.lotus = pond.lotus.filter((l) => l.stay > 0 && l.age < LIFE + END);
}

// 一朵蓮花佔的範圍：荷葉左右、花往上長
const area = (x, y, s) => ({ x0: x - 0.75 * s, x1: x + 0.75 * s, y0: y - 0.85 * s, y1: y + 0.4 * s });
const overlap = (a, b) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;

export function lotusSize(w) {
  return Math.max(70, Math.min(130, w * 0.085)); // 開好的花多寬（像素）
}

// 在 (x, y) 開一朵：已經 3 朵、或點在別朵上面，就不開
function bloom(pond, e, x, y) {
  if (pond.lotus.length >= MAX_LOTUS) return false;
  const size = lotusSize(e.w);
  const box = area(x, y, size);
  if (pond.lotus.some((l) => overlap(box, area(l.x, l.y, l.size)))) return false;
  pond.lotus.push({ x, y, size, age: 0, stay: 1, seed: e.random() * 10 });
  return true;
}

// 自己開一朵：在兩旁低低的地方（湖面），找一個沒有別朵的位置；開成了回傳 true。
// e.onLake：湖上任何地方都可以（被大門擋住也沒關係，像真的湖）；沒給就用 e.free
function ambient(pond, e) {
  for (let i = 0; i < 6; i++) {
    const left = e.random() < 0.5;
    const x = e.w * (left ? 0.04 + e.random() * 0.13 : 0.83 + e.random() * 0.13);
    const y = e.h * (0.6 + e.random() * 0.2);
    if ((e.onLake || e.free)(x, y) && bloom(pond, e, x, y)) return true;
  }
  return false;
}
