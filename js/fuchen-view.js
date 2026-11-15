// 畫九天玄女的拂塵、它掃出來的雲氣、和大門下半部的雲海（js/fuchen.js 決定怎麼動，這裡只負責畫和接滑鼠／手指）。
// 拂塵圖（assets/elements/fuchen.webp）：上面是玉柄（不彎），下面的毛切成一條一條橫的，
// 每一條照 hairOffset 往旁邊偏，接起來就是彎的毛。
// 雲海用開場動畫的雲圖（跟網站其他畫面同一個畫風），一張正、一張左右翻過來接著排，慢慢往右飄。
import { createFuchen, stepFuchen, whiskPose, hitWhisk, hairPath, HAIR_ROOT, FOG_COLS, FOG_ROWS } from "./fuchen.js";
import { LOOK, lookAssets } from "./gate.js";

const CLOUD_TOP = 0.46; // 雲圖的上緣放在畫面高度的哪裡（雲頂大約在 0.58）
const CLOUD_ALPHA = 0.88; // 雲海整體的不透明度（底下的台階隱約看得到）
const CLOUD_SCALE = 3; // 雲海用 1/3 解析度畫（雲本來就很柔，看不出差別）

export class FuchenView {
  constructor(canvas, kit) {
    this.c = canvas;
    this.ctx = canvas.getContext("2d");
    this.kit = kit; // { meta, whisk, wisp }
    this.s = createFuchen();
    this.active = false;
    this.mouse = { x: -9999, y: -9999, vx: 0, vy: 0 };
    this.click = null;
    this.release = false;
    this.wasHeld = false;
    this.last = 0; // 上一次畫的時間
    this.debt = 0; // 還沒走的時間（格）
    this.resize();
    // 拿著拂塵的是哪一根手指（或滑鼠）：別的手指按、移動、放開都不算
    this.owner = null;
    const mine = (e) => this.owner === null || e.pointerId === this.owner;
    const letGo = () => {
      this.release = true;
      this.owner = null;
      this.touchGrab = false;
    };
    this.mousey = false; // 最後一次是滑鼠（游標要跟著換）
    window.addEventListener("pointermove", (e) => {
      if (!mine(e)) return;
      // 拿著的時候滑鼠鍵已經沒按著（在視窗外放開的）：放下
      if (this.owner !== null && e.pointerType === "mouse" && e.buttons === 0) letGo();
      // 一格裡可能有好幾次移動：加起來才是這一格滑鼠走了多遠
      if (this.mouse.x > -9000) {
        this.mouse.vx += e.clientX - this.mouse.x;
        this.mouse.vy += e.clientY - this.mouse.y;
      }
      this.mouse.x = e.clientX;
      this.mouse.y = e.clientY;
      this.mousey = e.pointerType === "mouse";
      if (this.mousey) this.setCursor(this.onIt(this.mouse));
    });
    window.addEventListener("pointerdown", (e) => {
      if (!mine(e)) return;
      if (e.target.closest && e.target.closest("button, a, nav, header")) return;
      this.mouse.x = e.clientX; // 手機：按下去之前沒有移動過
      this.mouse.y = e.clientY;
      this.mousey = e.pointerType === "mouse";
      const q = { x: e.clientX, y: e.clientY };
      // 這裡說拿得起來才交給 stepFuchen（兩邊判斷一致，誰拿著也一定記得到）
      if (this.onIt(q)) {
        this.click = q;
        this.owner = e.pointerId;
        if (e.pointerType === "mouse") e.preventDefault(); // 拖的時候不要選到字
        if (e.pointerType === "touch") this.touchGrab = true; // pointerdown 比 touchstart 先到
      }
    });
    const up = (e) => {
      if (mine(e)) letGo();
    };
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    window.addEventListener("blur", letGo); // 切到別的視窗：放下
    // 手機：拿起拂塵的那根手指在按著，頁面才不捲動（從外面滑進來的、按在連結上的照常）
    this.touchGrab = false;
    window.addEventListener(
      "touchstart",
      (e) => {
        if (this.touchGrab) e.preventDefault();
      },
      { passive: false }
    );
    window.addEventListener(
      "touchmove",
      (e) => {
        if (this.touchGrab) e.preventDefault();
      },
      { passive: false }
    );
    window.addEventListener("resize", () => this.resize());
    // 還剩多少雲：每格一個像素的小圖（透明度），放大後把雲海挖洞
    this.fogC = document.createElement("canvas");
    this.fogC.width = FOG_COLS;
    this.fogC.height = FOG_ROWS;
    this.fogX = this.fogC.getContext("2d");
    this.fogImg = this.fogX.createImageData(FOG_COLS, FOG_ROWS);
    this.layer = document.createElement("canvas");
  }

