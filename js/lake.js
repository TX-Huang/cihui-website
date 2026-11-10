// 瑤池湖面：背景圖（assets/bg-yaochi.webp）下半部本來就是湖，讓它動起來。
// 這裡只管「湖在畫面上哪裡」和「漣漪」（純計算，方便測試）；畫面（WebGL）在 js/lake-view.js。
// 時間單位是「格」（60 格 ≈ 1 秒）。

export const HORIZON = 0.58; // 水平線在背景圖的高度比例（量過：上下鏡像最像的那一列）
export const MAX_RIPPLES = 10; // 同時最多幾圈漣漪
export const RIPPLE_LIFE = 300; // 一圈漣漪 5 秒

const SPEED = 0.8; // 漣漪擴散速度（每格像素）：慢慢散開
const RISE = 18; // 從 0 慢慢出現（0.3 秒）
const STRENGTH = { click: 1, move: 0.4, drop: 0.38 }; // 點擊最明顯；滑鼠滑過、花瓣落水比較輕
const MOVE_GAP = 18; // 滑鼠滑過：至少隔幾格
const MOVE_DIST = 50; // 而且至少隔多遠，才再冒一圈

const smooth = (t) => {
  const x = Math.max(0, Math.min(1, t));
  return x * x * (3 - 2 * x);
};

// 跟 CSS「background-size: cover; background-position: 50% posY」一樣的鋪法：
// 圖放大到剛好蓋滿 (vw, vh)，多出來的照 50% / posY 裁掉。回傳縮放和左上角位置
export function coverMap(vw, vh, iw, ih, posY = 0.6) {
  const scale = Math.max(vw / iw, vh / ih);
  return { scale, ox: (vw - iw * scale) * 0.5, oy: (vh - ih * scale) * posY };
}

// 水平線（湖面開始）在畫面上的高度
export function waterTop(map, ih) {
  return map.oy + HORIZON * ih * map.scale;
}

export function createLake() {
  return { ripples: [], t: 0, lastMove: { t: -1e9, x: -1e9, y: -1e9 } };
}

// 在 (x, y) 碰一下水面。kind：click＝點擊、move＝滑鼠滑過、drop＝花瓣落水。top＝水平線的高度
export function touch(lake, kind, x, y, top) {
  if (y <= top + 4) return false; // 天空、山上不會有漣漪
  if (lake.ripples.length >= MAX_RIPPLES) return false; // 滿了就不加（不把舊的一下子拿掉）
  // 滑鼠滑過＋花瓣落水加起來最多 7 圈：留位子給點擊
  if (kind !== "click" && lake.ripples.filter((r) => r.kind !== "click").length >= MAX_RIPPLES - 3) return false;
  if (kind === "move") {
    // 滑鼠滑過的最多佔 6 圈：留位子給點擊，點了一定有反應
    if (lake.ripples.filter((r) => r.kind === "move").length >= MAX_RIPPLES - 4) return false;
    const m = lake.lastMove;
    if (lake.t - m.t < MOVE_GAP || Math.hypot(x - m.x, y - m.y) < MOVE_DIST) return false;
    lake.lastMove = { t: lake.t, x, y };
  }
  lake.ripples.push({ x, y, age: 0, kind, strength: STRENGTH[kind] });
  return true;
}

export function stepLake(lake) {
  lake.t += 1;
  for (const r of lake.ripples) r.age += 1;
  lake.ripples = lake.ripples.filter((r) => r.age < RIPPLE_LIFE);
}

// 漣漪現在多大（像素）
export function rippleRadius(r) {
  return 4 + r.age * SPEED;
}

// 漣漪現在多明顯（0～1）：慢慢出現，越散越淡，最後完全看不到才拿掉
export function rippleAmp(r) {
  return r.strength * smooth(r.age / RISE) * (1 - r.age / RIPPLE_LIFE) ** 1.5;
}

// 調整視窗大小：背景圖的鋪法變了，漣漪照「在圖上的同一點」搬過去（不會跑到天上或突然消失）
export function remapRipples(lake, from, to) {
  for (const r of lake.ripples) {
    r.x = ((r.x - from.ox) / from.scale) * to.scale + to.ox;
    r.y = ((r.y - from.oy) / from.scale) * to.scale + to.oy;
  }
}
