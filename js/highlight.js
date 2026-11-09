// 珠簾上的金色重點句：每位神尊挑經文裡最重要的一句，只把「那一句」標成金色，不多不少。
// 經文在珠簾上會重複好幾輪，挑最靠近珠簾中間、而且整句都掛得下的那一次。
// 位置用「第幾顆珠子」算：直書，右邊那欄先、由上往下（跟 cloth.js 的 charAt 一樣）。

export function highlightRange(text, key, cols, rows) {
  const chars = Array.from(text);
  const n = chars.length;
  const k = Array.from(key).length;
  const total = cols * rows;
  if (!n || !k) return { start: -1, end: -1 };
  // 這句在一輪經文裡從第幾個字開始
  const at = Array.from(text.slice(0, text.indexOf(key))).length;
  if (text.indexOf(key) < 0) return { start: -1, end: -1 };
  let best = null;
  for (let s = at; s + k <= total; s += n) {
    const d = Math.abs(s + k / 2 - total / 2);
    if (!best || d < best.d) best = { start: s, end: s + k, d };
  }
  return best ? { start: best.start, end: best.end } : { start: -1, end: -1 };
}

export function isHighlighted(col, row, cols, rows, range) {
  const idx = (cols - 1 - col) * rows + row;
  return idx >= range.start && idx < range.end;
}
