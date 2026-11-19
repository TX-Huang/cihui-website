// 首頁的神話開場影片（index.html?opening=video）：稻田 → 雲霧散開、湖邊的道場門浮出來 → 鳳凰飛走 → 停在首頁的門，
// 影片淡掉，露出底下真的首頁，光簾才降下來。這裡只有計算（方便測試）；畫面在 js/gate-opening-view.js。
// 規格在 test/gate-opening.test.mjs 最上面。

export const GATE_VIDEOS = { big: "assets/opening/gate-opening-1080.mp4", small: "assets/opening/gate-opening-720.mp4" };
export const GATE_POSTER = "assets/opening/gate-opening-first.webp"; // 影片的第一格（還沒載好時墊著）
export const GATE_SEEN_KEY = "cihui-gate-opening-seen";

// 影片 14.08 秒；鳳凰 11.96 秒完全飛走，之後鏡頭停穩，最後一格就是首頁的門
export const VIDEO_S = 14.08;
export const PHOENIX_GONE_S = 11.96;
export const REVEAL_AT_S = 12.95; // 這時已經是首頁的樣子：影片開始淡掉（影片結束前淡完），光簾開始降下
export const FADE_MS = 1100;
export const SKIP_FADE_MS = 600;
export const STALL_MS = 6000; // 影片卡住（不出錯也不往前播）這麼久：當成載入失敗
export const PAGE_WAIT_MS = 2600; // 直接切到首頁時，最多等首頁準備好（字型、標題）這麼久

// "video"：播影片；"page"：不播（看過了、要求減少動畫、直接連到其他神明），直接是首頁；
// null：網址沒有 ?opening=video，照原本的開場（js/intro.js）。
// index.html 的 <head> 有一段一樣的小程式（在畫面出來之前就決定）；測試確認兩邊一樣
export function gateOpeningMode({ param, seen, reduceMotion, hash }) {
  if (param !== "video") return null;
  if (seen || reduceMotion) return "page";
  return hash === "" || hash === "#" || hash === "#jinmu" ? "video" : "page";
}

// 狀態：playing → done。事件：time（播到第幾秒）、ended、skip（略過、Esc、滾輪、滑一下）、
// refused（不能自動播放）、error（載入失敗）、restored（按上一頁回來，整頁被留著）。
// acts：fade 慢慢淡掉、fastFade 快一點淡掉、cut 直接拿掉（三種都會讓光簾開始降下）、remember 記得這次看過了
export function gateOpeningStep(state, ev, t = 0) {
  const done = (acts) => ({ state: "done", acts });
  if (state === "done") return done([]);
  if (ev === "time") return t >= REVEAL_AT_S ? done(["fade", "remember"]) : { state, acts: [] };
  if (ev === "ended") return done(["fade", "remember"]);
  if (ev === "skip") return done(["fastFade", "remember"]);
  if (ev === "error") return done(["cut"]); // 下次再試
  return done(["cut", "remember"]); // refused、restored
}
