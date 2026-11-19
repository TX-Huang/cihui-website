// 首頁的神話開場影片（opening-op3：稻田升進雲裡 → 雲霧散開、湖邊的道場門浮出來 → 鳳凰飛近、從右上角飛走 → 停在首頁的門）。
// 使用者 2026-11-18 選 A「接成一個連續的鏡頭」；2026-11-19 看過重拍的鳳凰：「可以，放進首頁」。
// 我說好的做法：影片放完會淡進真的首頁，然後光簾降下來；舊首頁（原本的開場）留在原本的網址，方便比較。
//
// 規格：
// 1. 原本的網址（index.html，沒有加東西）完全照舊：一樣是原本的開場（js/intro.js）。
//    新的開場在 index.html?opening=video（跟比較油畫版的 ?look=oil 一樣，用網址加參數）。
// 2. 什麼時候播影片：網址有 ?opening=video、這次造訪還沒看過、沒有要求減少動畫、不是直接連到其他神明（# 是空的或 #jinmu）。
//    其他情況：不播影片，也不播原本的開場，直接是首頁。
//    在畫面出來之前就決定（<head> 的小程式），所以不會先閃一下首頁或原本的開場；測試確認小程式跟 gateOpeningMode 算的一樣。
// 3. 影片：靜音、手機上不會跳成全螢幕、沒有聲音軌，鋪滿畫面。影片還沒載好時，墊著第一格的圖（先下載）。
//    用哪一支：跟 new-home 一樣照實際要的像素挑（720p 4 MB 以內、1080p 12 MB 以內；手機、省流量一律 720p）。
// 4. 影片 14.08 秒，鳳凰在 11.96 秒完全飛走，之後鏡頭停穩，最後一格就是首頁的門。
//    第 12.95 秒（已經是首頁的樣子）影片開始慢慢淡掉（1.1 秒，影片結束前淡完），露出底下真的首頁；這時光簾才從門楣垂下來，標題出來。
//    影片播完還沒淡（例如卡了一下）：播完就淡。
// 5. 「略過」按鈕、Esc、滾輪、滑一下：影片比較快淡掉（0.6 秒），一樣接到首頁、光簾降下。
// 6. 開始淡掉就算看過了（這次造訪不再播）。不能自動播放（手機省電模式）：直接切到首頁，算看過。
//    影片載入失敗：直接切到首頁，不算看過（重新整理會再試一次）。按上一頁回來（整頁被留著）：直接切到首頁。
// 7. 影片在最上層（蓋住選單和所有東西）；淡完以後整個拿掉，停止下載。播的時候網頁不能捲動。
// 8. 程式沒載到、或 8 秒內沒開始：不會卡在影片畫面，直接是首頁。
// 9. 2026-11-19 Codex 審查：
//    - 影片卡住（網路很差，既不出錯也不往前播）超過 6 秒：當成載入失敗，直接到首頁（不算看過）。
//    - 播的時候，影片底下的網頁用鍵盤、讀螢幕軟體都碰不到（inert），只剩「略過」；影片淡掉時才放開。
//    - 直接切到首頁（不能自動播放、載入失敗）時，先等首頁的字型和標題準備好（最多 2.6 秒），不會露出空空的首頁。
//    - 淡掉的那 1 秒網頁也還不能捲動（不然門會跟影片最後一格錯開）。
// 10. 2026-11-19 使用者：「晚一點才飛」。播過開場影片，首頁自己的丹鳳（js/goldlight.js）第一次飛過要等 20 秒
//     （平常是 2 秒），不會影片的鳳凰一飛走，馬上又來一隻。沒播影片時照舊 2 秒。
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, statSync, existsSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { pickVideo } from "../js/opening.js";

const read = (f) => readFileSync(new URL(`../${f}`, import.meta.url), "utf8");
const exists = (f) => existsSync(new URL(`../${f}`, import.meta.url));
const size = (f) => statSync(new URL(`../${f}`, import.meta.url)).size;
const load = async () => (exists("js/gate-opening.js") ? import("../js/gate-opening.js") : {});
const html = read("index.html");
const css = read("style.css");
const main = read("js/main.js");
const view = exists("js/gate-opening-view.js") ? read("js/gate-opening-view.js") : "";
const head = html.slice(0, html.indexOf("</head>"));
const inline = head.match(/<script>([\s\S]*?)<\/script>/)?.[1] ?? "";

