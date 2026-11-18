// 大門圖片的位置資料（設計座標：大門圖寬 1600）。
// 有三版：現在的月白版（道場門），和比較用的油畫版（網址加 ?look=oil 月白油畫、?look=oil-red 朱紅油畫，還是原本的廟門）。

// 月白版：道場門（使用者 2026-11-16 核准，AI Video 做的第三版去背；規格在 test/gate-dojo.test.mjs）。
// 從入口往裡看：兩面斜斜的白牆、一層層木條框、走廊兩旁的光明燈牆，最裡面是神壇。位置數字是照圖量的
const MOON = {
  src: "assets/gate-dojo.webp",
  w: 1600,
  h: 1067,
  // 珠簾掛在有匾的那一層木框裡（使用者 2026-11-17「珠簾拉出來匾額那層」），比框的門口窄一點：
  // 最外面兩串整個在框裡（不會被框切到），也不蓋到內側白牆上的「無極」。門口不是透明的，珠簾畫在大門圖前面。
  // y0：最上面一排字整個露在匾下面；y1：沒拉長時的長度，被重力拉長一成多以後剛好垂到地板邊緣（opening.y1）
  door: { x0: 536, x1: 1068, y0: 421, y1: 880 },
  // 珠簾是金色發光的光簾（js/light-curtain.js），收在兩旁：中間那串大約只有整串的兩成，掛好以後停在神壇的紅匾上面，
  // 神像、紅匾、供桌都露出來（神壇在 x 760–850、紅匾上緣 y 587，見 test/light-curtain.test.mjs）
  curtain: "light",
  tieBack: 0.18,
  // 有匾那一層木框的門口：珠簾只畫在這裡面（晃出去、往上拉的部分像是被木框擋住），最下面在地板邊緣（接水的地方）前淡掉
  opening: { x0: 486, x1: 1118, y0: 414, y1: 944 },
  // 門比較寬：手機上桃樹站在門口右前方、可以蓋到珠簾右邊一點（桃樹畫在大門前面，點樹不會拉到珠簾）
  treeOverDoor: true,
  // 門前慢慢飄的薄霧（js/gate-mist.js）
  mist: true,
  // 入口橫樑下那塊空白的木匾：「慈惠道場」疊在上面
  plaque: { cx: 801, cy: 372, w: 300, h: 82 },
  // 木框加一點白牆：手機看不下整座門時，放大看這一段
  centerBay: { x0: 441, x1: 1161 },
  // 青鳥可以停的地方（腳踩的點）：最外面木條橫樑的頂邊（y 240；兩端被霧吃掉，清楚的那段是 x 566–1032）、匾的上緣。
  // face：1 = 臉朝右、-1 = 朝左（都朝中間）
  perches: [
    { x: 600, y: 240, face: 1 },
    { x: 690, y: 240, face: 1 },
    { x: 735, y: 331, face: 1 },
    { x: 865, y: 331, face: -1 },
    { x: 910, y: 240, face: -1 },
    { x: 1000, y: 240, face: -1 }
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
