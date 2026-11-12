// 相簿畫卷的排版（純計算，方便測試；畫面在 js/gallery-view.js）
// hand（電腦）：橫向手卷，跟古畫一樣從右往左看。第一本相簿在最右邊。
//   每本相簿開頭是一欄直排題字，後面接照片；照片同樣高（size），保留原本的長寬比。
// hang（手機）：直立掛軸，從上往下看，照片跟紙一樣寬（size）。
// 回傳：length（卷子多長）、margin（兩端留白）、items（每個題字、照片的位置 x, y, w, h）

const MARGIN = 96; // 卷子兩端留白
const GAP = 24; // 同一本相簿裡，東西之間的距離
const BREAK = 96; // 相簿跟相簿之間（像畫卷上的段落）
const TITLE_W = 72; // 直排題字那一欄多寬（手卷）
const TITLE_H = 72; // 題字那一列多高（掛軸）
const EMPTY = 480; // 還沒有照片時，卷子中間留給「待填」的空間

export function scrollLayout(albums, { mode, size }) {
  const items = [];
  let cursor = MARGIN; // 手卷：從右端往左量；掛軸：從上往下量
  albums.forEach((album, a) => {
    if (a > 0) cursor += BREAK - GAP;
    const add = (kind, w, h, extra) => {
      items.push({ kind, album: a, ...extra, w, h, pos: cursor });
      cursor += (mode === "hand" ? w : h) + GAP;
    };
    if (mode === "hand") add("title", TITLE_W, size);
    else add("title", size, TITLE_H);
    album.photos.forEach((p, index) => {
      const r = p.w / p.h;
      if (mode === "hand") add("photo", size * r, size, { index });
      else add("photo", size, size / r, { index });
    });
  });
  const length = items.length ? cursor - GAP + MARGIN : MARGIN * 2 + EMPTY;
  for (const it of items) {
    if (mode === "hand") {
      it.x = length - it.pos - it.w; // 從右往左
      it.y = 0;
    } else {
      it.x = 0;
      it.y = it.pos;
    }
    delete it.pos;
  }
  return { length, margin: MARGIN, items };
}

// 看大圖時換下一張／上一張（到頭繞回來）
export function stepIndex(i, n, dir) {
  if (n <= 1) return 0;
  return (((i + dir) % n) + n) % n;
}

// 滾輪要捲多少像素（手卷用：滾輪往下＝往左捲）。
// deltaMode：0＝像素、1＝行（Firefox）、2＝整頁。按著 Ctrl（放大縮小網頁）或橫向滑動：回傳 null，不接手
export function wheelPixels(e, viewWidth) {
  if (e.ctrlKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return null;
  if (e.deltaMode === 1) return e.deltaY * 16;
  if (e.deltaMode === 2) return e.deltaY * viewWidth * 0.9;
  return e.deltaY;
}
