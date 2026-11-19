// 服務頁「故事版」（services-story.html，試做；舊的 services.html 先留著比較）。
// 使用者 2026-11-19：簡報的內容一段一段「說明」，不會讓人感動、想看下去；要往下滑像在聽一個故事、身歷其境。
// 使用者同意的故事稿（8 幕，主角是「你」）：先講他的心事、每一幕結尾留一個小問題、價錢變成「鬆一口氣」的那一刻。
//
// 規格：
// 1. 新的一頁 services-story.html：跟其他內頁同一條選單（「服務」指到這一頁自己）、同一個頁尾；舊的 services.html 不動。
// 2. 最上面是標題卡（服務／從容修行的年度藍圖／往下滑聽故事），接著 8 幕，順序和每一句都照使用者同意的故事稿（下面的 SCRIPT）。
//    每一幕上面只寫這一幕的名字（2026-11-19 使用者：「第幾幕」的字樣拿掉）。除了最後一幕，每一幕最後一句是「小問題」（hook，接到下一幕）。
// 3. 事實照道場的簡報、數字只從 js/blueprint.js 來：第三幕寫小燈、大燈的價錢；第四幕是祭改小問答（勾自己的情況、算合計）；
//    第八幕「核心只要 $1,900 起」的數字＝小燈＋祭改。還沒給的（蟠桃牌位的價錢、匯款帳號、聯絡方式）放進「待填」框。
// 4. 2026-11-19 使用者：「正常人不會一直一直滾，這樣動畫會卡在中間」→ 動畫不跟著捲軸走，捲到哪一幕，那一幕就自己播完：
//    畫面中間落在哪一幕，那一幕就是「現在這一幕」。第一句馬上出來，後面照閱讀速度一句一句出來
//    （一句至少 1.5 秒、最多 3.5 秒，字多的久一點），不用一直捲。播過的幕捲回來就是播完的樣子。浮出來很慢很柔（至少 1 秒）。
// 5. 每一幕有自己的顏色（前三幕黃昏到半夜的深色，第四幕起天亮的淺色）。背景＝現在這一幕的顏色，換幕時自己慢慢轉過去（至少 1 秒），
//    不會停在半深半淺。不是現在這一幕的字淡掉（換幕時舊的淡出、新的淡入），所以字不會在不對的背景上。每一幕字和背景的對比至少 4.5。
// 6. 每一幕的畫面跟著播到第幾句自己動完（不跟捲軸）：第二幕說到「兩件事」時兩團光出來；第三幕說到運勢往下往上時運勢線畫出來、
//    說到「點燈」時燈亮；第五幕兩道光合起來（名字先淡掉、合起來才出現「完整的能量防護」）；第六幕桃樹浮出來；第七幕蓮花開；
//    第八幕一年的線從元旦亮到歲末。
// 7. 沒有 JavaScript、或要求減少動畫：不藏字，整篇照順序直接看得到（像一般文章）。看網頁中途才打開「減少動畫」：也變回一般文章。
// 8. 2026-11-19 Codex 審查（照新的做法保留下來的）：
//    a. 還沒出來的字只是透明，讀螢幕軟體還是唸得到（不用 visibility: hidden 藏）；用鍵盤移到還沒出來的東西（例如祭改的勾選）時，
//       那一幕直接整個出來。
//    b. 讀過的句子變淡，但跟背景的對比還是至少 4.5（每一幕都量，算混上背景以後的顏色）。
//    c. 每一幕至少一個畫面高、內容在中間；內容比畫面高（很矮的手機、放大字）就自己變高，不會被切掉。幕之間沒有多出來的空白。
//       不用 sticky，所以手機網址列縮放也不會讓頁面跳。
// 9. 2026-11-19 Codex 第二次審查：
//    a. 這一幕的字真的進到畫面（字的上緣在畫面八成以上）才開始播，不會在還看不到的時候就播掉。
//    b. 深色換淺色時：舊的字很快淡掉，新的字等背景轉得差不多（約 0.8 秒後）才淡入，不會疊在轉到一半的背景上。
//    c. 用鍵盤移到某一幕裡的東西：那個東西捲到畫面中間（那一幕變成現在這一幕），整幕直接出來，看得到自己在哪裡。
//    d. 播到一半就捲走：那一幕直接播完（捲回來是播完的樣子，不會停在一半）。
//    e. 讀過的句子變淡以後，裡面金色的字（$1,900）對比也至少 4.5。
//    f. 列印：每一幕的圖都是播完的樣子。
//    g. 每一幕的名字是標題（h2），讀螢幕軟體可以一幕一幕跳。
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { LAMPS, JIEGAI_BASE, JIEGAI_ADDONS, money, coreFrom, handoverPaths } from "../js/blueprint.js";
import { SCENES, activeScene, readMs, beatTimes, stepAt } from "../js/story.js";

