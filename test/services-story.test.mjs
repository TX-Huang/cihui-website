// 服務頁「故事版」（services-story.html，試做；舊的 services.html 先留著比較）。
// 使用者 2026-11-19：簡報的內容一段一段「說明」，不會讓人感動、想看下去；要往下滑像在聽一個故事、身歷其境。
// 使用者同意的故事稿（8 幕，主角是「你」）：先講他的心事、每一幕結尾留一個小問題、價錢變成「鬆一口氣」的那一刻。
//
// 規格：
// 1. 新的一頁 services-story.html：跟其他內頁同一條選單（「服務」標成現在這頁）、同一個頁尾；舊的 services.html 不動。
// 2. 最上面是標題卡（服務／從容修行的年度藍圖／往下滑聽故事），接著 8 幕，順序和每一句都照使用者同意的故事稿（下面的 SCRIPT）。
//    每一幕上面寫「第幾幕＋名字」。除了最後一幕，每一幕最後一句是「小問題」（hook，接到下一幕）。
// 3. 事實照道場的簡報、數字只從 js/blueprint.js 來：第三幕寫小燈、大燈的價錢；第四幕是祭改小問答（勾自己的情況、算合計）；
//    第八幕「核心只要 $1,900 起」的數字＝小燈＋祭改。還沒給的（蟠桃牌位的價錢、匯款帳號、聯絡方式）放進「待填」框。
// 4. 往下滑時畫面停在這一幕（sticky），字一句一句浮出來：剛進這一幕就有第一句，滑完這一幕最後一句已經出來；
//    已經出來的字不會再消失（往回滑才會收回去）。浮出來很慢很柔（至少 1 秒，優雅不躁動）。
// 5. 每一幕有自己的顏色（前三幕是黃昏到半夜的深色，第四幕起是天亮的淺色）。背景只在兩幕交接時才慢慢混過去
//    （交接＝前一幕放開、到下一幕停住，滑一個畫面高），一幕裡面不變色。字不會在混到一半的背景上：
//    這一幕的字在交接一半之前就淡掉，下一幕的字過了一半才淡入。每一幕字和背景的對比至少 4.5。
// 6. 畫面跟著每一幕的進度動：第三幕運勢線畫出來、燈亮起來；第五幕兩道光合起來（照舊頁的順序：名字先淡掉、合起來才出現「完整的能量防護」）；
//    第六幕桃樹浮出來；第七幕蓮花開；第八幕一年的線從元旦亮到歲末。
// 7. 沒有 JavaScript、或要求減少動畫：不停住、不藏字，整篇照順序直接看得到（像一般文章）。
//    看網頁中途才打開「減少動畫」：也變回一般文章。
// 8. 2026-11-19 Codex 審查：
//    a. 還沒浮出來的字只是透明，讀螢幕軟體還是唸得到（不用 visibility: hidden 藏）；
//       用鍵盤移到還沒浮出來的東西（例如祭改的勾選）時，畫面捲到那一幕整個出來的地方，看得到自己在哪裡；
//       正在用鍵盤操作的那一幕，交接時不淡掉。
//    b. 讀過的句子變淡，但跟背景的對比還是至少 4.5（每一幕都量，算混上背景以後的顏色）。
//    c. 選單「服務」指到這一頁自己。
//    d. 每一幕之間沒有多出來的空白（交接剛好一個畫面高）。
//    e. 畫面高只量一次（innerHeight），停住的畫面、每一幕多高、進度都用同一個數字（手機網址列縮放也一致）。
//    f. 這一幕的內容比畫面高（很矮的手機、放大字）：這一幕不停住，字直接全部看得到，照一般文章往下捲。
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { LAMPS, JIEGAI_BASE, JIEGAI_ADDONS, money, coreFrom, handoverPaths } from "../js/blueprint.js";
import { SCENES, sceneProgress, beatsShown, skyAt, textAlpha } from "../js/story.js";

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
  const nums = ["一", "二", "三", "四", "五", "六", "七", "八"];
  SCRIPT.forEach((want, i) => {
    const body = sceneOf(want.id);
    assert.ok(strip(body.match(/<p class="act">[\s\S]*?<\/p>/)?.[0] ?? "").startsWith(`第${nums[i]}幕`), `${want.id}: act number`);
    assert.ok(strip(body.match(/<p class="act">[\s\S]*?<\/p>/)?.[0] ?? "").includes(want.title), `${want.id}: act title`);
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

test("the lines come out one by one while the scene is held; already shown lines stay", () => {
  // 進度：這一幕停住的那一刻 = 0，放開的那一刻 = 1
  const vh = 800;
  assert.equal(sceneProgress(300, 3000, vh), 0, "not held yet");
  assert.equal(sceneProgress(0, 3000, vh), 0);
  assert.equal(sceneProgress(-1100, 3000, vh), 0.5);
  assert.equal(sceneProgress(-2200, 3000, vh), 1);
  assert.equal(sceneProgress(-5000, 3000, vh), 1, "already let go");
  for (const n of [1, 2, 4, 5]) {
    assert.equal(beatsShown(0, n), 1, `n=${n}: the first line is there as soon as the scene is held`);
    assert.equal(beatsShown(1, n), n, `n=${n}: all lines out by the end`);
    let last = 0;
    for (let p = 0; p <= 1.0001; p += 0.01) {
      const k = beatsShown(Math.min(p, 1), n);
      assert.ok(k >= last && k <= n && k >= 1, `n=${n}: never goes backwards while scrolling down (p=${p.toFixed(2)})`);
      last = k;
    }
  }
  // 每一句都有差不多一樣長的時間（最後一句出來以後，也留一段讓人讀完）
  assert.equal(beatsShown(0.49, 4), 2);
  assert.equal(beatsShown(0.5, 4), 3);
  assert.equal(beatsShown(0.74, 4), 3);
  assert.equal(beatsShown(0.75, 4), 4);
});

test("the background only blends during a handover, and text is never on a half-blended background", () => {
  const vh = 800;
  // 兩幕：第一幕 0～3000、第二幕 3000～5000（第一幕停住到 2200，交接是 2200～3000）
  const spans = [
    { top: 0, height: 3000 },
    { top: 3000, height: 2000 }
  ];
  assert.deepEqual(skyAt(-500, spans, vh), { a: 0, b: 0, w: 0 }, "above the first scene");
  assert.deepEqual(skyAt(1000, spans, vh), { a: 0, b: 0, w: 0 }, "inside a scene: no blending");
  assert.deepEqual(skyAt(2200, spans, vh), { a: 0, b: 0, w: 0 });
  const mid = skyAt(2600, spans, vh);
  assert.equal(mid.a, 0);
  assert.equal(mid.b, 1);
  assert.ok(Math.abs(mid.w - 0.5) < 1e-9, "half way through the handover");
  assert.ok(skyAt(2300, spans, vh).w < 0.1, "starts gently");
  assert.deepEqual(skyAt(3000, spans, vh), { a: 1, b: 1, w: 0 }, "next scene held: fully its colour");
  assert.deepEqual(skyAt(9000, spans, vh), { a: 1, b: 1, w: 0 }, "past the end");

  // 字：停住時全亮；交接一半之前（這一幕）已經淡掉、一半之後（下一幕）才出來
  assert.equal(textAlpha(0, 3000, vh), 1, "held: fully visible");
  assert.equal(textAlpha(-1000, 3000, vh), 1);
  assert.equal(textAlpha(-2600, 3000, vh), 0, "outgoing scene gone by mid-handover (its bottom at half the screen)");
  assert.ok(textAlpha(-2300, 3000, vh) > 0.5, "fades out gently, not at once");
  assert.equal(textAlpha(400, 2000, vh), 0, "incoming scene not there before mid-handover");
  assert.ok(textAlpha(100, 2000, vh) > 0.5 && textAlpha(100, 2000, vh) < 1, "fades in gently");
});

test("motion is slow and soft; without JavaScript or with reduced motion it reads as a normal article", () => {
  // 藏字、停住都只在 .story.is-live 底下（JavaScript 確定可以做的時候才加）
  const hidden = [...css.matchAll(/([^{}]+)\{[^}]*opacity:\s*0[;\s]/g)].map((m) => m[1].trim());
  assert.ok(hidden.length > 0, "something is hidden before it comes out");
  for (const sel of hidden) assert.match(sel, /\.is-live/, `hidden only when live: ${sel}`);
  const sticky = [...css.matchAll(/([^{}]+)\{[^}]*position:\s*sticky/g)].map((m) => m[1].trim());
  assert.ok(sticky.length > 0, "the scene is held while scrolling");
  for (const sel of sticky) assert.match(sel, /\.is-live/, `held only when live: ${sel}`);
  // 字浮出來至少 1 秒
  const beat = css.match(/\.is-live \.beat\s*\{[^}]*\}/)?.[0] ?? "";
  const secs = [...beat.matchAll(/(\d+(?:\.\d+)?)(ms|s)\b/g)].map((m) => (m[2] === "ms" ? Number(m[1]) / 1000 : Number(m[1])));
  assert.ok(secs.length && Math.min(...secs.filter((s) => s > 0)) >= 1, `beats come out slowly (${secs})`);
  const view = read("js/story-view.js");
  assert.match(view, /prefers-reduced-motion: reduce/);
  assert.match(view, /if \(reduce[^)]*\) return/, "reduced motion: stays a normal article");
  assert.match(view, /classList\.add\("is-live"\)/);
});