test("1. the old homepage stays at its address; the new opening is index.html?opening=video", async () => {
  const { gateOpeningMode } = await load();
  assert.equal(typeof gateOpeningMode, "function");
  for (const hash of ["", "#jinmu", "#nezha"])
    for (const seen of [false, true])
      for (const reduceMotion of [false, true])
        assert.equal(gateOpeningMode({ param: null, seen, reduceMotion, hash }), null, "no ?opening: the old opening decides, as before");
  assert.match(html, /<div class="intro" id="intro"/, "the old opening is still there");
  assert.match(main, /IntroView\.create/, "and still used without ?opening=video");
});

test("2. when the video plays (and when the page just shows)", async () => {
  const { gateOpeningMode } = await load();
  const m = (o) => gateOpeningMode({ param: "video", seen: false, reduceMotion: false, hash: "", ...o });
  assert.equal(m({}), "video");
  assert.equal(m({ hash: "#" }), "video");
  assert.equal(m({ hash: "#jinmu" }), "video");
  assert.equal(m({ hash: "#nezha" }), "page", "linked straight to another deity");
  assert.equal(m({ seen: true }), "page", "seen this visit");
  assert.equal(m({ reduceMotion: true }), "page", "reduced motion");
  assert.equal(gateOpeningMode({ param: "other", seen: false, reduceMotion: false, hash: "" }), null, "unknown value: as before");
});

test("2. decided in <head> before the first paint, the same as gateOpeningMode", async () => {
  const { gateOpeningMode, GATE_SEEN_KEY, GATE_POSTER } = await load();
  assert.ok(GATE_SEEN_KEY && GATE_POSTER);
  const run = ({ search, hash, seen, reduce, blocked = false }) => {
    const classes = new Set();
    const root = { dataset: {}, classList: { add: (c) => classes.add(c), contains: (c) => classes.has(c) } };
    const appended = [];
    const ctx = {
      location: { search, hash },
      URLSearchParams,
      matchMedia: (q) => ({ matches: /reduce/.test(q) && reduce }),
      document: { documentElement: root, head: { appendChild: (el) => appended.push(el) }, createElement: () => ({}) },
      setTimeout() {}
    };
    if (blocked)
      Object.defineProperty(ctx, "sessionStorage", {
        get() {
          throw new Error("blocked");
        }
      });
    else ctx.sessionStorage = { getItem: (k) => (seen && (k === GATE_SEEN_KEY || k === "cihui-intro-seen") ? "1" : null) };
    runInNewContext(inline, ctx);
    return { root, classes, appended };
  };
  for (const search of ["", "?opening=video", "?opening=video&look=oil"])
    for (const hash of ["", "#jinmu", "#nezha"])
      for (const seen of [false, true])
        for (const reduce of [false, true]) {
          const { root, classes, appended } = run({ search, hash, seen, reduce });
          const want = gateOpeningMode({ param: new URLSearchParams(search).get("opening"), seen, reduceMotion: reduce, hash });
          const label = `${search} ${hash} seen ${seen} reduce ${reduce}`;
          assert.equal(root.dataset.opening, want === "video" ? "video" : undefined, label);
          if (want) assert.ok(classes.has("no-intro"), `${label}: the old opening never plays here`);
          if (want === "video") assert.ok(appended.some((l) => l.href === GATE_POSTER && l.rel === "preload"), `${label}: first frame fetched first`);
        }
  const { root } = run({ search: "?opening=video", hash: "", seen: false, reduce: false, blocked: true });
  assert.equal(root.dataset.opening, "video", "storage blocked: just play");
  assert.match(inline, /setTimeout\([\s\S]*gateOpeningReady[\s\S]*8000\)/, "8. a module that never starts: back to the page after 8 s");
});