const read = (f) => readFileSync(new URL(`../${f}`, import.meta.url), "utf8");
const html = read("services-story.html");
const css = read("story.css");
const strip = (s) => s.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();

// 使用者同意的故事稿（2026-11-19）
const SCRIPT = [
  { id: "burden", title: "重擔", lines: ["這一年，你是不是也累了？", "工作、家人、錢……每一件都要你扛。", "想求個平安，又擔心花費一年比一年多。"], hook: "母娘都知道。" },
  { id: "promise", title: "母娘的承諾", lines: ["母娘說：來到這裡，不該再多一份重擔。", "所以一整年，道場只請你準備兩件事。", "其他的日子，沒有額外的費用。"], hook: "第一件事，從一年的第一個晚上開始。" },
  {
    id: "yuandan",
    title: "元旦・一盞燈",
    lines: ["十二月三十一日，午夜。", "舊的一年，運氣慢慢往下走；新的一年，正要往上爬。", "就在兩條線交會的那一刻，母娘交代：點燈。", "這盞燈照你的流年點，只屬於你。"],
    hook: "燈亮了。可是今年，你還想求什麼？"
  },
  { id: "xinchun", title: "新春・許願", lines: ["過年了，每個人心裡都有一個願望。"], hook: "一盞燈、一次祭改。兩道光合在一起，會怎樣？" },
  { id: "merge", title: "合在一起", lines: ["兩道光合起來，就是你一整年的護持。", "從此，師姐和道場可以一直看顧著你。", "少了一道，光就不完整。"], hook: "日子一天天過去。到了八月……" },
  {
    id: "bayue",
    title: "八月・蟠桃",
    lines: ["桃子熟了。", "這一年你被照顧著。那些照顧過你的人呢？", "歷代祖先，還有曾經和你結下恩怨的人，也替他們留一個位子。", "想來就來，價錢清清楚楚。"],
    hook: "然後，是一年最熱鬧的日子。"
  },
  { id: "home", title: "回娘家", lines: ["母娘的生日，也是道場的生日。", "這一天不談錢，只談回家。", "祝壽金照你的心意，多少都好。"], hook: "一年，就快走完了。" },
  { id: "yearend", title: "歲末", lines: ["回頭看，這一年的路，一站一站都亮著。", `核心只要 ${money(coreFrom())} 起。`, "從容地過，不用擔心。", "道場，一直都在。"], hook: null }
];

const scenes = [...html.matchAll(/<section class="scene"[^>]*data-scene="([a-z]+)"[^>]*>([\s\S]*?)<\/section>/g)].map((m) => ({ id: m[1], body: m[2] }));
const sceneOf = (id) => scenes.find((s) => s.id === id)?.body ?? "";

test("a new trial page with the same menu and footer; the old services page is left alone", () => {
  assert.match(html, /<html lang="zh-Hant">/);
  assert.match(html, /name="viewport"/);
  assert.match(html, /<title>服務 — 慈惠道場<\/title>/);
  assert.match(html, /<link rel="stylesheet" href="pages.css"/);
  assert.match(html, /<link rel="stylesheet" href="story.css"/);
  const nav = html.match(/<nav class="pill"[\s\S]*?<\/nav>/)?.[0] ?? "";
  assert.ok(nav.includes('<a href="services-story.html" aria-current="page">服務</a>'), "服務 is this page itself");
  for (const l of ["關於道場", "法會活動", "相簿"]) assert.ok(nav.includes(`>${l}</a>`), l);
  assert.match(html, /崇羲篆體/, "same footer credit as the other inner pages");
  assert.match(html, /<script type="module" src="js\/story-view.js"><\/script>/);
  assert.match(read("services.html"), /<script type="module" src="js\/blueprint-view.js"><\/script>/, "old page untouched");
});

