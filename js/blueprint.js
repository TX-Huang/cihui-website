// 服務頁「從容修行的年度藍圖」的資料和計算（純計算，方便測試；畫面在 js/blueprint-view.js）。
// 內容來自道場的簡報（assets/raw/LINE_NOTE_261115_1～10.jpg）。價錢只寫在這裡，網頁上的價錢由測試確認跟這裡一樣。

// 光明燈（元旦啟燈）
export const LAMPS = [
  { id: "small", name: "小燈", price: 1200 },
  { id: "large", name: "大燈", price: 3600 }
];

// 新春祭改：基本的祭改一定有，再依自己的情況加選（順序照簡報）
export const JIEGAI_BASE = { id: "base", name: "祭改", price: 700, desc: "依個人流年吉凶為您化解阻礙、撥轉氣場" };
export const JIEGAI_ADDONS = [
  { id: "qihuanfu", name: "祈還福", price: 800, who: "逢九、正偏沖等特殊情形" },
  { id: "buyun", name: "補運", price: 300, who: "希望一般運勢順遂" },
  { id: "bujiayun", name: "補家運", price: 300, who: "一家之主代表祈求" },
  { id: "bukaoyun", name: "補考運", price: 300, who: "學子、國考、職登、應徵工作" },
  { id: "bucaiku", name: "補財庫", price: 1100, who: "從商或投資，欲求正財、偏財" }
];

// 一年的四站（旁邊那條「一年」細線）；tint 是走到這一站時背景的顏色
export const STOPS = [
  { id: "yuandan", when: "元旦", what: "啟動光明燈", tint: "#f2e9da" },
  { id: "xinchun", when: "新春", what: "祭改與祈福", tint: "#f2e4df" },
  { id: "bayue", when: "農曆八月", what: "蟠桃盛會", tint: "#ebe7da" },
  { id: "shengdan", when: "不定期", what: "聖誕與週年慶回娘家", tint: "#f1e6e8" }
];

const clamp01 = (t) => Math.min(1, Math.max(0, t));
const smooth = (t) => {
  const x = clamp01(t);
  return x * x * (3 - 2 * x);
};

// 「$1,200」
export function money(n) {
  return `$${n.toLocaleString("en-US")}`;
}

// 祭改小問答：勾了哪些情況（id）→ 要做哪些項目、合計多少。基本的祭改一定在最前面
export function jiegaiPlan(selected) {
  const picked = new Set(selected);
  const items = [JIEGAI_BASE, ...JIEGAI_ADDONS.filter((a) => picked.has(a.id))];
  return { items, total: items.reduce((sum, i) => sum + i.price, 0) };
}

// 背景走到哪兩站之間：y 是畫面中間在頁面上的位置，marks 是每一站的中間。
// 回傳第 a 站混到第 b 站、混了 w（0～1，用 smoothstep：起步和到站都慢）
export function seasonMix(y, marks) {
  const n = marks.length;
  if (y <= marks[0]) return { a: 0, b: 0, w: 0 };
  if (y >= marks[n - 1]) return { a: n - 1, b: n - 1, w: 0 };
  let i = 0;
  while (y >= marks[i + 1]) i++;
  return { a: i, b: i + 1, w: smooth((y - marks[i]) / (marks[i + 1] - marks[i])) };
}

// 一年細線上亮哪一站：比較靠近哪一站就亮哪一站；還沒走到第一站（離它還超過畫面三成五）就都不亮（-1）
export function railStop(mid, marks, vh) {
  if (mid < marks[0] - vh * 0.35) return -1;
  const m = seasonMix(mid, marks);
  return m.w < 0.5 ? m.a : m.b;
}

// 三層護持的同心圓：離中心多遠（R 是外圈半徑）→ 哪一層
export function tierAt(dx, dy, R) {
  const d = Math.hypot(dx, dy) / R;
  if (d < 0.36) return "core";
  if (d < 0.68) return "free";
  if (d <= 1) return "joy";
  return null;
}

