// 版面計算（純計算，方便測試）

// 大門要縮放多少倍才放得進畫面
// 桌機：整座門都看得到，盡量大。
// 手機：整座門放不下，改成「中間那一段（gate.centerBay）剛好塞滿寬度」，兩側會超出畫面。
export function fitGate(vw, vh, gate) {
  if (vw <= 720) {
    const bay = gate.centerBay.x1 - gate.centerBay.x0;
    return Math.min((vw * 0.96) / bay, (vh * 0.75) / gate.h);
  }
  return Math.max(0.3, Math.min(1.3, (vh - 24) / gate.h, (vw * 0.96) / gate.w));
}

// 珠簾要幾排幾列：每顆字的間距固定（跟原本的門一樣），門大就多掛幾排
const COL_GAP = 427 / 30;
const ROW_GAP = 633 / 43;
export function curtainGrid(w, h) {
  return { cols: Math.max(4, Math.round(w / COL_GAP)), rows: Math.max(4, Math.round(h / ROW_GAP)) };
}

// 光簾（金色發光的字，有光暈）：字距跟新首頁的光簾差不多、比原本的珠簾鬆，光暈才不會糊成一片金色方塊
const LIGHT_COL_GAP = 26;
const LIGHT_ROW_GAP = 17;
export function lightGrid(w, h) {
  return { cols: Math.max(4, Math.round(w / LIGHT_COL_GAP)), rows: Math.max(4, Math.round(h / LIGHT_ROW_GAP)) };
}

// 這座門的珠簾用哪一種格子：道場門是光簾，油畫版的廟門是原本的珠簾
export function gridFor(gate) {
  const w = gate.door.x1 - gate.door.x0;
  const h = gate.door.y1 - gate.door.y0;
  return gate.curtain === "light" ? lightGrid(w, h) : curtainGrid(w, h);
}
