// 版面計算（純計算，方便測試）

// 大門要縮放多少倍才放得進畫面
// 桌機：整座門都看得到，盡量大。
// 手機：整座三開間放不下，改成「中間那一間剛好塞滿寬度」，兩側的門會超出畫面。
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
