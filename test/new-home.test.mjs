// 新首頁（神話感版本）第一段：開場影片 → 鳳凰飛走 → 經文光簾從天上降下來。
// 使用者 2026-11-16：影片定案（鳳凰從左前方飛到右後方，assets/raw/…/dojo-open-opening-phoenix-away-16x9.mp4）、
// 光簾選 B「天上垂下來」、「記得讓鳳凰飛過珠簾才降下」、「開始做」（先做成另一個網址，舊首頁不動，兩個都看過再選）。
//
// 規格：
// 1. 新首頁是另一個網址 new-home.html；index.html 不動，也不連過去（還在試做，不給搜尋引擎收錄）。
//    影片和圖都放在 assets/opening/。
// 2. 一打開就播開場影片：靜音、手機上不會跳成全螢幕、沒有聲音軌。
//    一打開看到的就是第一格（不會先閃一下最後一格再淡過去）；最後一格的圖只在要用的時候才出現。
//    用哪一支：看影片鋪滿畫面時實際要多少像素。720p 放大不超過 1.25 倍就用 720p（4 MB 以內），
//    不夠就用 1080p（12 MB 以內）；手機（短邊 ≤ 600）或開了省流量一律 720p。
// 3. 影片 13 秒，鳳凰在 10.71 秒完全飛走。光簾在影片第 11 秒才開始降下（鳳凰飛走以後）。
//    影片播完、或按了略過：影片慢慢淡掉，露出底下最後一格的靜止圖（兩張一樣，看不出接縫），影片停止下載。
// 4. 光簾＝選項 B：從畫面上方垂下來的金色經文光簾，中間短、兩邊長（像收在兩旁的簾子），左右對稱；
//    每一串越往下越淡；字有淡淡的深金邊（亮的天空上也看得清楚）。用金母的經文，重要的句子更亮。
//    滑鼠或手指撥過會晃開（兩根手指還是可以放大畫面）。用原本珠簾的物理（js/cloth.js）。
//    垂好以後最低的字在畫面 3/4 以內（壇和山還看得到）。
// 5. 降下來要慢、要順（優雅不躁動）：先淡入，再慢慢垂下，任何畫面大小都在 1～2 秒內垂到九成，不會衝過頭再彈回來。
//    快慢照真實時間算：120Hz、144Hz 的螢幕跟 60Hz 一樣快。
//    垂好以後輕輕晃一下就靜下來（沒有人碰它 3 秒後，微風在 2 秒內慢慢停）；滑鼠或手指一動又會晃。靜下來就不再一直重畫（省電）。
// 6. 「略過開場影片」按鈕（畫面上寫「略過」，按 Tab 第一個就到它）；按 Esc 也一樣。略過以後鍵盤的位置移到選單。
//    這次造訪已經看過（光簾開始降下就算看過），就不再播：直接是最後一格，光簾降下。
//    按「上一頁」回到這一頁（瀏覽器把整頁留著）：直接到最後一格，不會在光簾後面重播影片。
// 7. 要求減少動畫：不播影片，直接是最後一格的靜止圖，光簾直接掛好（不降、不晃）。
// 8. 影片不能自動播放（例如手機省電模式）：不會卡在第一格，直接換成最後一格、光簾降下（算看過：下次也播不了）。
//    影片載入失敗：一樣直接到最後一格，但不算看過（重新整理會再試一次）。
// 9. 沒有 JavaScript：看得到最後一格的靜止圖（有替代文字），影片不出現。
// 10. 頂部選單跟其他頁一樣（慈惠道場、關於道場、法會活動、服務、相簿）；頁面有給讀螢幕軟體的 h1「慈惠道場」。
// 11. 光簾的字等字型載好才畫（最多等 2 秒）；如果比較晚才載好，就換成載好的字型重畫。
// 12. 只載這一頁用得到的字型（選單的黑體、光簾和品牌的宋體），不載整套。
// 13. 2026-11-16 第二輪審查：
//     - 程式沒載到（檔案壞了、很舊的瀏覽器）也不會卡在第一格：8 秒內程式沒開始，就換成最後一格（沒有程式時的樣子）。
//     - 按上一頁回來：直接切到最後一格，不會先閃回第一格再淡過去。
//     - 網路慢：第一格先下載（最後一格晚一點沒關係）。
//     - 光簾開始降下以前都先等字型（最多 2 秒；略過時影片淡掉的那一下剛好蓋住）。
//     - 畫面大小一變，畫布馬上跟著變（字不會被拉扁）；光簾正在降的話，從頭再降一次（不會一下子跳到垂好）。
//     - 播的時候最後一格只是看不到（讀螢幕軟體還唸得到它的說明）。
//     - 播放被打斷（例如分頁切到背景）不算「不能自動播放」，不會因此把開場記成看過。
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, statSync, existsSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { createCloth, step } from "../js/cloth.js";
import {
  VIDEO_S,
  PHOENIX_GONE_S,
  CURTAIN_AT_S,
  VIDEOS,
  STILL,
  POSTER,
  SEEN_KEY,
  pickVideo,
  openingMode,
  openingStep,
  curtainLayout,
  strandRows,
  glyphAlpha,
  FADE_MS,
  curtainFade,
  rollUp,
  dropParams,
  dropNext,
  STEP_MS,
  stepsFor,
  breezeAt
} from "../js/opening.js";

