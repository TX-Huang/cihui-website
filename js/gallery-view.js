// 相簿畫卷（gallery.html）：照片清單在 js/gallery.js，排版在 js/scroll.js，這裡把它們放進網頁。
// 電腦：橫向手卷，從右往左看（一打開就在最右邊，滾輪往下＝往左捲）。
// 手機：直立掛軸，從上往下看。點照片放大看。
import { ALBUMS } from "./gallery.js";
import { scrollLayout, stepIndex, wheelPixels } from "./scroll.js";

const $ = (id) => document.getElementById(id);
const scroll = $("scroll");
const paper = $("scrollPaper");
const track = $("scrollTrack");
const empty = $("scrollEmpty");
const viewer = $("viewer");
let flat = []; // 所有照片排成一串（看大圖時用），跟畫卷上的照片同一份

let mode = null;
let laidOutWidth = 0; // 上次排版時紙有多寬
let laidOutKey = ""; // 上次排版是手卷還是掛軸、手卷照片多高

// 現在應該怎麼排：手機寬度以下是掛軸；手卷的照片高度跟著視窗高度
const handSize = () => Math.round(Math.max(220, Math.min(360, window.innerHeight * 0.42)));
const layoutKey = () => (window.innerWidth <= 720 ? "hang" : `hand:${handSize()}`);

function render(albums) {
  flat = albums.flatMap((album) => album.photos.map((p) => ({ ...p, album: album.title })));
  const hang = window.innerWidth <= 720;
  mode = hang ? "hang" : "hand";
  document.documentElement.classList.toggle("hang", hang);
  // 紙的圖上下（掛軸是左右）各有一成四是裱綾，照片放在中間七成二的宣紙上。
  // 手卷：照片高度跟著視窗高度，紙高＝照片高 ÷ 0.72；掛軸：紙寬跟著畫面，照片寬＝紙寬 × 0.72
  let size;
  laidOutWidth = paper.offsetWidth;
  laidOutKey = layoutKey();
  if (hang) {
    const pw = paper.offsetWidth;
    scroll.style.setProperty("--pw", `${pw}px`);
    size = pw * 0.72;
  } else {
    size = handSize();
    scroll.style.setProperty("--ph", `${size / 0.72}px`);
  }
  const L = scrollLayout(albums, { mode, size });
  track.querySelectorAll(".scroll-item").forEach((n) => n.remove());
  // 手卷比畫面短的時候：卷子撐滿畫面，內容靠右（卷首在右邊）
  let shift = 0;
  if (hang) {
    track.style.width = "";
    track.style.height = `${L.length}px`;
  } else {
    const W = Math.max(L.length, paper.clientWidth);
    shift = W - L.length;
    track.style.width = `${W}px`;
    track.style.height = `${size}px`;
  }
  if (empty) empty.hidden = albums.length > 0;
  let n = 0;
  for (const it of L.items) {
    const album = albums[it.album];
    let node;
    if (it.kind === "title") {
      node = document.createElement("div");
      node.className = "scroll-item scroll-title";
      const t = document.createElement("strong");
      t.textContent = album.title;
      node.append(t);
      if (album.date) {
        const d = document.createElement("span");
        d.textContent = album.date;
        node.append(d);
      }
    } else {
      const p = album.photos[it.index];
      const i = n++;
      node = document.createElement("button");
      node.type = "button";
      node.className = "scroll-item shot";
      node.setAttribute("aria-label", `${album.title}：第 ${it.index + 1} 張，放大看`);
      const img = document.createElement("img");
      img.src = p.thumb;
      img.alt = p.alt || "";
      img.loading = "lazy";
      img.width = Math.round(it.w);
      img.height = Math.round(it.h);
      node.append(img);
      node.addEventListener("click", () => open(i));
    }
    Object.assign(node.style, { left: `${it.x + shift}px`, top: `${it.y}px`, width: `${it.w}px`, height: `${it.h}px` });
    track.append(node);
  }
  // 手卷：一打開就在最右邊（卷首）
  if (!hang) paper.scrollLeft = paper.scrollWidth;
}

// 滾輪往下＝往卷子後面看＝往左捲（只有手卷、而且還捲得動的時候才接手，不擋住整頁往下捲）
paper.addEventListener(
  "wheel",
  (e) => {
    const dy = mode === "hand" ? wheelPixels(e, paper.clientWidth) : null;
    if (dy === null) return; // 放大縮小網頁、橫向滑動：照瀏覽器原本的做法
    const max = paper.scrollWidth - paper.clientWidth;
    const next = paper.scrollLeft - dy;
    if ((dy > 0 && paper.scrollLeft <= 0) || (dy < 0 && paper.scrollLeft >= max)) return; // 到底了：讓整頁捲
    e.preventDefault();
    paper.scrollLeft = Math.max(0, Math.min(max, next));
  },
  { passive: false }
);

// ── 看大圖 ──
let current = 0;
function show(i) {
  current = i;
  const p = flat[i];
  if (!p) return;
  $("viewerImg").src = p.src;
  $("viewerImg").alt = p.alt || "";
  $("viewerCap").textContent = `${p.album}　${i + 1} / ${flat.length}`;
  // 先載入左右兩張，換的時候比較快
  for (const k of [stepIndex(i, flat.length, 1), stepIndex(i, flat.length, -1)]) new Image().src = flat[k].src;
}
function open(i) {
  show(i);
  if (!viewer.open) viewer.showModal();
}
// 跟畫卷一樣往左是「下一張」
$("viewerNext").addEventListener("click", () => show(stepIndex(current, flat.length, 1)));
$("viewerPrev").addEventListener("click", () => show(stepIndex(current, flat.length, -1)));
$("viewerClose").addEventListener("click", () => viewer.close());
viewer.addEventListener("click", (e) => {
  if (e.target === viewer) viewer.close(); // 點外面關掉
});
viewer.addEventListener("keydown", (e) => {
  if (e.key === "ArrowLeft") show(stepIndex(current, flat.length, 1));
  if (e.key === "ArrowRight") show(stepIndex(current, flat.length, -1));
});
// 手機：在大圖上左右滑換張（手指往右滑＝看左邊那張＝下一張）
let touchX = null;
viewer.addEventListener("touchstart", (e) => (touchX = e.touches[0].clientX), { passive: true });
viewer.addEventListener("touchend", (e) => {
  if (touchX === null) return;
  const dx = e.changedTouches[0].clientX - touchX;
  touchX = null;
  if (Math.abs(dx) > 40) show(stepIndex(current, flat.length, dx > 0 ? 1 : -1));
});

let currentAlbums = ALBUMS;
render(currentAlbums);
// 紙的寬度跟上次排版時不一樣（轉手機方向、捲軸出現或消失、調整視窗）就重排：紙、軸、照片要用同一個寬度
new ResizeObserver(() => {
  if (paper.offsetWidth !== laidOutWidth) render(currentAlbums);
}).observe(paper);
// 換成手卷／掛軸、或手卷的視窗高度變了（紙寬可能剛好沒變）：也要重排
addEventListener("resize", () => {
  if (layoutKey() !== laidOutKey) render(currentAlbums);
});
window.__debug = {
  ...(window.__debug || {}),
  gallery: {
    render: (albums) => render((currentAlbums = albums)), // 除錯用：換一組相簿看排起來的樣子
    photos: () => flat
  }
};
