// 珠簾上的金色句子：每位神尊挑經文裡幾句重要的話，每句只標一次、整句標（不切半），
// 而且散在珠簾不同的地方——不排整齊、不放正中間，看起來比較自然。
// 經文在珠簾上會重複好幾輪，每句從它出現的幾次裡挑一次。用固定的亂數（依神尊名字），
// 所以同一位神尊每次打開都一樣，不會每次重新整理就跳來跳去。
// 位置用「第幾顆珠子」算：直書，右邊那欄先、由上往下（跟 cloth.js 的 charAt 一樣）。

function seeded(text) {
  let s = 2166136261;
  for (const ch of text) s = Math.imul(s ^ ch.codePointAt(0), 16777619) >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

function occurrences(text, key, total, rows) {
  const n = Array.from(text).length;
  const k = Array.from(key).length;
  const i = text.indexOf(key);
  if (i < 0 || !n) return [];
  const at = Array.from(text.slice(0, i)).length;
  const out = [];
  for (let s = at; s + k <= total; s += n) {
    // 整句要在同一直行裡（不然一個字在這行最下面、其他跳到下一行最上面，很怪）
    if (Math.floor(s / rows) === Math.floor((s + k - 1) / rows)) out.push({ start: s, end: s + k });
  }
  return out;
}

function score(ranges, rows, total) {
  const sorted = [...ranges].sort((a, b) => a.start - b.start);
  for (let i = 1; i < sorted.length; i++) if (sorted[i].start - sorted[i - 1].end < rows) return -1; // 黏在一起
  const mids = sorted.map((r) => (r.start + r.end) / 2 / total);
  if (mids.some((m) => Math.abs(m - 0.5) <= 0.03)) return -1; // 正中間
  const spread = mids[mids.length - 1] - mids[0];
  return spread > 0.35 ? spread : -1;
}

export function highlightRanges(text, keys, cols, rows, seed = "") {
  const total = cols * rows;
  const options = keys.map((k) => occurrences(text, k, total, rows)).filter((o) => o.length);
  if (!options.length) return [];
  const rand = seeded(seed + text);
  let best = null;
  let bestScore = -Infinity;
  for (let attempt = 0; attempt < 300; attempt++) {
    const pick = options.map((o) => o[Math.floor(rand() * o.length)]);
    const s = score(pick, rows, total);
    if (s > 0) return pick; // 第一個合格的就用（亂數挑的，所以不會太規律）
    if (s > bestScore) {
      best = pick;
      bestScore = s;
    }
  }
  return best;
}

export function isHighlighted(col, row, cols, rows, ranges) {
  const idx = (cols - 1 - col) * rows + row;
  for (const r of ranges) if (idx >= r.start && idx < r.end) return true;
  return false;
}
