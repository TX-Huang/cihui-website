// 相簿畫卷（gallery.html）：照片清單在 js/gallery.js，排版在 js/scroll.js，這裡把它們放進網頁。
// 電腦：橫向手卷，從右往左看（一打開就在最右邊，滾輪往下＝往左捲）。
// 手機：直立掛軸，從上往下看。點照片放大看。
import { ALBUMS } from "./gallery.js";
import { scrollLayout, stepIndex, wheelPixels } from "./scroll.js";

const $ = (id) => document.getElementById(id);
const paper = $("scrollPaper");
const track = $("scrollTrack");
const empty = $("scrollEmpty");
const viewer = $("viewer");
let flat = []; // 所有照片排成一串（看大圖時用），跟畫卷上的照片同一份

let mode = null;

function render(albums) {
  flat = albums.flatMap((album) => album.photos.map((p) => ({ ...p, album: album.title })));
  const hang = window.innerWidth <= 720;
  mode = hang ? "hang" : "hand";
  document.documentElement.classList.toggle("hang", hang);
  // 手卷：照片高度跟著視窗高度（最高 420）；掛軸：照片跟紙一樣寬
  const size = hang ? paper.clientWidth - 32 : Math.max(240, Math.min(420, window.innerHeight * 0.48));
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

render(ALBUMS);
let lastW = window.innerWidth;
addEventListener("resize", () => {
  if (window.innerWidth !== lastW) {
    lastW = window.innerWidth;
    render(ALBUMS);
  }
});
window.__debug = { ...(window.__debug || {}), gallery: { render, photos: () => flat } };
