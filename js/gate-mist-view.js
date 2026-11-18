// 首頁道場門前慢慢飄的薄霧（位置、快慢在 js/gate-mist.js）。
// 每一層：一個不動的長條（兩邊用 CSS mask 空出不要有霧的地方）裡面放一張兩倍寬的霧圖，用 CSS 慢慢橫移一個圖寬（接得起來，看不到接縫）。
// 放在大門圖的後面一個（同一層、在圖上面、在珠簾下面），換神明時跟大門一起放大，也跟清楚的大門一起淡出、淡入。
import { MIST_BANDS, MIST_PUFFS, visibleAt, mistBlobs, stripCopies } from "./gate-mist.js";

const K = 0.5; // 霧本來就是糊的：畫布用設計座標的一半就夠
const COLOR = "246, 244, 242"; // 背景的珍珠白
// 濃的那兩團：真的霧堆上面亮、底下帶一點灰藍的陰影，白牆上才看得出一團一團（白霧蓋白牆是看不到的）
const BRIGHT = "252, 252, 251";
const SHADE = "168, 178, 192";

// 一團柔和的橢圓（中間濃、往外淡掉）
function puff(g, x, y, rx, ry, color, alpha) {
  g.save();
  g.translate(x, y);
  g.scale(rx / ry, 1);
  const grad = g.createRadialGradient(0, 0, 0, 0, 0, ry);
  grad.addColorStop(0, `rgba(${color}, ${alpha})`);
  grad.addColorStop(0.6, `rgba(${color}, ${alpha * 0.4})`);
  grad.addColorStop(1, `rgba(${color}, 0)`);
  g.fillStyle = grad;
  g.fillRect(-ry, -ry, ry * 2, ry * 2);
  g.restore();
}

function drawStrip(seed, w, h, n = 22, shaded = false) {
  const c = document.createElement("canvas");
  c.width = Math.round(w * 2 * K);
  c.height = Math.round(h * K);
  const g = c.getContext("2d");
  g.scale(K, K);
  const blobs = mistBlobs(seed, w, h, n);
  // 先畫完所有陰影、再畫所有亮面：不然後畫那團的陰影會壓在前面那團的亮面上，頂部變灰變髒
  if (shaded) for (const b of blobs) for (const x of stripCopies(b.x, w)) puff(g, x, b.y + b.ry * 0.35, b.rx * 1.05, b.ry, SHADE, b.alpha * 0.55);
  for (const b of blobs) {
    // 每團霧畫四份（見 stripCopies）：兩倍寬的圖左右兩半一模一樣，飄一圈接回開頭時看不出來
    {
      for (const x of stripCopies(b.x, w)) {
        g.save();
        g.translate(x, b.y);
        g.scale(b.rx / b.ry, 1);
        const grad = g.createRadialGradient(0, 0, 0, 0, 0, b.ry);
        const col = shaded ? BRIGHT : COLOR; // 濃的那兩團上面比較亮
        grad.addColorStop(0, `rgba(${col}, ${b.alpha})`);
        grad.addColorStop(0.55, `rgba(${col}, ${b.alpha * 0.45})`);
        grad.addColorStop(1, `rgba(${col}, 0)`);
        g.fillStyle = grad;
        g.fillRect(-b.ry, -b.ry, b.ry * 2, b.ry * 2);
        g.restore();
      }
    }
  }
  return c;
}

// 兩邊有霧、中間空出來：照 visibleAt 每 40 單位取一個點做成 CSS 漸層
function maskFor(band, w) {
  const stops = [];
  for (let x = 0; x <= w; x += 40) stops.push(`rgba(0, 0, 0, ${visibleAt(band, x).toFixed(3)}) ${((x / w) * 100).toFixed(2)}%`);
  return `linear-gradient(to right, ${stops.join(", ")})`;
}

export function addGateMist(gate) {
  const gateImg = document.getElementById("gateImg");
  if (!gateImg) return;
  const wrap = document.createElement("div");
  wrap.className = "gate-mist";
  wrap.id = "gateMist"; // 換神明時跟清楚的大門一起淡出、淡入（js/main.js 的 setGate）
  wrap.setAttribute("aria-hidden", "true");
  MIST_BANDS.forEach((b, i) => {
    const row = document.createElement("div");
    row.className = "gate-mist-row";
    row.style.top = `${b.y0}px`;
    row.style.height = `${b.y1 - b.y0}px`;
    row.style.opacity = String(b.opacity);
    // 每一層都要遮：兩端淡掉（每一層），中間空出來（有 clear 的層）
    const m = maskFor(b, gate.w);
    row.style.maskImage = m;
    row.style.webkitMaskImage = m;
    const band = document.createElement("div");
    band.className = "gate-mist-band";
    band.style.animationDuration = `${b.seconds}s`;
    band.style.animationDirection = b.dir < 0 ? "normal" : "reverse";
    band.append(drawStrip(i + 1, gate.w, b.y1 - b.y0));
    row.append(band);
    wrap.append(row);
  });
  // 比較濃、會慢慢變濃再散開的兩團（濃淡是 CSS 的 gate-mist-breathe，跟橫飄各走各的時間）
  MIST_PUFFS.forEach((p, i) => {
    const row = document.createElement("div");
    row.className = "gate-mist-row";
    row.style.top = `${p.y0}px`;
    row.style.height = `${p.y1 - p.y0}px`;
    const m = maskFor(p, gate.w);
    row.style.maskImage = m;
    row.style.webkitMaskImage = m;
    const band = document.createElement("div");
    band.className = "gate-mist-band gate-mist-puff";
    band.style.setProperty("--peak", String(p.peak));
    band.style.animationDuration = `${p.seconds}s, ${p.breathe}s`;
    band.style.animationDelay = `0s, ${p.delay}s`;
    band.style.animationDirection = `${p.dir < 0 ? "normal" : "reverse"}, normal`;
    band.append(drawStrip(10 + i, gate.w, p.y1 - p.y0, 30, true));
    row.append(band);
    wrap.append(row);
  });
  gateImg.after(wrap);
}