test("3. the video files: muted, inline, no sound, small enough, picked by needed pixels", async () => {
  const { GATE_VIDEOS, GATE_POSTER } = await load();
  for (const f of [...Object.values(GATE_VIDEOS), GATE_POSTER]) {
    assert.match(f, /^assets\/opening\//);
    assert.ok(exists(f), `${f} exists`);
  }
  assert.ok(size(GATE_VIDEOS.big) <= 12 * 1024 * 1024, `1080p is ${(size(GATE_VIDEOS.big) / 1048576).toFixed(1)} MB`);
  assert.ok(size(GATE_VIDEOS.small) <= 4 * 1024 * 1024, `720p is ${(size(GATE_VIDEOS.small) / 1048576).toFixed(1)} MB`);
  for (const f of Object.values(GATE_VIDEOS)) {
    const box = readFileSync(new URL(`../${f}`, import.meta.url)).toString("latin1");
    assert.doesNotMatch(box, /hdlr[\s\S]{8}soun/, `${f}: no sound track`);
    assert.match(box, /hdlr[\s\S]{8}vide/, `${f}: has the picture`);
  }
  assert.equal(pickVideo({ w: 1920, h: 1080, videos: GATE_VIDEOS }), GATE_VIDEOS.big);
  assert.equal(pickVideo({ w: 390, h: 844, dpr: 3, videos: GATE_VIDEOS }), GATE_VIDEOS.small);
  assert.equal(pickVideo({ w: 1280, h: 800, videos: GATE_VIDEOS }), GATE_VIDEOS.small);
  const video = html.match(/<video[^>]*class="gate-opening-video"[^>]*>/)?.[0] ?? "";
  assert.ok(video, "the video is on the homepage");
  assert.match(video, /\bmuted\b/);
  assert.match(video, /\bplaysinline\b/);
  assert.match(video, /aria-hidden="true"/);
  assert.doesNotMatch(video, /\bautoplay\b|\bsrc=/, "the script picks the file");
  assert.match(css, new RegExp(`\\[data-opening="video"\\] \\.gate-opening\\s*\\{[^}]*url\\("${GATE_POSTER}"\\)`), "first frame underneath while loading");
});

test("4. timing: the phoenix is gone before the fade; the fade starts on the homepage frame", async () => {
  const { VIDEO_S, PHOENIX_GONE_S, REVEAL_AT_S, FADE_MS } = await load();
  assert.equal(VIDEO_S, 14.08);
  assert.equal(PHOENIX_GONE_S, 11.96);
  assert.ok(REVEAL_AT_S > PHOENIX_GONE_S + 0.9, "the camera has settled");
  assert.ok(REVEAL_AT_S + FADE_MS / 1000 <= VIDEO_S, "the fade is over before the video ends");
});

test("4-6. what happens when: a tiny state machine", async () => {
  const { gateOpeningStep, REVEAL_AT_S } = await load();
  const go = (s, ev, t) => gateOpeningStep(s, ev, t);
  for (const t of [0, 5, 11.96, REVEAL_AT_S - 0.01]) assert.deepEqual(go("playing", "time", t), { state: "playing", acts: [] }, `${t} s`);
  assert.deepEqual(go("playing", "time", REVEAL_AT_S), { state: "done", acts: ["fade", "remember"] });
  assert.deepEqual(go("playing", "ended"), { state: "done", acts: ["fade", "remember"] });
  assert.deepEqual(go("playing", "skip"), { state: "done", acts: ["fastFade", "remember"] });
  assert.deepEqual(go("playing", "refused"), { state: "done", acts: ["cut", "remember"] });
  assert.deepEqual(go("playing", "error"), { state: "done", acts: ["cut"] }, "not remembered: try again next time");
  assert.deepEqual(go("playing", "restored"), { state: "done", acts: ["cut", "remember"] });
  for (const ev of ["time", "ended", "skip", "refused", "error", "restored"]) assert.deepEqual(go("done", ev, 14), { state: "done", acts: [] }, `${ev} after done: nothing`);
});

test("5-7. the page: on top of everything, fades, skip, no scrolling, removed after", async () => {
  const { FADE_MS, SKIP_FADE_MS } = await load();
  assert.ok(FADE_MS >= 1000 && SKIP_FADE_MS < FADE_MS && SKIP_FADE_MS >= 400, "slow and smooth; skipping a bit quicker");
  const box = html.match(/<div class="gate-opening" id="gateOpening"[\s\S]*?<\/div>/)?.[0] ?? "";
  assert.ok(box, "the opening box is on the homepage");
  assert.match(box, /<button type="button" class="intro-skip gate-opening-skip"[^>]*>略過<\/button>/, "a skip button (same look as the old one)");
  assert.match(css, /\.gate-opening\s*\{[^}]*display:\s*none/, "hidden unless playing");
  assert.match(css, /\.gate-opening\s*\{[^}]*z-index:\s*(1\d\d|[2-9]\d\d)/, "above the menu and everything");
  assert.match(css, /\[data-opening="video"\] \.gate-opening\s*\{[^}]*display:\s*block/);
  assert.match(css, /\[data-opening="video"\],\s*\[data-opening="video"\] body\s*\{[^}]*overflow:\s*hidden/, "no scrolling while it plays");
  // 程式：用哪個開場、等影片淡掉才放珠簾
  assert.match(main, /dataset\.opening === "video"[\s\S]{0,200}GateOpeningView\.create/, "main.js picks the video opening");
  assert.match(main, /await intro\.revealed/, "the curtain waits for the reveal");
  assert.match(view, /gateOpeningStep/, "the view follows the state machine");
  assert.match(view, /addEventListener\("keydown"[\s\S]{0,120}Escape|Escape[\s\S]{0,120}skip/, "Esc skips");
  assert.match(view, /for \(const ev of \["wheel", "touchstart"\]\)/, "a wheel or swipe skips, like the old opening");
  assert.match(view, /removeAttribute\("src"\)[\s\S]{0,80}\.load\(\)/, "stops downloading");
  assert.match(view, /\.remove\(\)/, "the box is removed after the fade");
  assert.match(view, /root\.dataset\.gateOpeningReady = "1"/, "8. tells <head> it started");
  assert.match(view, /pageshow[\s\S]{0,80}persisted[\s\S]{0,40}restored/, "back button: straight to the page");
});

test("9. review fixes: stalls, inert page, wait for a ready page, no scrolling while fading", async () => {
  const { STALL_MS } = await load();
  assert.equal(STALL_MS, 6000, "a stalled video gives up after 6 s");
  assert.match(view, /STALL_MS[\s\S]{0,300}this\.send\("error"\)/, "a stall counts as a load error");
  assert.match(view, /inert = true/, "the page under the video is inert while playing");
  assert.match(view, /inert = false/, "and comes back when the video fades");
  assert.match(view, /pageReady/, "a cut waits for the page");
  assert.match(main, /intro\?\.pageReady\?\.\(\)/, "main.js says when the title and fonts are ready");
  assert.match(css, /\[data-opening="leaving"\],\s*\[data-opening="leaving"\] body,\s*\[data-opening="video"\],\s*\[data-opening="video"\] body\s*\{[^}]*overflow:\s*hidden/, "still no scrolling while fading");
});

test("10. after the video, the page's own phoenix waits 20 s before its first flight", async () => {
  const { createLight, stepLight, AFTER_VIDEO_WAIT } = await import("../js/goldlight.js");
  assert.equal(AFTER_VIDEO_WAIT, 20 * 60, "20 s (in 1/60 s steps)");
  const firstFlight = (opts) => {
    const s = createLight(opts);
    for (let i = 1; i < 60 * 60; i++) {
      stepLight(s, { active: true, random: () => 0 });
      if (s.flying) return i / 60;
    }
    return null;
  };
  assert.equal(firstFlight(), 2, "no video: as before, 2 s");
  assert.equal(firstFlight({ firstWait: AFTER_VIDEO_WAIT }), 20, "after the video: 20 s");
  assert.ok(main.includes("new GoldLightView(goldKit, { firstWait: videoOpening ? AFTER_VIDEO_WAIT : undefined })"), "main.js asks for the late first flight only after the video");
  assert.match(read("js/goldlight-view.js"), /constructor\(kit, \{ firstWait \} = \{\}\)[\s\S]{0,200}createLight\(\{ firstWait \}\)/, "the view passes it on");
});
