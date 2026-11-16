// 大門圖片的位置資料（設計座標：大門圖寬 1600）。
// 有三版：現在的月白版（道場門），和比較用的油畫版（網址加 ?look=oil 月白油畫、?look=oil-red 朱紅油畫，還是原本的廟門）。

// 月白版：道場門（使用者 2026-11-16 核准，AI Video 做的第三版去背；規格在 test/gate-dojo.test.mjs）。
// 從入口往裡看：兩面斜斜的白牆、一層層木條框、走廊兩旁的光明燈牆，最裡面是神壇。位置數字是照圖量的
const MOON = {
  src: "assets/gate-dojo.webp",
  w: 1600,
  h: 1067,
  // 珠簾掛在走廊口：左右剛好在走廊兩旁的燈牆之間（跟原本廟門的門洞一樣寬，桃樹的位置也就不用變）。
  // 門口不是透明的（後面畫著走廊和神壇），珠簾畫在大門圖前面。
  // y0：最上面一排字整個露在最裡面那層木框下面；y1：沒拉長時的長度，被重力拉長一成多以後剛好垂到地板邊緣（opening.y1）
  door: { x0: 611, x1: 982, y0: 456, y1: 884 },
  // 最裡面那層木框的門口：珠簾只畫在這裡面（晃出去、往上拉的部分像是被木框擋住），最下面在地板邊緣（台階從這裡開始）前淡掉
  opening: { x0: 540, x1: 1059, y0: 450, y1: 944 },
  // 入口橫樑下那塊空白的木匾：「慈惠道場」疊在上面
  plaque: { cx: 801, cy: 372, w: 300, h: 82 },
  // 木框加一點白牆：手機看不下整座門時，放大看這一段
  centerBay: { x0: 441, x1: 1161 },
  // 青鳥可以停的地方（腳踩的點）：最外面木條橫樑的頂邊（y 238，橫樑 x 347–1251）、匾的上緣。
  // face：1 = 臉朝右、-1 = 朝左（都朝中間）
  perches: [
    { x: 420, y: 238, face: 1 },
    { x: 560, y: 238, face: 1 },
    { x: 735, y: 331, face: 1 },
    { x: 865, y: 331, face: -1 },
    { x: 1040, y: 238, face: -1 },
    { x: 1180, y: 238, face: -1 }
  ]
};

// 原本的廟門（油畫版是 AI Video 拿它改畫的，透明度也直接用它的：tools/prep_oil.py）。
// 換新的廟門圖時，跑 tools/prep_gate_grand.py 會印出門洞位置
const TEMPLE = {
  w: 1600,
  h: 1070,
  // 中間門洞（透明的地方）：珠簾掛在這裡
  door: { x0: 611, x1: 982, y0: 440, y1: 912 },
  // 匾額中心與大小：「慈惠道場」疊在上面
  plaque: { cx: 800, cy: 373, w: 319, h: 83 },
  // 中間那一間（含兩根柱子）：手機看不下整座門時，放大看這一段
  centerBay: { x0: 441, x1: 1161 },
  // 青鳥可以停的地方：兩側屋脊、匾額上緣（屋脊高度用 tools/prep_bird.py 量的）
  perches: [
    { x: 220, y: 403, face: 1 },
    { x: 360, y: 404, face: 1 },
    { x: 735, y: 331, face: 1 },
    { x: 865, y: 331, face: -1 },
    { x: 1240, y: 404, face: -1 },
    { x: 1380, y: 403, face: -1 }
  ]
};

// 比較用的油畫版：還是原本的廟門，門洞、匾額、青鳥停的點都照廟門，只換圖
const OIL = { ...structuredClone(TEMPLE), src: "assets/oil/gate.webp" };
const OIL_RED = { ...structuredClone(TEMPLE), src: "assets/oil/gate-red.webp" };

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
