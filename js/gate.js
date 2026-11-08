// 拱門圖片的位置資料（設計座標：拱門圖寬 1000）。
// 換新的拱門圖時，跑 tools/prep_chatgpt.py 會印出門洞、匾額位置，再更新這裡。

export const GATE = {
  src: "assets/gate.webp",
  w: 1000,
  h: 1335,
  // 門洞（透明的地方）：珠簾掛在這裡
  door: { x0: 282, x1: 709, y0: 558, y1: 1191 },
  // 匾額中心與大小：神明名字疊在上面
  plaque: { cx: 498, cy: 445, w: 384, h: 86 }
};
