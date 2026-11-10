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
// leaf＝荷葉、bud＝花苞、open＝開好的花（花苞淡出、花淡入）、scale＝花多大、alpha＝整朵的透明度、dx/dy＝漂浮
export function lotusPose(l) {
  const a = l.age;
  const alpha = Math.min(smooth(a / 70), 1 - smooth((a - LIFE) / END)) * l.stay;
  return {
    alpha,
    leaf: smooth(a / 70),
    bud: smooth((a - 40) / 110),
    open: smooth((a - 170) / 150),
    scale: 0.35 + 0.65 * smooth((a - 40) / 280),
    dx: 3 * Math.sin(a * 0.013 + l.seed),
    dy: 2.5 * Math.sin(a * 0.017 + l.seed * 2)
  };
}

export function stepPond(pond, e) {
  if (!e.active) {
    // 不在這一頁：全部慢慢淡掉，不會再開
    pond.visit = false;
    for (const l of pond.lotus) {
      l.age += 1;
      l.stay = Math.max(0, l.stay - LEAVE);
    }
    pond.lotus = pond.lotus.filter((l) => l.stay > 0);
    return;
  }
  if (!pond.visit) {
    pond.visit = true;
    pond.timer = 60 * (5 + e.random() * 5); // 進來幾秒後自己開第一朵
  }
  for (const l of pond.lotus) l.age += 1;
  pond.lotus = pond.lotus.filter((l) => l.age < LIFE + END);
  if (e.click && e.free(e.click.x, e.click.y)) bloom(pond, e, e.click.x, e.click.y);
  pond.timer -= 1;
  if (pond.timer <= 0) {
    ambient(pond, e);
    pond.timer = 60 * (AMBIENT_GAP[0] + e.random() * (AMBIENT_GAP[1] - AMBIENT_GAP[0]));
  }
}

export function lotusSize(w) {
  return Math.max(70, Math.min(130, w * 0.085)); // 開好的花多寬（像素）
}

// 在 (x, y) 開一朵：已經 3 朵、或點在別朵上面，就不開
function bloom(pond, e, x, y) {
  if (pond.lotus.length >= MAX_LOTUS) return false;
  const size = lotusSize(e.w);
  if (pond.lotus.some((l) => Math.hypot(l.x - x, l.y - y) < size * 0.6)) return false;
  pond.lotus.push({ x, y, size, age: 0, stay: 1, seed: e.random() * 10 });
  return true;
}

// 自己開一朵：在兩旁低低的地方（像水面），找一個沒有別朵的位置
function ambient(pond, e) {
  for (let i = 0; i < 6; i++) {
    const left = e.random() < 0.5;
    const x = e.w * (left ? 0.04 + e.random() * 0.13 : 0.83 + e.random() * 0.13);
    const y = e.h * (0.6 + e.random() * 0.2);
    if (bloom(pond, e, x, y)) return;
  }
}
