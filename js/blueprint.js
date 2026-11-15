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

// 點燈：LIGHT_MS 毫秒慢慢亮起來（起步、到頂都慢）
export const LIGHT_MS = 2600;
export function lampGlow(ms) {
  return smooth(ms / LIGHT_MS);
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

// 兩盞光合一：p（捲到這一段的進度 0～1）→ 兩團光還分開多少（1 = 分開、0 = 合在一起）
export function mergeAt(p) {
  return 1 - smooth(p);
}
