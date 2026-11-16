// 新首頁（神話感版本）的開場：影片 → 鳳凰飛走 → 經文光簾從天上降下來。
// 這裡只有計算（方便測試）；畫面在 js/opening-view.js。規格在 test/new-home.test.mjs 最上面。

// 影片（使用者 2026-11-16 定案：鳳凰從左前方飛到右後方）：13 秒，鳳凰在 10.71 秒完全飛走（第 258 格）
export const VIDEO_S = 13;
export const PHOENIX_GONE_S = 10.71;
export const CURTAIN_AT_S = 11; // 鳳凰飛走以後，光簾才開始降下
export const VIDEOS = { big: "assets/opening/opening-1080.mp4", small: "assets/opening/opening-720.mp4" };
export const STILL = "assets/opening/opening-last.webp"; // 影片的最後一格
export const POSTER = "assets/opening/opening-first.webp"; // 影片的第一格（影片還沒載入時墊在後面）
export const SEEN_KEY = "cihui-opening-seen";

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const smooth = (t) => {
  const x = clamp(t, 0, 1);
  return x * x * (3 - 2 * x);
};

// 用哪一支影片：影片鋪滿畫面時實際要多寬（裝置像素）。720p 放大不超過 1.25 倍就用 720p，不夠才用 1080p。
// 手機（短邊 ≤ 600）或開了省流量：一律 720p（省流量比清楚重要）
export function pickVideo({ w, h, dpr = 1, saveData = false }) {
  if (saveData || Math.min(w, h) <= 600) return VIDEOS.small;
  const need = Math.max(w, (h * 16) / 9) * dpr;
  return need > 1280 * 1.25 ? VIDEOS.big : VIDEOS.small;
}

// play：播影片；end：這次造訪看過了，直接最後一格、光簾降下；still：要求減少動畫，最後一格、光簾直接掛好。
// new-home.html 的 <head> 有一段一樣的小程式（在畫面出來之前就決定，才不會先閃一下最後一格）；測試確認兩邊一樣
export function openingMode({ seen, reduceMotion }) {
  if (reduceMotion) return "still";
  return seen ? "end" : "play";
}

// 開場的狀態：playing（影片播放中）→ lowering（影片還在播，光簾在降）→ done（影片淡掉，只剩最後一格和光簾）。
// 事件：time（影片播到第幾秒）、ended（播完）、skip（略過、Esc）、refused（不能自動播放）、error（載入失敗）、
//      restored（按上一頁回來，整頁被瀏覽器留著）
// acts：curtain 光簾開始降下、remember 記得這次看過了、hideVideo 影片淡掉並停止下載、
//      cutVideo 直接切掉（按上一頁回來時瀏覽器把影片倒回第一格，淡過去會先閃一下第一格）
export function openingStep(state, ev, t = 0) {
  if (state === "done") return { state, acts: [] };
  const started = state === "lowering";
  if (ev === "restored") return { state: "done", acts: started ? ["cutVideo"] : ["cutVideo", "curtain", "remember"] };
  if (ev === "time") {
    if (started || t < CURTAIN_AT_S) return { state, acts: [] };
    return { state: "lowering", acts: ["curtain", "remember"] };
  }
  if (ev === "error") return { state: "done", acts: started ? ["hideVideo"] : ["hideVideo", "curtain"] }; // 下次再試
  return { state: "done", acts: started ? ["hideVideo"] : ["hideVideo", "curtain", "remember"] };
}

// 光簾的位置和大小（畫面座標）：從畫面最上面垂下來，左右留一點邊。
// height 是沒有拉長時的長度；垂好以後會被重力拉長一成多，最低的字大約在畫面七成的地方（壇和山還看得到）
export function curtainLayout(vw, vh) {
  const x0 = Math.round(vw * 0.04);
  const width = vw - 2 * x0;
  const height = Math.round(vh * 0.62);
  return {
    x0,
    y0: -6,
    width,
    height,
    cols: Math.max(8, Math.round(width / 32)),
    rows: Math.max(12, Math.round(height / 17))
  };
}

