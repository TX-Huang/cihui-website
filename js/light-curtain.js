// 金色發光的光簾（新首頁的開場 js/opening-view.js、首頁道場門的珠簾 js/main.js 共用）：
// 每一串看得到幾個字（收在兩旁）、越往下越淡、每個字怎麼畫。規格在 test/light-curtain.test.mjs。

// 每一串看得到幾個字：中間短、兩邊長（像收在兩旁的簾子）。short：中間那串是整串的幾成
export function strandRows(col, cols, rows, short = 0.32) {
  const u = Math.abs(col / (cols - 1) - 0.5) * 2; // 0 中間 → 1 兩邊
  return Math.round(rows * (short + (1 - short) * u * u));
}

// 每一串越往下越淡（像光慢慢散掉），但不會完全不見
export function glyphAlpha(row, visible) {
  return Math.max(0.25, 1 - 0.75 * (row / visible) ** 2);
}

// 在 g（canvas 2D）的 size×size 格子中間畫一個發光的字：淡淡的深金邊（亮的背景上也看得清楚）、金色光暈，
// hot（經文裡重要的句子）更亮、光暈更大。g 的字型由呼叫的人先設好。
// 光暈（shadowBlur）不會跟著畫布放大縮小，所以照現在畫的倍數自己放大：螢幕清晰度不同，光暈看起來一樣大
export function paintLightGlyph(g, ch, hot, size) {
  const c = size / 2;
  const t = typeof g.getTransform === "function" ? g.getTransform() : null;
  const k = t && typeof t.a === "number" ? Math.hypot(t.a, t.b || 0) : 1;
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.lineJoin = "round";
  g.lineWidth = 2.4;
  g.strokeStyle = "rgba(110, 70, 20, 0.55)";
  g.strokeText(ch, c, c + 0.5);
  g.shadowColor = hot ? "rgba(255, 236, 190, 1)" : "rgba(255, 190, 90, 1)";
  g.shadowBlur = (hot ? 12 : 8) * k;
  g.fillStyle = hot ? "#fff6dc" : "#ffd98a";
  g.fillText(ch, c, c + 0.5);
  g.shadowBlur = 0;
  g.fillText(ch, c, c + 0.5);
}
