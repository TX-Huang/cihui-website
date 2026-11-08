// 一片「字的布」的物理：每個字是一個點，上下左右用彈性線連起來。
// 用 Verlet 積分：位置 - 舊位置 = 速度。最上面一排釘住（掛在屋簷）。

export function createCloth({ cols, rows, width, height, compress = 0.02, stretch = 1.1 }) {
  const cw = width / (cols - 1);
  const ch = height / (rows - 1);
  const particles = [];
  for (let col = 0; col < cols; col++) {
    for (let row = 0; row < rows; row++) {
      const x = col * cw;
      const y = row * ch;
      particles.push({ x, y, ox: x, oy: y, ax: 0, ay: 0, col, row, pinned: row === 0, down: null });
    }
  }
  const at = (col, row) => particles[col * rows + row];
  const links = [];
  for (let col = 0; col < cols; col++) {
    for (let row = 0; row < rows; row++) {
      const p = at(col, row);
      if (row < rows - 1) {
        const l = makeLink(p, at(col, row + 1), ch, compress, stretch, true);
        links.push(l);
        p.down = l;
      }
      if (col < cols - 1) {
        // 左右的線很鬆：讓每一串字可以各自晃，又不會散開
        links.push(makeLink(p, at(col + 1, row), cw, 0.6, 4, false));
      }
    }
  }
  return { particles, links, cols, rows, width, height };
}

function makeLink(a, b, len, compress, stretch, vertical) {
  return { a, b, len, min: len * compress, max: len * stretch, vertical };
}

export function step(cloth, { gravity, damping, iterations }) {
  for (const p of cloth.particles) {
    if (p.pinned) {
      p.ax = p.ay = 0;
      continue;
    }
    const vx = (p.x - p.ox) * damping;
    const vy = (p.y - p.oy) * damping;
    p.ox = p.x;
    p.oy = p.y;
    p.x += vx + p.ax;
    p.y += vy + p.ay + gravity;
    p.ax = p.ay = 0;
  }
  for (let i = 0; i < iterations; i++) {
    for (const l of cloth.links) solveLink(l);
  }
}

function solveLink(l) {
  const dx = l.b.x - l.a.x;
  const dy = l.b.y - l.a.y;
  const d = Math.hypot(dx, dy);
  if (d === 0) return;
  let target;
  if (d < l.min) target = l.min;
  else if (d > l.max) target = l.max;
  else return;
  const bothFree = !l.a.pinned && !l.b.pinned;
  const k = ((target - d) / d) * (bothFree ? 0.5 : 1);
  const ox = dx * k;
  const oy = dy * k;
  if (!l.a.pinned) {
    l.a.x -= ox;
    l.a.y -= oy;
  }
  if (!l.b.pinned) {
    l.b.x += ox;
    l.b.y += oy;
  }
}

// 把 (x, y) 附近的點往外推。越近推越大力。
export function push(cloth, x, y, radiusSq, strength) {
  for (const p of cloth.particles) {
    if (p.pinned) continue;
    const dx = p.x - x;
    const dy = p.y - y;
    const ls = dx * dx + dy * dy;
    if (ls >= radiusSq || ls === 0) continue;
    const t = 1 - ls / radiusSq;
    const f = (t * t * strength) / Math.sqrt(ls);
    p.ax += dx * f;
    p.ay += dy * f;
  }
}

export function nearest(cloth, x, y, maxDistSq) {
  let best = null;
  let bestLs = maxDistSq;
  for (const p of cloth.particles) {
    const ls = (p.x - x) ** 2 + (p.y - y) ** 2;
    if (ls < bestLs) {
      best = p;
      bestLs = ls;
    }
  }
  return best ? { p: best, ls: bestLs } : null;
}

// 直書：最右邊那行先讀，由上往下；字不夠就從頭重複。
export function charAt(text, col, row, cols, rows) {
  const chars = Array.from(text);
  if (chars.length === 0) return "";
  const idx = (cols - 1 - col) * rows + row;
  return chars[idx % chars.length];
}