const read = (f) => readFileSync(new URL(`../${f}`, import.meta.url), "utf8");
const exists = (f) => existsSync(new URL(`../${f}`, import.meta.url));
const size = (f) => statSync(new URL(`../${f}`, import.meta.url)).size;
const html = exists("new-home.html") ? read("new-home.html") : "";
const css = exists("new-home.css") ? read("new-home.css") : "";
const view = exists("js/opening-view.js") ? read("js/opening-view.js") : "";

test("a separate page: new-home.html; the old homepage is untouched and does not link to it", () => {
  assert.ok(html, "new-home.html exists");
  assert.doesNotMatch(read("index.html"), /new-home/, "index.html does not point to it yet");
  assert.match(html, /<meta name="robots" content="noindex"/, "still a trial: kept out of search engines");
  for (const f of [...Object.values(VIDEOS), STILL, POSTER]) {
    assert.match(f, /^assets\/opening\//, `${f} lives in assets/opening/`);
    assert.ok(exists(f), `${f} exists`);
  }
});

test("the video: muted, inline on phones, no sound track, small enough", () => {
  const video = html.match(/<video[^>]*>/)?.[0] ?? "";
  assert.match(video, /\bmuted\b/);
  assert.match(video, /\bplaysinline\b/, "phones do not jump to full screen");
  assert.match(video, /aria-hidden="true"/, "decoration (the still underneath has the description)");
  assert.doesNotMatch(video, /\bautoplay\b|\bsrc=|\bposter=/, "the script picks the file and starts it; the first frame comes from the page (only when playing)");
  assert.ok(size(VIDEOS.big) <= 12 * 1024 * 1024, `1080p is ${(size(VIDEOS.big) / 1048576).toFixed(1)} MB`);
  assert.ok(size(VIDEOS.small) <= 4 * 1024 * 1024, `720p is ${(size(VIDEOS.small) / 1048576).toFixed(1)} MB`);
  // 沒有聲音軌：MP4 每一軌的 hdlr 盒子寫著它是什麼（vide 影像、soun 聲音）
  for (const f of Object.values(VIDEOS)) {
    const box = readFileSync(new URL(`../${f}`, import.meta.url)).toString("latin1");
    assert.doesNotMatch(box, /hdlr[\s\S]{8}soun/, `${f}: no sound track`);
    assert.match(box, /hdlr[\s\S]{8}vide/, `${f}: has the picture`);
  }
});

test("which file: by the pixels the video really needs when it fills the screen", () => {
  const pick = (w, h, dpr = 1, saveData = false) => pickVideo({ w, h, dpr, saveData });
  assert.equal(pick(1280, 800), VIDEOS.small, "1280×800 screen: 720p is only stretched 1.11×");
  assert.equal(pick(1440, 790, 2), VIDEOS.big, "MacBook (window under the browser bar), sharp screen");
  assert.equal(pick(1536, 730, 1.25), VIDEOS.big, "Windows laptop at 125%");
  assert.equal(pick(1920, 1080), VIDEOS.big, "1080p monitor");
  assert.equal(pick(820, 1180, 2), VIDEOS.big, "tablet");
  assert.equal(pick(390, 844, 3), VIDEOS.small, "phone, portrait");
  assert.equal(pick(844, 390, 3), VIDEOS.small, "phone, landscape");
  assert.equal(pick(1920, 1080, 2, true), VIDEOS.small, "data saver on");
});

test("the first thing you see is the first frame, decided before the page is drawn (no flash of the ending)", () => {
  const head = html.slice(0, html.indexOf("</head>"));
  const inline = head.match(/<script>([\s\S]*?)<\/script>/)?.[1] ?? "";
  assert.ok(inline, "a small script in <head> decides before the first paint");
  // 跟 openingMode 算的一樣（四種情況都跑一次）
  for (const seen of [false, true]) {
    for (const reduce of [false, true]) {
      const root = { dataset: {} };
      runInNewContext(inline, {
        sessionStorage: { getItem: (k) => (k === SEEN_KEY && seen ? "1" : null) },
        matchMedia: (q) => ({ matches: /reduce/.test(q) && reduce }),
        document: { documentElement: root, head: { appendChild() {} }, createElement: () => ({}) },
        setTimeout() {}
      });
      assert.equal(root.dataset.opening, openingMode({ seen, reduceMotion: reduce }), `seen ${seen}, reduce ${reduce}`);
    }
  }
  // sessionStorage 不能用也不會壞
  const root = { dataset: {} };
  runInNewContext(inline, {
    get sessionStorage() {
      throw new Error("blocked");
    },
    matchMedia: () => ({ matches: false }),
    document: { documentElement: root, head: { appendChild() {} }, createElement: () => ({}) },
    setTimeout() {}
  });
  assert.equal(root.dataset.opening, "play", "storage blocked: just play");
  // 播的時候：影片一開始就看得到（不淡入）、最後一格藏起來、第一格墊在後面
  assert.match(css, /\[data-opening="play"\] \.opening-video\s*\{[^}]*opacity:\s*1/);
  assert.match(css, /\[data-opening="play"\] \.opening-still\s*\{[^}]*opacity:\s*0/, "the ending is hidden while playing");
  assert.doesNotMatch(css, /\.opening-still\s*\{[^}]*visibility:\s*hidden/, "but screen readers can still read its description");
  // 網路慢：第一格先下載，最後一格晚一點
  assert.match(inline, /dataset\.opening === "play"[\s\S]*rel = "preload"[\s\S]*opening-first\.webp[\s\S]*fetchPriority = "high"/, "the first frame is fetched first when playing");
  assert.match(html, /<img[^>]*class="opening-still"[^>]*fetchpriority="low"/, "the last frame can wait");
  // 程式沒載到也不會卡住
  assert.match(html, /<script type="module" src="js\/opening-view\.js" onerror="[^"]*dataset\.opening = 'end'/, "a missing module goes to the still");
  assert.match(inline, /setTimeout\([\s\S]*openingReady[\s\S]*"end"[\s\S]*8000\)/, "a module that never starts (old browser) goes to the still after 8 s");
  assert.match(view, /root\.dataset\.openingReady = "1"/, "the module says it started");
  assert.doesNotMatch(view, /^await /m, "no top-level await (older Safari cannot read the file at all)");
  assert.match(css, new RegExp(`\\[data-opening="play"\\] \\.opening\\s*\\{[^}]*url\\("${POSTER}"\\)`), "the first frame shows while the video loads (only when playing)");
  assert.match(css, /\.opening-video\s*\{[^}]*opacity:\s*0[^}]*transition:\s*opacity/, "otherwise hidden; fades out (not a cut)");
});