// 每一串看得到幾個字：中間短、兩邊長（像收在兩旁的簾子）
export function strandRows(col, cols, rows) {
  const u = Math.abs(col / (cols - 1) - 0.5) * 2; // 0 中間 → 1 兩邊
  return Math.round(rows * (0.32 + 0.68 * u * u));
}

// 每一串越往下越淡（像光慢慢散掉），但不會完全不見
export function glyphAlpha(row, visible) {
  return Math.max(0.25, 1 - 0.75 * (row / visible) ** 2);
}

// 光簾出現時先淡入
export const FADE_MS = 900;
export function curtainFade(ms) {
  return smooth(ms / FADE_MS);
}

// 物理每一步是 1/60 秒（原本的珠簾就是照 60Hz 調的）。螢幕更新比較快（120、144Hz）就幾格才算一步，
// 比較慢就一格算好幾步：快慢都照真實時間。分頁藏起來很久再回來，最多補 4 步（不會一下子衝很遠）
export const STEP_MS = 1000 / 60;
const MAX_STEPS = 4;
export function stepsFor(dt, carry) {
  const total = carry + Math.max(0, dt); // 剛開始的那一格，時間可能比起點早一點點
  const steps = Math.min(MAX_STEPS, Math.floor(total / STEP_MS));
  return { steps, carry: Math.min(total - steps * STEP_MS, STEP_MS - 1e-9) };
}

// 微風：沒有人碰光簾 3 秒以後，在 2 秒內慢慢停下來（之後光簾靜下來就不再重畫，省電）；滑鼠、手指一動又開始
export const IDLE_MS = 3000;
const CALM_MS = 2000;
export function breezeAt(idleMs) {
  return 1 - smooth((idleMs - IDLE_MS) / CALM_MS);
}

// ── 降下來：跟原本的珠簾一樣（js/main.js）。先收在最上面，用比較大的重力慢慢落下，
//    落到七成半就短暫加大阻力（煞車），不會衝過頭，再回到平常的輕輕晃。
//    落下的重力照光簾長度調（原本是照 1280×800 調的）：大螢幕、小手機都差不多 1～2 秒垂到九成 ──
export const SIM = { gravity: 0.2, damping: 0.985, iterations: 5 };
const REF_HEIGHT = 496; // 1280×800 時光簾的長度
const DROP_GRAVITY = 0.28;
// 煞車比原本（0.7、0.88、30 步）晚一點、重一點、久一點，大螢幕煞得更久：大大小小的螢幕都不會衝過頭再彈回來（node 模擬調的）
const DROP_TRIGGER = 0.75;
const BRAKE_DAMPING = 0.86;
const BRAKE_STEPS = 50;

// 把光簾收在最上面（只動沒釘住的點）
export function rollUp(cloth) {
  for (const p of cloth.particles) {
    if (p.pinned) continue;
    p.y = p.oy = p.row * 1.2;
  }
}

// drop：null（平常）、{ phase: "fall" }（落下中）、{ phase: "brake", left }（煞車中，還剩幾步）
export function dropParams(drop, height = REF_HEIGHT) {
  if (!drop) return SIM;
  if (drop.phase === "brake") return { ...SIM, damping: BRAKE_DAMPING };
  return { ...SIM, gravity: DROP_GRAVITY * clamp(height / REF_HEIGHT, 0.5, 2.2) };
}

// 算完一步以後：最下面一排平均落到哪（bottomY）→ 下一步的狀態
export function dropNext(drop, bottomY, height) {
  if (!drop) return null;
  if (drop.phase === "fall") return bottomY >= height * DROP_TRIGGER ? { phase: "brake", left: Math.round(BRAKE_STEPS * Math.max(1, height / REF_HEIGHT)) } : drop;
  return drop.left <= 1 ? null : { phase: "brake", left: drop.left - 1 };
}
