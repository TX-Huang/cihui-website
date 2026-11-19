// 服務頁「故事版」（services-story.html）的計算：每一幕的顏色、現在是哪一幕、一句一句什麼時候出來。
// 純計算，方便測試；畫面在 js/story-view.js。規格在 test/services-story.test.mjs。
// 2026-11-19 使用者：「正常人不會一直一直滾，這樣動畫會卡在中間」→ 動畫不跟著捲軸，捲到哪一幕，那一幕自己照閱讀速度播完。

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

export const smooth = (t) => {
  const x = Math.min(1, Math.max(0, t));
  return x * x * (3 - 2 * x);
};

// 現在是哪一幕：畫面中間（center，頁面上的位置）落在哪一幕。
// 還在標題卡上 = -1；落在兩幕中間的空隙 = 上面那一幕；過了最後一幕 = 最後一幕
export function activeScene(center, spans) {
  let now = -1;
  spans.forEach((s, i) => {
    if (center >= s.top) now = i;
  });
  return now;
}

// 一句停多久才出下一句（毫秒）：照閱讀速度，字多的久一點；至少 1.5 秒、最多 3.5 秒
export function readMs(text) {
  const n = [...text.replace(/\s+/g, "")].length;
  return Math.min(3500, Math.max(1500, 700 + 90 * n));
}

// 這一幕開始播以後，每一句什麼時候出來（毫秒）：第一句跟著整幕一起淡入（不多等），後面一句接一句
const FIRST_MS = 0;
export function beatTimes(texts) {
  const at = [];
  let t = FIRST_MS;
  for (const text of texts) {
    at.push(t);
    t += readMs(text);
  }
  return at;
}

// 播了 ms 毫秒時，出來了幾句
export function stepAt(ms, at) {
  return at.filter((t) => t <= ms).length;
}