test("timing: the curtain lowers only after the phoenix has gone; ending fades the video into the still and stops the download", () => {
  assert.equal(VIDEO_S, 13);
  assert.equal(PHOENIX_GONE_S, 10.71);
  assert.ok(CURTAIN_AT_S > PHOENIX_GONE_S && CURTAIN_AT_S < VIDEO_S, `curtain at ${CURTAIN_AT_S} s`);
  const still = html.match(/<img[^>]*class="opening-still"[^>]*>/)?.[0] ?? "";
  assert.match(still, new RegExp(`src="${STILL}"`));
  assert.match(still, /alt="[^"]{8,}"/, "the still has a description (works without JavaScript too)");
  assert.ok(html.indexOf('class="opening-still"') < html.indexOf("<video"), "the still sits under the video");
  assert.match(view, /removeAttribute\("src"\)[\s\S]{0,80}\.load\(\)/, "the video stops downloading once hidden");
});

test("what happens when: the opening as a small state machine", () => {
  const go = (state, ev, t) => openingStep(state, ev, t);
  // 播放中：時間到 11 秒以前什麼都不做
  for (const t of [0, 5, 10.7, 10.99]) assert.deepEqual(go("playing", "time", t), { state: "playing", acts: [] }, `${t} s`);
  // 11 秒：光簾開始降下，算看過了
  assert.deepEqual(go("playing", "time", 11), { state: "lowering", acts: ["curtain", "remember"] });
  assert.deepEqual(go("lowering", "time", 12), { state: "lowering", acts: [] }, "only once");
  // 播完：影片淡成最後一格（光簾已經在降）
  assert.deepEqual(go("lowering", "ended"), { state: "done", acts: ["hideVideo"] });
  assert.deepEqual(go("playing", "ended"), { state: "done", acts: ["hideVideo", "curtain", "remember"] }, "never reached 11 s (e.g. a stall): still lowers");
  // 略過、Esc
  assert.deepEqual(go("playing", "skip"), { state: "done", acts: ["hideVideo", "curtain", "remember"] });
  assert.deepEqual(go("lowering", "skip"), { state: "done", acts: ["hideVideo"] }, "the curtain is already coming");
  // 不能自動播放：直接到最後一格，算看過
  assert.deepEqual(go("playing", "refused"), { state: "done", acts: ["hideVideo", "curtain", "remember"] });
  // 載入失敗：直接到最後一格，但不算看過
  assert.deepEqual(go("playing", "error"), { state: "done", acts: ["hideVideo", "curtain"] });
  // 按上一頁回來（整頁被留著）：直接到最後一格
  assert.deepEqual(go("playing", "restored"), { state: "done", acts: ["cutVideo", "curtain", "remember"] }, "cut, do not fade from a rewound first frame");
  assert.deepEqual(go("lowering", "restored"), { state: "done", acts: ["cutVideo"] });
  // 結束以後什麼都不再發生
  for (const ev of ["time", "ended", "skip", "refused", "error", "restored"]) assert.deepEqual(go("done", ev, 12), { state: "done", acts: [] }, ev);
  // 網頁真的把這些事件接上去
  assert.match(view, /key === "Escape"\) (send|go)\("skip"\)/, "Esc skips");
  assert.match(view, /addEventListener\("error", \(\) => (send|go)\("error"\)\)/);
  assert.match(view, /addEventListener\("ended", \(\) => (send|go)\("ended"\)\)/);
  assert.match(view, /addEventListener\("pageshow", \(e\) => \{\s*if \(e\.persisted\) send\("restored"\);/, "back / forward cache");
  assert.match(view, /act === "cutVideo"\) hideVideo\(\{ cut: true \}\)/, "the cut has no fade");
  assert.match(css, /\[data-cut\] \.opening-video\s*\{[^}]*transition:\s*none/);
  // 播放被打斷（AbortError）不算不能自動播放
  assert.match(view, /\.play\(\)\.catch\(\(e\) => \{\s*if \(e\.name === "NotAllowedError"\) send\("refused"\);\s*else if \(e\.name !== "AbortError"\) send\("error"\);/);
  assert.match(view, /(send|go)\("time", video\.currentTime\)/);
});

test("which opening: first visit plays; seen this visit → straight to the end; reduced motion → the still, curtain already hanging", () => {
  assert.equal(openingMode({ seen: false, reduceMotion: false }), "play");
  assert.equal(openingMode({ seen: true, reduceMotion: false }), "end");
  assert.equal(openingMode({ seen: false, reduceMotion: true }), "still");
  assert.equal(openingMode({ seen: true, reduceMotion: true }), "still");
  assert.match(SEEN_KEY, /^cihui-/);
  assert.match(view, /if \(mode === "still"\) hangCurtain\(\)/, "reduced motion: the curtain hangs, it does not lower");
});

const SIZES = [[844, 390], [320, 568], [390, 844], [1280, 800], [1920, 1080], [2560, 1440], [3840, 2160]];

test("the curtain hangs from the top: short in the middle, long at the sides, the same on both sides", () => {
  for (const [vw, vh] of SIZES) {
    const L = curtainLayout(vw, vh);
    assert.ok(L.x0 >= 0 && L.x0 + L.width <= vw, `${vw}×${vh}: fits across the screen`);
    assert.ok(L.y0 <= 0, "hangs from the very top");
    assert.ok(L.cols >= 8 && L.rows >= 12, `${vw}×${vh}: enough strands (${L.cols}×${L.rows})`);
    const lens = Array.from({ length: L.cols }, (_, c) => strandRows(c, L.cols, L.rows));
    const mid = Math.floor((L.cols - 1) / 2);
    assert.ok(lens[0] >= L.rows - 1, "the outermost strands are full length");
    assert.ok(lens[mid] <= L.rows * 0.4, `the middle strands are short (${lens[mid]} of ${L.rows})`);
    for (let c = 0; c < L.cols; c++) assert.equal(lens[c], lens[L.cols - 1 - c], `col ${c} matches its mirror`);
    for (let c = 1; c <= mid; c++) assert.ok(lens[c] <= lens[c - 1], `shorter towards the middle (col ${c})`);
  }
});

test("each strand fades towards its end, but never disappears completely", () => {
  assert.equal(glyphAlpha(0, 20), 1);
  let prev = 1;
  for (let r = 0; r <= 20; r++) {
    const a = glyphAlpha(r, 20);
    assert.ok(a <= prev && a >= 0.25, `row ${r}: ${a.toFixed(2)}`);
    prev = a;
  }
  assert.ok(glyphAlpha(19, 20) < 0.4, "the last characters are faint");
});

test("lowering is slow and smooth on every screen: fades in, nine tenths in 1–2 s, no bounce past its length, ends within 3/4 of the screen", () => {
  assert.ok(FADE_MS >= 600 && FADE_MS <= 1500);
  assert.equal(curtainFade(0), 0);
  assert.equal(curtainFade(FADE_MS), 1);
  let prev = 0;
  for (let t = 16; t <= FADE_MS; t += 16) {
    const f = curtainFade(t);
    assert.ok(f >= prev && f - prev < 0.05, `fades in smoothly (${t} ms)`);
    prev = f;
  }
  // 每一種畫面大小都在 node 裡真的模擬一次（每步 1/60 秒）
  for (const [vw, vh] of SIZES) {
    const L = curtainLayout(vw, vh);
    const cloth = createCloth({ cols: L.cols, rows: L.rows, width: L.width, height: L.height });
    rollUp(cloth);
    const bottom = cloth.particles.filter((p) => p.row === L.rows - 1);
    const avg = () => bottom.reduce((s, p) => s + p.y, 0) / bottom.length;
    assert.ok(avg() < L.height * 0.15, "starts gathered at the top");
    let drop = { phase: "fall" };
    let reached = null;
    let most = 0;
    for (let f = 1; f <= 900; f++) {
      step(cloth, dropParams(drop, L.height));
      drop = dropNext(drop, avg(), L.height);
      most = Math.max(most, avg());
      if (reached === null && avg() >= L.height * 0.9) reached = f;
    }
    const rest = avg();
    const s = reached * (STEP_MS / 1000);
    assert.ok(reached !== null && s >= 1 && s <= 2, `${vw}×${vh}: nine tenths after ${s.toFixed(2)} s`);
    assert.ok(most - rest <= L.height * 0.02, `${vw}×${vh}: no bounce past its resting length (${(most / L.height).toFixed(3)} vs ${(rest / L.height).toFixed(3)})`);
    assert.ok(L.y0 + rest <= vh * 0.75, `${vw}×${vh}: the lowest characters end at ${((L.y0 + rest) / vh).toFixed(2)} of the screen`);
    assert.equal(drop, null, `${vw}×${vh}: the fall and the brake are over`);
  }
});

test("speed follows real time: 60, 120 and 144 Hz screens move the same; a long pause does not make it jump", () => {
  for (const hz of [30, 60, 120, 144]) {
    let carry = 0;
    let total = 0;
    for (let i = 0; i < hz; i++) {
      const out = stepsFor(1000 / hz, carry);
      carry = out.carry;
      total += out.steps;
    }
    assert.ok(Math.abs(total - 60) <= 1, `${hz} Hz: ${total} steps in one second`);
  }
  assert.ok(stepsFor(2000, 0).steps <= 4, "after the tab was hidden for 2 s: at most a few steps, no lurch");
  assert.ok(stepsFor(2000, 0).carry < STEP_MS, "and nothing left over to catch up later");
  assert.deepEqual(stepsFor(-5, 0), { steps: 0, carry: 0 }, "a frame time just before the start counts as no time");
  assert.match(view, /stepsFor\(/, "the page uses it");
});

test("it calms down: the breeze fades out 3 s after the last touch and the drawing stops; a touch wakes it", () => {
  assert.equal(breezeAt(0), 1);
  assert.equal(breezeAt(3000), 1, "3 s of gentle sway");
  assert.equal(breezeAt(5000), 0, "calm by 5 s (under WCAG's 5 s for moving things)");
  let prev = 1;
  for (let t = 3000; t <= 5000; t += 16) {
    const b = breezeAt(t);
    assert.ok(b <= prev && prev - b < 0.02, `fades smoothly (${t} ms)`);
    prev = b;
  }
  assert.match(view, /breezeAt\(/);
  assert.match(view, /addEventListener\("pointermove", \(e\) => \{[^}]*push\([^;]*;\s*wake\(\);\s*\}\);/, "moving the mouse or a finger wakes it");
  assert.match(view, /if \(!moving && breeze === 0 && !c\.drop && fade === 1\) \{\s*c\.asleep = true;\s*return;/, "stops redrawing only when still, faded in and done falling");
});

test("skip: one button first in the Tab order, Esc too; focus goes to the menu afterwards", () => {
  const skip = html.match(/<button[^>]*class="opening-skip"[^>]*>([^<]*)<\/button>/);
  assert.ok(skip, "a skip button");
  assert.equal(skip[1].trim(), "略過");
  assert.match(skip[0], /type="button"/);
  assert.match(skip[0], /aria-label="略過開場影片"/, "says what it skips");
  assert.match(skip[0], /aria-keyshortcuts="Escape"/);
  assert.ok(html.indexOf('class="opening-skip"') < html.indexOf('class="topbar"'), "first in the Tab order");
  assert.match(view, /if \(document\.activeElement === skipBtn\) document\.querySelector\("\.pill \.brand"\)\.focus\(\);/, "keyboard users land on the menu");
});

test("fonts: wait (up to 2 s) before drawing the characters; redraw if the font arrives later; load only what this page uses", () => {
  assert.match(view, /fontLoad\.then\(\(\) => \{\s*glyphs = new Map\(\);/, "redraws with the real font when it arrives");
  const lower = view.slice(view.indexOf("async function lowerCurtain"), view.indexOf("function hangCurtain"));
  assert.match(lower, /await fontsOrTimeout;[\s\S]*build\(true\)/, "every way into the curtain waits for the font first (up to 2 s)");
  assert.match(view, /setTimeout\(r, 2000\)/, "waits at most 2 s");
  const fonts = html.match(/fonts\.googleapis\.com\/css2\?([^"]*)"/)?.[1] ?? "";
  assert.match(fonts, /Noto\+Serif\+TC:wght@600;900/, "宋體 for the curtain (600) and the brand (900)");
  assert.match(fonts, /Noto\+Sans\+TC:wght@400/, "黑體 for the menu");
  assert.doesNotMatch(fonts, /Yuji|WenKai/, "nothing this page does not use");
});

test("resize: the canvas follows at once (no squashed characters); a curtain that is still lowering starts lowering again", () => {
  const resize = view.slice(view.indexOf('addEventListener("resize"'), view.indexOf("// 字型"));
  assert.match(resize, /^addEventListener\("resize", \(\) => \{\s*sizeCanvas\(\);/, "the canvas is resized straight away");
  assert.match(resize, /const lowering = curtain\.drop !== null;\s*build\(lowering\);/, "rebuilt rolled up if it was still lowering");
  assert.match(resize, /curtain\.drop = lowering \? \{ phase: "fall" \} : null;/);
});

test("touch: one finger parts the curtain, two fingers can still zoom", () => {
  assert.match(css, /\.opening\s*\{[^}]*touch-action:\s*none;\s*touch-action:\s*pinch-zoom/, "Safari (no pinch-zoom) keeps none");
});

test("reduced motion and no JavaScript: no video; the still", () => {
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)[\s\S]*\.opening-video[^{]*\{[^}]*display:\s*none/, "no video for reduced motion, even before the script runs");
  assert.match(css, /\.opening-still\s*\{[^}]*object-fit:\s*cover/, "the still fills the screen");
});

test("the menu is the same as on the other pages, and there is an h1 for screen readers", () => {
  const nav = html.match(/<nav class="pill"[\s\S]*?<\/nav>/)?.[0] ?? "";
  for (const href of ["about.html", "events.html", "services.html", "gallery.html"]) assert.match(nav, new RegExp(`href="${href}"`), href);
  assert.match(nav, /class="brand"[^>]*>慈惠道場</);
  assert.match(html, /<h1 class="sr-only">慈惠道場<\/h1>/);
  assert.match(html, /<script type="module" src="js\/opening-view.js"[^>]*><\/script>/);
  assert.match(html, /<link rel="stylesheet" href="pages.css" \/>[\s\S]*<link rel="stylesheet" href="new-home.css" \/>/, "shared menu styles, then this page's");
});