test("a title card first, then the eight scenes in the agreed order, every line word for word", () => {
  const card = html.match(/<header class="story-card"[\s\S]*?<\/header>/)?.[0] ?? "";
  assert.match(card, /<h1>服務<\/h1>/);
  assert.match(card, /從容修行的年度藍圖/);
  assert.match(card, /往下滑/);
  assert.ok(html.indexOf("story-card") < html.indexOf('class="scene"'), "title card comes first");
  assert.deepEqual(
    scenes.map((s) => s.id),
    SCRIPT.map((s) => s.id)
  );
  SCRIPT.forEach((want) => {
    const body = sceneOf(want.id);
    assert.equal(strip(body.match(/<h2 class="act">[\s\S]*?<\/h2>/)?.[0] ?? ""), want.title, `${want.id}: only the scene name (a heading), no 第幾幕`);
    const lines = [...body.matchAll(/<p class="beat line( hook)?">([\s\S]*?)<\/p>/g)];
    const expected = want.hook ? [...want.lines, want.hook] : want.lines;
    assert.deepEqual(
      lines.map((m) => strip(m[2])),
      expected,
      `${want.id}: the lines`
    );
    const hooks = lines.filter((m) => m[1]);
    if (want.hook) {
      assert.equal(hooks.length, 1, `${want.id}: one hook`);
      assert.ok(lines[lines.length - 1][1], `${want.id}: the hook is the last line`);
    } else assert.equal(hooks.length, 0, `${want.id}: the last scene has no hook`);
  });
});

test("facts and prices come from js/blueprint.js; what the temple has not given yet is in 待填 boxes", () => {
  const yuandan = sceneOf("yuandan");
  for (const l of LAMPS) assert.match(strip(yuandan), new RegExp(`${l.name}\\s*\\${money(l.price)}`), `lamp ${l.name}`);
  const { old, fresh, dotY } = handoverPaths();
  assert.ok(yuandan.includes(`d="${old}"`) && yuandan.includes(`d="${fresh}"`) && yuandan.includes(`cy="${dotY}"`), "the fortune curve is the real one");

  const quiz = sceneOf("xinchun");
  assert.match(quiz, /<form class="[^"]*\bquiz\b[^"]*" id="quiz">/);
  assert.match(strip(quiz), new RegExp(`${JIEGAI_BASE.name}\\s*\\${money(JIEGAI_BASE.price)}`));
  for (const a of JIEGAI_ADDONS) {
    assert.match(quiz, new RegExp(`value="${a.id}"`), a.id);
    assert.ok(strip(quiz).includes(a.who) && strip(quiz).includes(a.name) && strip(quiz).includes(money(a.price)), a.name);
  }
  assert.match(quiz, /id="quizTotal"/);

  assert.ok(strip(sceneOf("yearend")).includes(`核心只要 ${money(coreFrom())} 起`), "$1,900 = small lamp + 祭改");
  assert.equal(coreFrom(), 1900);
  for (const [id, what] of [
    ["bayue", "牌位的價錢"],
    ["home", "匯款的帳號"],
    ["yearend", "聯絡"]
  ])
    assert.match(sceneOf(id), new RegExp(`<div class="beat panel todo"><span class="todo-tag">待填</span>[^<]*${what}`), `${id}: 待填 ${what}`);
});

test("every scene has its own colours, dark from dusk to midnight then light from new year; text always readable", () => {
  assert.deepEqual(
    SCENES.map((s) => s.id),
    SCRIPT.map((s) => s.id)
  );
  const lum = (hex) => {
    const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  };
  const contrast = (a, b) => {
    const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
    return (x + 0.05) / (y + 0.05);
  };
  SCENES.forEach((s, i) => {
    assert.ok(contrast(s.ink, s.bg) >= 4.5, `${s.id}: ink on background ${contrast(s.ink, s.bg).toFixed(2)}`);
    assert.ok(contrast(s.hook, s.bg) >= 4.5, `${s.id}: hook colour on background ${contrast(s.hook, s.bg).toFixed(2)}`);
    const dark = lum(s.bg) < 0.1;
    assert.equal(dark, i < 3, `${s.id}: ${i < 3 ? "dark (dusk → midnight)" : "light (new year on)"}`);
  });
  for (const s of SCENES) assert.match(sceneOf(s.id), /./, `${s.id} is on the page`);
});

test("the scene in the middle of the screen is the current one", () => {
  // 兩幕：第一幕 1000～3000、第二幕 3000～4000（畫面中間的位置 → 哪一幕）
  const spans = [
    { top: 1000, height: 2000 },
    { top: 3000, height: 1000 }
  ];
  assert.equal(activeScene(400, spans), -1, "still on the title card");
  assert.equal(activeScene(1000, spans), 0);
  assert.equal(activeScene(2999, spans), 0);
  assert.equal(activeScene(3000, spans), 1);
  assert.equal(activeScene(9000, spans), 1, "past the end: still the last scene");
  assert.equal(activeScene(3500, [{ top: 1000, height: 2000 }, { top: 4000, height: 1000 }]), 0, "in a gap: the one above");
});

