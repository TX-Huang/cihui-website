// 蟠桃樹（瑤池金母頁）的規格：
// 1. 桃樹站在大門右前方，不擋到珠簾門洞，整棵都在畫面裡；手機上也有，至少 80 像素寬（點得到）
// 2. 點一下桃樹：葉子和花一片一片飄起來，排成道場 LINE 的 QR code；再點一下飄回去變成樹
// 3. 掃得到：每個深色格子剛好一片；QR 卡片四邊留白至少 4 格；深淺對比至少 7；卡片整個在畫面裡、每格至少 4 像素
// 4. 優雅：整段約 2.5 秒，每片出發時間錯開，路線微微往上飄（弧線），每格移動不跳；
//    動到一半再點一下會從現在的位置慢慢倒回去，不會跳
// 5. 換到別的神明：慢慢淡掉，回到樹的樣子；要求減少動畫：點了直接換，不飄
import { test } from "node:test";
import { spawnSync } from "node:child_process";
import assert from "node:assert/strict";
import {
  treeRect,
  qrBox,
  assignParticles,
  particlePose,
  createPeach,
  stepPeach,
  togglePeach,
  hitPeach,
  QR_DARK,
  QR_LIGHT,
  DURATION
} from "../js/peach.js";
import { LINE_QR, LINE_URL } from "../js/line-qr.js";
import { fitGate } from "../js/layout.js";
import { GATE } from "../js/gate.js";

const ASPECT = 1024 / 1536; // 樹圖寬 / 高
const SIZES = [
  [1280, 720],
  [1440, 900],
  [1920, 1080],
  [2560, 1440],
  [390, 844],
  [360, 740],
  [667, 375], // 手機橫拿
  [844, 390]
];
function seeded(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}
// 珠簾門洞在畫面上的位置（跟 style.css 的 .gate-wrap 一樣：置中、底部在 101vh、從底部縮放）
function doorOnScreen(vw, vh) {
  const s = fitGate(vw, vh, GATE);
  const left = vw / 2 - (GATE.w * s) / 2;
  const top = vh * 1.01 - GATE.h * s;
  const d = GATE.door;
  return { x0: left + d.x0 * s, x1: left + d.x1 * s, y0: top + d.y0 * s, y1: top + d.y1 * s };
}
const canopy = (n, random) =>
  Array.from({ length: n }, () => ({ x: 0.2 + random() * 0.6, y: 0.05 + random() * 0.5, color: [90, 130, 95] }));
const darkCount = LINE_QR.join("").split("").filter((c) => c === "1").length;

test("the tree stands to the right of the doorway, fully on screen, big enough to tap", () => {
  for (const [vw, vh] of SIZES) {
    const r = treeRect(vw, vh, ASPECT);
    const d = doorOnScreen(vw, vh);
    assert.ok(r.x >= 0 && r.y >= 0 && r.x + r.w <= vw && r.y + r.h <= vh, `${vw}x${vh}: on screen`);
    assert.ok(r.x >= d.x1 + 4, `${vw}x${vh}: clear of the curtain doorway (tree x ${r.x.toFixed(0)}, door ends ${d.x1.toFixed(0)})`);
    assert.ok(r.w >= 80, `${vw}x${vh}: ${r.w.toFixed(0)} px wide`);
    assert.ok(Math.abs(r.w / r.h - ASPECT) < 1e-6, "not stretched");
  }
});