// 運勢交替的兩條線（0～1，n+1 個點）：舊年往下、新年往上，在中間（元旦）交會
export function handover(n) {
  const sig = (x) => 1 / (1 + Math.exp(-8 * (x - 0.5)));
  const lo = sig(0);
  const hi = sig(1);
  const fresh = [];
  const old = [];
  for (let i = 0; i <= n; i++) {
    const f = 0.12 + (0.76 * (sig(i / n) - lo)) / (hi - lo);
    fresh.push(f);
    old.push(1 - f);
  }
  return { old, fresh };
}

// 運勢線圖（viewBox 320×160）上的兩條線和元旦那一點的高度。
// services.html 直接寫著這些數字（沒有 JavaScript 也看得到）；測試確認兩邊一樣，改了這裡就要把新數字貼回網頁
export function handoverPaths() {
  const { old, fresh } = handover(40);
  const y = (v) => (140 - v * 112).toFixed(1);
  const path = (vals) => vals.map((v, i) => `${i ? "L" : "M"}${(8 + (304 * i) / 40).toFixed(1)} ${y(v)}`).join(" ");
  return { old: path(old), fresh: path(fresh), dotY: y(fresh[20]) };
}

// 捲動的進度 p（0～1）→ 1 慢慢變 0（蓮花開用）
export function mergeAt(p) {
  return 1 - smooth(p);
}

// 核心交集的動畫（循環的前半圈；倒著播就是後半圈）：播了 ms 毫秒 →
//   apart：兩團光還分開多少（1 = 分開、0 = 合在一起）
//   label：「光明燈」「新春祭改」兩個字看得到多少
//   word：「完整的能量防護」看得到多少
// 順序：先淡掉兩個名字（兩團光幾乎還沒動、一定還沒碰到），再慢慢合起來，合起來以後才出現「完整的能量防護」。
// 兩組字不會同時出現
export const MERGE_MS = 3600;
export function mergeFrame(ms) {
  const t = ms / MERGE_MS;
  return {
    apart: 1 - smooth((t - 0.25) / 0.47),
    label: 1 - smooth((t - 0.08) / 0.24),
    word: smooth((t - 0.72) / 0.28)
  };
}

// 核心交集一直循環：合起來（MERGE_MS）→ 停一下 → 倒著慢慢分開（MERGE_MS）→ 停一下 → 再合起來。
// 倒著播也一樣：先淡掉「完整的能量防護」，兩團光分開以後名字才出現，所以兩組字不會同時出現
const HOLD_MERGED = 2400;
const HOLD_APART = 1200;
export const LOOP_MS = 2 * MERGE_MS + HOLD_MERGED + HOLD_APART;
export function mergeLoop(ms) {
  let t = ((ms % LOOP_MS) + LOOP_MS) % LOOP_MS;
  if (t < MERGE_MS) return mergeFrame(t);
  t -= MERGE_MS;
  if (t < HOLD_MERGED) return mergeFrame(MERGE_MS);
  t -= HOLD_MERGED;
  if (t < MERGE_MS) return mergeFrame(MERGE_MS - t);
  return mergeFrame(0);
}

// 核心交集什麼時候開始循環、什麼時候回到開頭（每次捲回來都從頭開始）。
// state：ready（在開頭等著）、waiting（大半進到畫面，等 0.3 秒確定有人在看）、played（在循環中）
// ratio：這一段看得到幾成（0～1）；null = 那 0.3 秒到了
// act：wait 開始等、cancel 不等了、play 開始播、reset 回到開頭（只在完全看不到時）
// 「大半」= 八成；瀏覽器在八成那條線回報時可能給 0.7999，所以比 0.79
const NEAR_FULL = 0.79;
export function mergeCue(state, ratio) {
  if (ratio === null) return state === "waiting" ? { state: "played", act: "play" } : { state, act: null };
  if (ratio <= 0) return { state: "ready", act: state === "ready" ? null : "reset" };
  if (state === "ready" && ratio >= NEAR_FULL) return { state: "waiting", act: "wait" };
  if (state === "waiting" && ratio < NEAR_FULL) return { state: "ready", act: "cancel" };
  return { state, act: null };
}