test("once a scene is current it plays by itself, one line at a time at reading pace", () => {
  // 一句停多久：至少 1.5 秒、最多 3.5 秒，字多的久一點
  assert.equal(readMs(""), 1500);
  assert.equal(readMs("桃子熟了。"), 1500);
  const mid = readMs("這一年你被照顧著。那些照顧過你的人呢？");
  assert.ok(mid > 1500 && mid < 3500, `a normal line (${mid})`);
  assert.equal(readMs("字".repeat(80)), 3500);
  assert.ok(readMs("字".repeat(20)) > readMs("字".repeat(10)), "longer lines stay longer");
  // 每一句什麼時候出來：第一句馬上（不到半秒），後面一句接一句
  const texts = ["十二月三十一日，午夜。", "舊的一年，運氣慢慢往下走；新的一年，正要往上爬。", "就在兩條線交會的那一刻，母娘交代：點燈。"];
  const at = beatTimes(texts);
  assert.equal(at.length, 3);
  assert.ok(at[0] <= 500, "the first line right away");
  assert.equal(at[1] - at[0], readMs(texts[0]));
  assert.equal(at[2] - at[1], readMs(texts[1]));
  // 播了 ms 毫秒時出來了幾句
  assert.equal(stepAt(0, at), 0);
  assert.equal(stepAt(at[0], at), 1);
  assert.equal(stepAt(at[1] - 1, at), 1);
  assert.equal(stepAt(at[2], at), 3);
  assert.equal(stepAt(1e9, at), 3, "never more than all of them");
});

test("motion is slow and soft and never follows the scroll bar; no JavaScript or reduced motion reads as an article", () => {
  const secs = (block) => [...block.matchAll(/(\d+(?:\.\d+)?)(ms|s)\b/g)].map((m) => (m[2] === "ms" ? Number(m[1]) / 1000 : Number(m[1]))).filter((v) => v > 0);
  // 藏起來（透明）只在 .is-live 底下
  const hidden = [...css.matchAll(/([^{}]+)\{[^}]*opacity:\s*0[;\s]/g)].map((m) => m[1].trim());
  assert.ok(hidden.length > 0, "something waits to come out");
  for (const sel of hidden) assert.match(sel, /\.is-live/, `hidden only when live: ${sel}`);
  assert.doesNotMatch(css, /position:\s*sticky/, "nothing is held to the scroll bar");
  // 一句浮出來、背景換色、整幕淡入淡出：都至少 1 秒
  const beat = css.match(/\.story\.is-live \.beat\s*\{[^}]*\}/)?.[0] ?? "";
  assert.ok(secs(beat).length && Math.min(...secs(beat)) >= 1, `lines come out slowly (${secs(beat)})`);
  const sky = css.match(/\.story\.is-live\s*\{[^}]*\}/)?.[0] ?? "";
  assert.match(sky, /transition:[^;]*background-color/, "the background turns by itself");
  assert.ok(secs(sky).length && Math.min(...secs(sky)) >= 1, `the background turns slowly (${secs(sky)})`);
  const words = css.match(/\.story\.is-live \.words\s*\{[^}]*\}/)?.[0] ?? "";
  assert.ok(secs(words).length && Math.min(...secs(words)) >= 1, `scenes fade in and out slowly (${secs(words)})`);
  assert.match(css, /\.story\.is-live \.scene:not\(\.is-current\) \.words\s*\{[^}]*opacity:\s*0/, "only the current scene's words show");
  // 畫面跟著播到第幾句動（at-N = 已經出來 N 句）
  for (const [scene, n, what] of [
    ["promise", 2, ".orb"],
    ["yuandan", 2, ".handover path"],
    ["yuandan", 3, ".lamp-light"],
    ["bayue", 1, ".art-peach"]
  ])
    assert.ok(css.includes(`.scene[data-scene="${scene}"].at-${n} ${what}`), `${scene}: ${what} moves when line ${n} is out`);
  const view = read("js/story-view.js");
  assert.doesNotMatch(view, /sceneProgress|getPropertyValue\("--p"\)/, "nothing is driven by the scroll position");
  assert.match(view, /beatTimes\(/, "lines follow the reading-pace timeline");
  for (const id of ["merge", "home", "yearend"]) assert.match(view, new RegExp(`${id}: `), `${id}: its art plays by itself`);
  assert.match(view, /prefers-reduced-motion: reduce/);
  assert.match(view, /if \(reduce[^)]*\) return/, "reduced motion: stays a normal article");
  assert.match(view, /addEventListener\("change"/, "reacts when reduced motion is switched on later");
  assert.match(view, /classList\.add\("is-live"\)/);
});

