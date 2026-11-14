// 大門圖片的位置資料（設計座標：大門圖寬 1600）。
// 換新的大門圖時，跑 tools/prep_gate_grand.py 會印出門洞位置，再更新這裡。
// 有三版：現在的月白版，和比較用的油畫版（網址加 ?look=oil 月白油畫、?look=oil-red 朱紅油畫）。

const MOON = {
  src: "assets/gate-grand.webp",
  w: 1600,
  h: 1070,
  // 中間門洞（透明的地方）：珠簾掛在這裡
  door: { x0: 611, x1: 982, y0: 440, y1: 912 },
  // 匾額中心與大小：「慈惠道場」疊在上面
  plaque: { cx: 800, cy: 373, w: 319, h: 83 },
  // 中間那一間（含兩根柱子）：手機看不下整座門時，放大看這一段
  centerBay: { x0: 441, x1: 1161 },
  // 青鳥可以停的地方（腳踩的點）：兩側屋脊、匾額上緣。face：1 = 臉朝右、-1 = 朝左（都朝中間）
  // 屋脊高度用 tools/prep_bird.py 量的
  perches: [
    { x: 220, y: 403, face: 1 },
    { x: 360, y: 404, face: 1 },
    { x: 735, y: 331, face: 1 },
    { x: 865, y: 331, face: -1 },
    { x: 1240, y: 404, face: -1 },
    { x: 1380, y: 403, face: -1 }
  ]
};

// 比較用的油畫版：AI Video 拿現在的大門改畫，透明度也直接用現在大門的（tools/prep_oil.py），
// 所以門洞、匾額、青鳥停的點都一樣，只換圖
const OIL = { ...structuredClone(MOON), src: "assets/oil/gate.webp" };
const OIL_RED = { ...structuredClone(MOON), src: "assets/oil/gate-red.webp" };

const GATES = { moon: MOON, oil: OIL, "oil-red": OIL_RED };

// 背景和開場的圖
const ASSETS = {
  moon: { bg: "assets/bg-yaochi.webp", earth: "assets/intro-earth.webp", clouds: "assets/intro-clouds.webp", clouds2: "assets/intro-clouds-2.webp" },
  oil: { bg: "assets/oil/bg.webp", earth: "assets/oil/intro-earth.webp", clouds: "assets/oil/intro-clouds.webp", clouds2: "assets/oil/intro-clouds-2.webp" }
};
ASSETS["oil-red"] = { ...ASSETS.oil, bg: "assets/oil/bg-red.webp" };

// 現在是哪一版：index.html 開頭的小程式看網址設定 <html data-look>（測試的時候沒有網頁，就是月白版）
const asked = typeof document !== "undefined" ? document.documentElement.dataset.look : "";
export const LOOK = GATES[asked] ? asked : "moon";
export const gateFor = (look) => GATES[look] || MOON;
export const lookAssets = (look) => ASSETS[look] || ASSETS.moon;
export const GATE = gateFor(LOOK);