test("review fixes: screen readers, keyboard, readable past lines, no gaps, one screen height, tall scenes", () => {
  const view = read("js/story-view.js");
  // a. 還沒浮出來的只是透明（讀螢幕軟體唸得到）；鍵盤移進去會捲到看得到的地方；正在操作的那一幕不淡掉
  assert.doesNotMatch(css, /visibility:\s*hidden/, "nothing is hidden from screen readers");
  assert.match(view, /addEventListener\("focusin"/, "keyboard focus brings the scene into view");
  assert.match(view, /contains\(document\.activeElement\)/, "the scene you are working in does not fade");
  // b. 讀過的句子：混上背景以後對比還是至少 4.5
  const past = css.match(/\.story\.is-live \.line\.is-out\.is-past\s*\{[^}]*opacity:\s*([\d.]+)/);
  assert.ok(past, "past lines are dimmed by opacity");
  const a = Number(past[1]);
  const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  const lumOf = (c) => {
    const l = c.map((v) => v / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
    return 0.2126 * l[0] + 0.7152 * l[1] + 0.0722 * l[2];
  };
  for (const s of SCENES) {
    const ink = rgb(s.ink);
    const bg = rgb(s.bg);
    const seen = ink.map((v, i) => a * v + (1 - a) * bg[i]);
    const [x, y] = [lumOf(seen), lumOf(bg)].sort((p, q) => q - p);
    assert.ok((x + 0.05) / (y + 0.05) >= 4.5, `${s.id}: a past line is still readable (${((x + 0.05) / (y + 0.05)).toFixed(2)})`);
  }
  // d. 每一幕之間沒有多出來的空白
  assert.match(css.match(/\.story\.is-live \.scene\s*\{[^}]*\}/)?.[0] ?? "", /margin:\s*0/, "no gap between live scenes");
  // e. 畫面高只量一次：CSS 用 JavaScript 量好的 --stage-h
  assert.match(css.match(/\.story\.is-live \.scene\s*\{[^}]*\}/)?.[0] ?? "", /var\(--stage-h/, "scene height from the measured screen height");
  assert.match(css.match(/\.story\.is-live \.stage\s*\{[^}]*\}/)?.[0] ?? "", /height:\s*var\(--stage-h/, "held stage uses the measured screen height");
  assert.match(view, /setProperty\("--stage-h"/);
  // f. 內容比畫面高的幕不停住、字全部看得到
  assert.match(css, /\.story\.is-live \.scene\.is-tall \.stage\s*\{[^}]*position:\s*static/, "a too-tall scene is not held");
  assert.match(css, /\.story\.is-live \.scene\.is-tall \.beat\s*\{[^}]*opacity:\s*1/, "a too-tall scene shows every line");
  assert.match(view, /classList\.toggle\("is-tall"/);
  // 7. 中途打開「減少動畫」：變回一般文章
  assert.match(view, /addEventListener\("change"/, "reacts when reduced motion is switched on later");
});