  onIt(q) {
    return this.active && this.s.alpha > 0.5 && hitWhisk(this.s, this.w, this.h, q);
  }

  // 游標：移到拂塵上 → 可以拿；拿著 → 握住
  setCursor(over) {
    const cls = document.body.classList;
    cls.toggle("over-whisk", over && !this.s.held);
    cls.toggle("holding-whisk", this.s.held);
  }

  resize() {
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.w = window.innerWidth;
    this.h = window.innerHeight;
    this.c.width = this.w * this.dpr;
    this.c.height = this.h * this.dpr;
  }

  tick(now = performance.now()) {
    if (this.w !== window.innerWidth || this.h !== window.innerHeight) this.resize();
    const s = this.s;
    // 照真實時間走（1/60 秒一格）：高刷新率螢幕一樣慢；切回分頁最多補 4 格
    this.debt = Math.min(4, this.debt + (this.last ? ((now - this.last) * 60) / 1000 : 1));
    this.last = now;
    if (this.debt < 1) return;
    const n = Math.floor(this.debt);
    this.debt -= n;
    const mouse = { x: this.mouse.x, y: this.mouse.y, vx: this.mouse.vx / n, vy: this.mouse.vy / n };
    for (let i = 0; i < n; i++) {
      const first = i === 0;
      stepFuchen(s, { W: this.w, H: this.h, active: this.active, mouse, click: first ? this.click : null, release: first && this.release });
    }
    this.click = null;
    this.release = false;
    this.mouse.vx = 0;
    this.mouse.vy = 0;
    // 游標：拂塵會自己飄走，滑鼠不動也要每格重看一次
    if (this.mousey || s.held !== this.wasHeld) this.setCursor(this.mousey && this.onIt(this.mouse));
    this.wasHeld = s.held;
    const ctx = this.ctx;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, this.w, this.h);
    if (s.alpha <= 0) return;
    this.drawFog(ctx);
    this.drawWisps(ctx);
    this.drawWhisk(ctx);
  }

  // 雲海：先畫雲圖，再用「還剩多少雲」當透明度挖洞（拂塵掃過的地方雲散開）
  drawFog(ctx) {
    const { clouds } = this.kit;
    const L = this.layer;
    if (!clouds) return;
    const lw = Math.ceil(this.w / CLOUD_SCALE);
    const lh = Math.ceil(this.h / CLOUD_SCALE);
    if (L.width !== lw || L.height !== lh) {
      L.width = lw;
      L.height = lh;
    }
    const x = L.getContext("2d");
    x.globalCompositeOperation = "source-over";
    x.clearRect(0, 0, lw, lh);
    // 一張正、一張翻過來：接縫兩邊是同一個邊，看不出接在哪
    const bh = lh * (1 - CLOUD_TOP) * 1.02;
    const bw = (bh * clouds.width) / clouds.height;
    const y0 = lh * CLOUD_TOP;
    const drift = ((this.s.t * 0.05) / CLOUD_SCALE) % (bw * 2);
    for (let i = -2; i * bw < lw; i++) {
      const left = i * bw + drift;
      if (left + bw < 0) continue;
      x.save();
      if (i % 2) {
        x.translate(left + bw, 0);
        x.scale(-1, 1);
        x.drawImage(clouds, 0, y0, bw, bh);
      } else {
        x.drawImage(clouds, left, y0, bw, bh);
      }
      x.restore();
    }
    // 挖洞
    const { fog } = this.s;
    const px = this.fogImg.data;
    for (let i = 0; i < fog.length; i++) px[i * 4 + 3] = 255 * fog[i];
    this.fogX.putImageData(this.fogImg, 0, 0);
    x.globalCompositeOperation = "destination-in";
    x.imageSmoothingEnabled = true;
    x.imageSmoothingQuality = "high";
    x.drawImage(this.fogC, 0, 0, lw, lh);
    x.globalCompositeOperation = "source-over";
    ctx.globalAlpha = this.s.alpha * CLOUD_ALPHA;
    ctx.drawImage(L, 0, 0, this.w, this.h);
    ctx.globalAlpha = 1;
  }

  // 照神像拿拂塵的樣子：毛從頭直直垂下來，玉柄從頭往右下斜（玉柄畫在毛上面，頭的金箍蓋住毛根）
  // 照神像拿拂塵的樣子：毛從頭的金箍冒出來，繞一個弧往下垂；玉柄從頭往右下斜（玉柄畫在毛上面，金箍蓋住毛根）
  drawWhisk(ctx) {
    const { whisk } = this.kit;
    const a = whiskPose(this.s, this.w, this.h);
    const k = a.len / whisk.height;
    const dw = whisk.width * k;
    const rootY = whisk.height * HAIR_ROOT;
    ctx.save();
    ctx.globalAlpha = this.s.alpha;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high"; // 毛很細：縮小時用好一點的取樣，不然會一根一根鋸齒
    // 毛：拂塵圖的毛切成一條一條（每條剛好一段、不多讀一列，接縫才不會有線），沿著毛的形狀排、每條轉成那一段的方向
    const pts = hairPath(a);
    const n = pts.length - 1;
    const sh = (whisk.height - rootY) / n;
    for (let i = 0; i < n; i++) {
      const p0 = pts[i];
      const p1 = pts[i + 1];
      const dx = p1.x - p0.x;
      const dy = p1.y - p0.y;
      ctx.save();
      ctx.translate(p0.x, p0.y);
      ctx.rotate(-Math.atan2(dx, dy));
      ctx.drawImage(whisk, 0, rootY + sh * i, whisk.width, sh, -dw / 2, 0, dw, Math.hypot(dx, dy) + 0.6);
      ctx.restore();
    }
    // 玉柄：圖裡是從頭往上，轉過來變成從頭往右下
    ctx.translate(a.x, a.y);
    ctx.rotate(Math.PI - a.angle);
    ctx.drawImage(whisk, 0, 0, whisk.width, rootY, -dw / 2, -rootY * k, dw, rootY * k);
    ctx.restore();
  }

  drawWisps(ctx) {
    const { wisp } = this.kit;
    const a = whiskPose(this.s, this.w, this.h);
    const ww = a.len * 0.9;
    const wh = (ww * wisp.height) / wisp.width;
    for (const w of this.s.wisps) {
      ctx.globalAlpha = w.alpha * this.s.alpha;
      // 飄的時候慢慢變大一點、散開
      const g = 1 + w.age / 600;
      ctx.drawImage(wisp, w.x - (ww * g) / 2, w.y - (wh * g) / 2, ww * g, wh * g);
    }
    ctx.globalAlpha = 1;
  }
}

export async function loadFuchenKit() {
  const img = (u) =>
    new Promise((res, rej) => {
      const im = new Image();
      im.onload = () => res(im);
      im.onerror = rej;
      im.src = u;
    });
  try {
    const [meta, whisk, wisp] = await Promise.all([
      fetch("assets/elements/weapons.json").then((r) => r.json()),
      img("assets/elements/fuchen.webp"),
      img("assets/elements/cloud-wisp.webp")
    ]);
    // 雲海的圖晚一點到也沒關係：先有拂塵，雲到了再出現
    const kit = { meta: meta.fuchen, whisk, wisp, clouds: null };
    img(lookAssets(LOOK).clouds).then((im) => (kit.clouds = im), () => {});
    return kit;
  } catch (_) {
    return null;
  }
}