test("the QR code is the dojo's LINE link, square, with real finder patterns", () => {
  const n = LINE_QR.length;
  assert.ok(n >= 21 && (n - 17) % 4 === 0, `${n}x${n} is a QR size`);
  assert.ok(LINE_QR.every((r) => r.length === n && /^[01]+$/.test(r)));
  assert.match(LINE_URL, /^https:\/\//);
  // 三個角的定位方塊：外框 7×7 是深色、裡面一圈淺色、中間 3×3 深色
  for (const [r0, c0] of [[0, 0], [0, n - 7], [n - 7, 0]]) {
    for (let r = 0; r < 7; r++)
      for (let c = 0; c < 7; c++) {
        const ring = Math.max(Math.abs(r - 3), Math.abs(c - 3));
        assert.equal(LINE_QR[r0 + r][c0 + c], ring === 2 ? "0" : "1", `finder at ${r0},${c0}`);
      }
  }
});

test("scannable: quiet zone of 4 modules, at least 4 px per module, inside the screen, strong contrast", () => {
  const n = LINE_QR.length;
  for (const [vw, vh] of SIZES) {
    const b = qrBox(n, treeRect(vw, vh, ASPECT), vw, vh);
    assert.ok(Number.isInteger(b.m) && b.m >= 4, `${vw}x${vh}: ${b.m} px per module`);
    assert.ok(b.x0 - b.card.x >= 4 * b.m - 1e-9 && b.card.x + b.card.w - (b.x0 + n * b.m) >= 4 * b.m - 1e-9, "quiet zone left/right");
    assert.ok(b.y0 - b.card.y >= 4 * b.m - 1e-9 && b.card.y + b.card.h - (b.y0 + n * b.m) >= 4 * b.m - 1e-9, "quiet zone top/bottom");
    assert.ok(b.card.x >= 0 && b.card.x + b.card.w <= vw && b.card.y + b.card.h <= vh, `${vw}x${vh}: card on screen`);
    assert.ok(b.card.y >= 64, `${vw}x${vh}: card below the menu bar (top ${b.card.y})`);
  }
  const lum = (hex) => {
    const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((x) => (x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4));
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  };
  const ratio = (lum(QR_LIGHT) + 0.05) / (lum(QR_DARK) + 0.05);
  assert.ok(ratio >= 7, `contrast ${ratio.toFixed(1)}`);
});

test("every dark module gets exactly one leaf, each starting somewhere on the crown", () => {
  const random = seeded(3);
  const pts = canopy(900, random);
  const ps = assignParticles(LINE_QR, pts, random);
  assert.equal(ps.length, darkCount);
  const cells = new Set(ps.map((p) => `${p.row},${p.col}`));
  assert.equal(cells.size, darkCount, "no module twice");
  for (const p of ps) {
    assert.equal(LINE_QR[p.row][p.col], "1", "only dark modules");
    assert.ok(pts.some((q) => q.x === p.sx && q.y === p.sy), "starts on a crown point");
    assert.ok(p.delay >= 0 && p.delay <= 0.4, "departures are staggered");
  }
  // 樹冠的點比格子少也要每格都有（同一點可以出發好幾片）
  assert.equal(assignParticles(LINE_QR, canopy(50, random), random).length, darkCount);
});

test("each leaf drifts from the tree to its module along a gentle upward arc, never jumping", () => {
  const random = seeded(5);
  const vw = 1440;
  const vh = 900;
  const tree = treeRect(vw, vh, ASPECT);
  const box = qrBox(LINE_QR.length, tree, vw, vh);
  const ps = assignParticles(LINE_QR, canopy(900, random), random);
  for (const p of ps.slice(0, 80)) {
    const a = particlePose(p, 0, tree, box);
    assert.ok(Math.abs(a.x - (tree.x + p.sx * tree.w)) < 1e-6 && Math.abs(a.y - (tree.y + p.sy * tree.h)) < 1e-6, "starts on the tree");
    const z = particlePose(p, 1, tree, box);
    assert.ok(Math.abs(z.x - (box.x0 + (p.col + 0.5) * box.m)) < 1e-6 && Math.abs(z.y - (box.y0 + (p.row + 0.5) * box.m)) < 1e-6, "ends in its module");
    assert.equal(z.size, box.m, "fills the module exactly");
    let last = a;
    let lift = 0;
    for (let f = 1; f <= DURATION; f++) {
      const q = particlePose(p, f / DURATION, tree, box);
      assert.ok(Math.hypot(q.x - last.x, q.y - last.y) <= 25, `moves smoothly (${Math.hypot(q.x - last.x, q.y - last.y).toFixed(1)} px in a frame)`);
      lift = Math.max(lift, a.y + (z.y - a.y) * q.e - q.y); // 比直線高多少
      last = q;
    }
    assert.ok(lift >= 20 && lift <= 160, `floats up a little on the way (${lift.toFixed(0)} px above the straight line)`);
  }
});

test("about 2.5 s each way; a second click mid-way turns back smoothly from where it is", () => {
  assert.ok(DURATION >= 120 && DURATION <= 180, `${(DURATION / 60).toFixed(1)} s`);
  const s = createPeach();
  assert.equal(s.t, 0);
  togglePeach(s);
  let frames = 0;
  while (s.t < 1 && frames < 1000) {
    const before = s.t;
    stepPeach(s, { active: true });
    assert.ok(s.t - before <= 1 / DURATION + 1e-9 && s.t >= before);
    frames++;
  }
  assert.equal(frames, DURATION);
  togglePeach(s);
  for (let i = 0; i < 40; i++) stepPeach(s, { active: true });
  const mid = s.t;
  togglePeach(s); // 倒回去一半時又點
  stepPeach(s, { active: true });
  assert.ok(Math.abs(s.t - mid) <= 1 / DURATION + 1e-9, "no jump");
  assert.ok(s.t > mid, "heads back to the QR code");
});

test("clicking the tree (or the QR card) toggles; clicking elsewhere does nothing", () => {
  const vw = 1440;
  const vh = 900;
  const tree = treeRect(vw, vh, ASPECT);
  const box = qrBox(LINE_QR.length, tree, vw, vh);
  const s = createPeach();
  assert.ok(hitPeach(s, tree.x + tree.w / 2, tree.y + tree.h * 0.3, tree, box), "the crown");
  assert.ok(!hitPeach(s, 20, 20, tree, box), "far away");
  s.t = 1;
  s.target = 1;
  assert.ok(hitPeach(s, box.card.x + 5, box.card.y + 5, tree, box), "the card, when the QR code is showing");
});

test("leaving the 金母 page: fades out and goes back to being a tree; reduced motion switches at once", () => {
  const s = createPeach();
  togglePeach(s);
  for (let i = 0; i < DURATION; i++) stepPeach(s, { active: true });
  let last = s.alpha;
  let n = 0;
  while (s.alpha > 0 && n < 500) {
    stepPeach(s, { active: false });
    assert.ok(s.alpha <= last);
    last = s.alpha;
    n++;
  }
  assert.ok(n >= 45, `fades over ${n} frames`);
  assert.equal(s.target, 0, "will be a tree next time");
  const still = createPeach({ still: true });
  togglePeach(still);
  stepPeach(still, { active: true });
  assert.equal(still.t, 1, "reduced motion: straight to the QR code");
});

// 3b. 真的掃一次：用 OpenCV 解碼 js/line-qr.js 的格子，要讀出 LINE_URL（電腦沒裝 Python／OpenCV 就跳過）
test("the QR matrix really decodes to the LINE link", (t) => {
  const r = spawnSync("python", ["-I", "tools/make_line_qr.py", "--check"], { encoding: "utf8" });
  if (r.error || /No module named/.test(r.stderr)) return t.skip("Python with OpenCV is not installed");
  assert.equal(r.status, 0, r.stderr || r.stdout);
  assert.match(r.stdout, /decoded OK/);
});

// 3c. 花瓣不能蓋住 QR：桃樹這層在花瓣上面、舞台（大門）上面，選單下面
test("falling petals never cover the QR code (the peach layer is above them)", async () => {
  const { readFileSync } = await import("node:fs");
  const css = readFileSync(new URL("../style.css", import.meta.url), "utf8");
  const z = (sel) => Number(css.match(new RegExp(`\\n\\.${sel}\\s*\\{[^}]*z-index:\\s*(\\d+)`))?.[1]);
  const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  assert.ok(html.indexOf('id="peach"') < html.indexOf('<div class="stage"'), "not inside the stage");
  assert.ok(z("peach") > z("petals") && z("peach") > z("stage") && z("peach") < z("topbar"), `peach ${z("peach")}, petals ${z("petals")}`);
});
