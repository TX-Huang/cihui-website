// 首頁道場門前慢慢飄的薄霧：位置、快慢、哪裡要空出來（純計算，方便測試；畫面在 js/gate-mist-view.js）。
// 規格在 test/gate-mist.test.mjs。座標是大門圖的設計座標（寬 1600、高 1067）。

// 三層霧（由下往上）。dir：1 往右飄、-1 往左飄（相鄰兩層方向相反，看起來有遠近）。
// clear：中間這一段（x0–x1）沒有霧，往外 feather 的距離內慢慢變濃（不蓋到字、青鳥停的橫樑和匾）
export const MIST_BANDS = [
  // 貼著地板和水面，整個寬度都有
  { y0: 840, y1: 1067, opacity: 0.5, seconds: 80, dir: 1, clear: null },
  // 兩邊白牆的下半部（字在 y 383–550，這層在字的下面）
  { y0: 600, y1: 820, opacity: 0.45, seconds: 100, dir: -1, clear: { x0: 560, x1: 1040 }, feather: 120 },
  // 淡淡飄過兩個上角和橫樑兩端（中間給青鳥停的那段 x 566–1032 和匾都空出來）
  { y0: 230, y1: 330, opacity: 0.35, seconds: 115, dir: 1, clear: { x0: 470, x1: 1130 }, feather: 80 }
];

// 再疊兩團比較濃的霧，會慢慢變濃、再慢慢散開（使用者 2026-11-18「再疊一層時隱時現的濃一點的霧」）。
// peak：最濃的時候；breathe：濃一次再散開要幾秒；delay：兩團錯開半拍（一邊濃的時候另一邊淡）
export const MIST_PUFFS = [
  // 兩邊：從大門兩旁的山、白牆下半，一直飄進木頭門框和走廊下面的燈牆（比較深的地方才看得出霧）；
  // 中間神壇那段（x 700–900）空出來
  { y0: 600, y1: 980, peak: 0.8, seconds: 75, dir: -1, breathe: 12, delay: 0, clear: { x0: 700, x1: 900 }, feather: 90 },
  // 中間：地板、倒影和水面
  { y0: 860, y1: 1067, peak: 0.7, seconds: 95, dir: 1, breathe: 12, delay: -6, clear: null }
];

// 大門圖的寬（設計座標）；霧在圖的左右兩端 EDGE 以內慢慢淡到沒有（圖的兩端本來就是透明的，霧不能在那裡變成一條直直的邊）
export const MIST_W = 1600;
const EDGE = 160;
const smooth = (t) => {
  const x = Math.min(1, Math.max(0, t));
  return x * x * (3 - 2 * x);
};

// 這一層在大門的 x 這個位置看得到幾成（0～1）
export function visibleAt(band, x) {
  const ends = smooth(Math.min(x, MIST_W - x) / EDGE);
  if (!band.clear) return ends;
  const { x0, x1 } = band.clear;
  if (x >= x0 && x <= x1) return 0;
  const d = x < x0 ? x0 - x : x - x1;
  return Math.min(1, d / band.feather) * ends;
}

// 兩倍寬的霧圖裡，一團霧要畫在哪幾個位置：往左一個寬度、原位、往右一個、往右兩個（各畫一次）。
// 這樣左半和右半一模一樣，飄一圈接回開頭時看不出來
export function stripCopies(x, w) {
  return [x - w, x, x + w, x + 2 * w];
}

// 一層霧的形狀：n 團扁扁的柔和橫條（w×h 的長條裡），用 seed 決定，每次都一樣
export function mistBlobs(seed, w, h, n) {
  let s = (seed * 2654435761) >>> 0 || 1;
  const rand = () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const blobs = [];
  for (let i = 0; i < n; i++) {
    const ry = h * (0.14 + rand() * 0.16); // 上下不會碰到長條的邊（邊緣自然淡掉，看不到切線）
    blobs.push({
      x: rand() * w,
      y: h * (0.32 + rand() * 0.36),
      ry,
      rx: ry * (3 + rand() * 4),
      alpha: 0.4 + rand() * 0.6
    });
  }
  return blobs;
}