test("review fixes kept: screen readers, keyboard, readable past lines, scenes at least a screen tall", () => {
  const view = read("js/story-view.js");
  assert.doesNotMatch(css, /visibility:\s*hidden/, "nothing is hidden from screen readers");
  assert.match(view, /addEventListener\("focusin"/, "keyboard focus shows the whole scene");
  const past = css.match(/\.story\.is-live \.line\.is-out\.is-past\s*\{[^}]*opacity:\s*([\d.]+)/);
  assert.ok(past, "past lines are dimmed by opacity");
  const a = Number(past[1]);
  const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  const lumOf = (c) => {
    const l = c.map((v) => v / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
    return 0.2126 * l[0] + 0.7152 * l[1] + 0.0722 * l[2];
  };
  for (const sc of SCENES)
    for (const [what, hex] of [
      ["ink", sc.ink],
      ["gold", sc.hook]
    ]) {
      const ink = rgb(hex);
      const bg = rgb(sc.bg);
      const seen = ink.map((v, i) => a * v + (1 - a) * bg[i]);
      const [x, y] = [lumOf(seen), lumOf(bg)].sort((p, q) => q - p);
      assert.ok((x + 0.05) / (y + 0.05) >= 4.5, `${sc.id}: a past line (${what}) is still readable (${((x + 0.05) / (y + 0.05)).toFixed(2)})`);
    }
  const live = css.match(/\.story\.is-live \.scene\s*\{[^}]*\}/)?.[0] ?? "";
  assert.match(live, /min-height:\s*100svh/, "every scene at least one screen tall (grows if its content is taller)");
  assert.match(live, /margin:\s*0/, "no gap between scenes");
});

test("second review: start when the words are in view, clean dark-to-light handover, keyboard, finish on leaving, print", () => {
  const view = read("js/story-view.js");
  // a. 字進到畫面才開始播
  assert.match(view, /words\.getBoundingClientRect\(\)\.top < innerHeight \* 0\.8/, "playback waits until the words are on screen");
  // b. 新的字等背景轉得差不多才淡入；舊的字很快淡掉
  const secs = (block) => [...block.matchAll(/(\d+(?:\.\d+)?)(ms|s)\b/g)].map((m) => (m[2] === "ms" ? Number(m[1]) / 1000 : Number(m[1])));
  const incoming = css.match(/\.story\.is-live \.scene\.is-current \.words\s*\{[^}]*\}/)?.[0] ?? "";
  assert.match(incoming, /transition-delay/, "new words wait for the background");
  assert.ok(Math.max(...secs(incoming)) >= 0.6, `waits long enough (${secs(incoming)})`);
  const outgoing = css.match(/\.story\.is-live \.scene:not\(\.is-current\) \.words\s*\{[^}]*\}/)?.[0] ?? "";
  assert.ok(secs(outgoing).length && Math.max(...secs(outgoing)) <= 0.8, `old words leave quickly (${secs(outgoing)})`);
  // c. 鍵盤：捲到畫面中間
  assert.match(view, /scrollIntoView\(\{ block: "center"/, "focused control comes to the middle of the screen");
  // d. 捲走就播完
  assert.match(view, /finishScene\(/, "a scene left half-way is finished");
  // f. 列印：圖都是播完的樣子
  const print = css.slice(css.indexOf("@media print"));
  for (const sel of [".orb", ".lamp-light", ".art-peach", ".handover path"]) assert.ok(print.includes(sel), `print shows ${sel} finished`);
  assert.match(print, /stroke-dashoffset:\s*0 !important/);
  // 一打開網頁還在標題卡上：沒有「上一幕」可以播完（不會出錯）；萬一出錯，拿掉 is-live，字不會全部藏著出不來
  assert.match(view, /let current = -1;/, "starts on the title card, not on a scene");
  assert.match(view, /classList\.remove\("is-live"\)/, "an error never leaves the words hidden");
});
