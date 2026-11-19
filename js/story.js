// 服務頁「故事版」（services-story.html）的計算：每一幕的顏色、捲到哪裡出哪一句、背景什麼時候混、字什麼時候淡。
// 純計算，方便測試；畫面在 js/story-view.js。規格在 test/services-story.test.mjs。

// 每一幕的顏色：bg 背景、ink 字、hook 結尾那句「小問題」的顏色。
// 前三幕黃昏 → 半夜（深色），第四幕新春起天亮（淺色）；對比都至少 4.5（測試會量）
export const SCENES = [
  { id: "burden", bg: "#3a3340", ink: "#f3ece4", hook: "#e8c98a" },
  { id: "promise", bg: "#2b3146", ink: "#f1ede6", hook: "#e8c98a" },
  { id: "yuandan", bg: "#1c2135", ink: "#f4ead8", hook: "#f0cf8c" },
  { id: "xinchun", bg: "#f4e4d8", ink: "#3f2a22", hook: "#7a4e14" },
  { id: "merge", bg: "#f6ecda", ink: "#3b2e20", hook: "#7a4e14" },
  { id: "bayue", bg: "#f4e6e2", ink: "#43302c", hook: "#7a4e14" },
  { id: "home", bg: "#f7eef0", ink: "#45323a", hook: "#7a4e14" },
  { id: "yearend", bg: "#f2eadb", ink: "#3b3020", hook: "#7a4e14" }
];

const clamp01 = (t) => Math.min(1, Math.max(0, t));
export const smooth = (t) => {
  const x = clamp01(t);
  return x * x * (3 - 2 * x);
};

// 這一幕走到哪裡：top 是這一幕上緣在畫面裡的位置、height 是這一幕多高、vh 是畫面高。
// 這一幕剛停住（上緣碰到畫面頂端）= 0，要放開了（下緣碰到畫面底部）= 1
export function sceneProgress(top, height, vh) {
  const span = height - vh;
  if (span <= 0) return 1;
  return clamp01(-top / span);
}

// 進度 p 時出來了幾句（一共 n 句）：剛停住就有第一句，每一句分到一樣長的一段，最後一句也留一段讓人讀完
export function beatsShown(p, n) {
  return Math.max(1, Math.min(n, 1 + Math.floor(clamp01(p) * n)));
}

// 背景現在是哪兩幕混在一起：y 是捲了多少，spans 是每一幕在頁面上的 { top, height }。
// 一幕停住的時候就是那一幕的顏色；只有交接（這一幕放開 → 下一幕停住，剛好一個畫面高）時才慢慢混過去
export function skyAt(y, spans, vh) {
  const last = spans.length - 1;
  for (let i = 0; i < last; i++) {
    const end = spans[i].top + spans[i].height - vh;
    if (y <= end) return { a: i, b: i, w: 0 };
    const next = spans[i + 1].top;
    if (y < next) return { a: i, b: i + 1, w: smooth((y - end) / (next - end)) };
  }
  return { a: last, b: last, w: 0 };
}

// 這一幕的字看得到多少：上緣從畫面一半升到頂端時淡入；下緣從畫面底部退到一半時淡出。
// 所以交接一半之前，舊的一幕已經淡掉；過了一半，新的一幕才出來（字不會在混到一半的背景上）
export function textAlpha(top, height, vh) {
  const half = vh * 0.5;
  const fadeIn = smooth(1 - top / half);
  const fadeOut = smooth((top + height - half) / half);
  return Math.min(fadeIn, fadeOut);
}
