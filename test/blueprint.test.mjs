// 服務頁＝「從容修行的年度藍圖」（素材：assets/raw/LINE_NOTE_261115_1～10.jpg，道場的簡報）。
// 使用者 2026-11-15 選了「一年的旅程」：從上往下捲，就是從元旦走到年底。
//
// 規格：
// 1. 順序：理念 → 三層護持 → 元旦・光明燈 → 新春・祭改 → 核心交集（兩團光合在一起） → 農曆八月・蟠桃盛會 → 不定期・母娘聖誕與週年慶 → 全年平安藍圖 →
//    預約與聯絡（還沒給，維持「待填」）
// 2. 價錢只寫在 js/blueprint.js 一個地方，跟簡報一樣：
//    小燈 $1,200、大燈 $3,600；祭改 $700，加選 祈還福 $800、補運 $300、補家運 $300、補考運 $300、補財庫 $1,100。
//    網頁上直接寫出來（沒有 JavaScript 也看得到），而且要跟 js/blueprint.js 一致
// 3. 祭改小問答：勾自己的情況，對應的加選項目亮起來；基本的祭改一定有；下面寫合計。
//    什麼都不勾＝$700；勾「學子」和「從商」＝ 祭改＋補考運＋補財庫＝$2,100
// 4. 旁邊有一條「一年」細線，標著元旦、新春、八月、不定期；捲到哪一站亮到哪一站。
//    背景顏色跟著季節慢慢換（兩站之間平滑地混，不會一下切過去）
// 5. 三層護持：中間是核心項目、中圈是自由參加、外圈是隨喜功德（說明一直都看得到）。
//    2026-11-16 使用者：不要提示字（「從核心防護到隨喜感恩。點一圈…」整行拿掉）；
//    滑鼠移到哪一圈，那一圈亮，右邊那一列的字也一起亮；滑鼠移到右邊那一列也一樣。
//    移開後留在最後亮的那一層（滑過中間的空隙不會閃回去）。
//    手機沒有滑鼠：點一下也會亮；鍵盤移到名字上也會亮
// 6. 光明燈：一張運勢線的圖，舊年運勢線往下、新年運勢線往上，在元旦交會（新年那條是金色）。
//    2026-11-16 使用者：「點燈看看」的小動畫差別太小，拿掉（按鈕、那團燈光、「示意」的說明都拿掉）
// 7. 核心交集：光明燈（金）和祭改（粉）兩團光。2026-11-16 使用者：要做成動畫，「完整的防護」不能跟後面的字疊在一起（很亂）。
//    捲到這一段時自動播（約 3.5 秒）：兩團光從分開慢慢合成一團 →
//    「光明燈」「新春祭改」兩個字在兩團光碰到之前就淡掉 → 合起來以後「完整的能量防護」才慢慢出現。
//    兩組字任何時候都不會同時看得到。沒有 JavaScript、或要求減少動畫：直接是合起來的樣子。
//    2026-11-16 使用者：可以重複播放 → 每次捲回這一段就從頭播（先完全離開畫面、再大半進到畫面）。
//    回到開頭只在完全看不到的時候發生（不會在眼前跳回去）。
//    2026-11-16 使用者：要循環播放 → 在畫面裡就一直循環：合起來 → 停一下 → 慢慢倒著分開
//    （先淡掉「完整的能量防護」，兩團光分開後名字才出現）→ 停一下 → 再合起來。整圈都很順，沒有跳回去的地方
// 11. 全年平安藍圖（2026-11-16 使用者選 A「一年的線」）：一條從元旦到歲末的線，四站放在真的時間上
//     （元旦在最左、新春離它不遠、農曆八月約在七成的地方）。「不定期」不是一個點，是沿著整年的一條淡粉帶子（隨時都能回娘家）。
//     顏色照三層護持：核心（元旦、新春）實心金點、自由（八月）空心金圈、隨喜（不定期）淡粉帶子。
//     捲到這裡（大半看得到、停 0.3 秒）時，光從元旦慢慢走到歲末（約 3 秒）；光走到哪一站，那一站才亮。
//     每次捲回來都從頭走一次（完全看不到時才回到開頭，跟核心交集一樣）。沒有 JavaScript、或要求減少動畫：整條直接是亮的。
//     點任何一站，慢慢捲回上面那一段。「祭改與祈福模組」改成「祭改與祈福」（「模組」像電腦用語）。
//     加一句：核心只要小燈 $1,200 ＋ 祭改 $700，一年 $1,900 起（數字跟 js/blueprint.js 一樣）。
//     手機上字不會疊在一起（線上面放元旦、八月，線下面放新春、不定期；右半邊的字往左長），最窄的 320 寬也一樣，字也不會斷行。
//     2026-11-16 審查：線上的點也能點（點是連結的一部分）；點了以後鍵盤的位置跟著過去；
//     光還沒走到的站只是點變灰、字變淡一點，字還是看得清楚（不整個變透明）；列印時整條是亮的。
// 9. 沒有 JavaScript 時，只有互動才有用的東西（祭改的合計）不顯示，其他內容照樣看得到
// 10. 用語照簡報原文（2026-11-15 審查：「核心交集」不叫「兩盞光合一」，「一家之主代表祈求」不加字）
// 8. 動畫都很慢、很順（優雅不躁動）；要求減少動畫時不動。
//    這一頁是內頁「捲動時不動」的例外（使用者要互動、動畫）；動畫寫在 js/blueprint-view.js，不放進共用的 js/page.js
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { LAMPS, JIEGAI_BASE, JIEGAI_ADDONS, STOPS, jiegaiPlan, money, seasonMix, railStop, tierAt, handover, handoverPaths, mergeAt, mergeFrame, MERGE_MS, viewCue, mergeLoop, LOOP_MS, coreFrom, yearFrame, YEAR_MS, stopAt } from "../js/blueprint.js";

const read = (f) => readFileSync(new URL(`../${f}`, import.meta.url), "utf8");
const html = read("services.html");

test("prices match the temple's slides, in one place", () => {
  assert.deepEqual(
    LAMPS.map((l) => [l.name, l.price]),
    [
      ["小燈", 1200],
      ["大燈", 3600]
    ]
  );
  assert.deepEqual([JIEGAI_BASE.name, JIEGAI_BASE.price], ["祭改", 700]);
  assert.deepEqual(
    JIEGAI_ADDONS.map((a) => [a.name, a.price]),
    [
      ["祈還福", 800],
      ["補運", 300],
      ["補家運", 300],
      ["補考運", 300],
      ["補財庫", 1100]
    ]
  );
});

test("money is written like the slides", () => {
  assert.equal(money(700), "$700");
  assert.equal(money(1200), "$1,200");
  assert.equal(money(12000), "$12,000");
});

test("祭改 quiz: the base is always in; picked situations add their item; the total adds up", () => {
  const none = jiegaiPlan([]);
  assert.deepEqual(none.items.map((i) => i.name), ["祭改"]);
  assert.equal(none.total, 700);
  const two = jiegaiPlan(["bucaiku", "bukaoyun"]);
  assert.deepEqual(two.items.map((i) => i.name), ["祭改", "補考運", "補財庫"], "always in the slide's order");
  assert.equal(two.total, 2100);
  const all = jiegaiPlan(JIEGAI_ADDONS.map((a) => a.id));
  assert.equal(all.total, 700 + 800 + 300 + 300 + 300 + 1100);
  assert.equal(jiegaiPlan(["buyun", "buyun", "nope"]).total, 1000, "duplicates and unknown ids are ignored");
});

test("the page follows the year, and the content is in the page itself (works without JavaScript)", () => {
  const order = ["理念", "三層護持", "光明燈", "祭改", "核心交集", "蟠桃", "聖誕", "全年", "預約與聯絡"];
  const heads = [...html.matchAll(/<h2[^>]*>([^<]*)<\/h2>/g)].map((m) => m[1]);
  let at = -1;
  for (const key of order) {
    const i = heads.findIndex((h, k) => k > at && h.includes(key));
    assert.ok(i > at, `「${key}」 comes next (headings: ${heads.join(" / ")})`);
    at = i;
  }
  // 每一列：項目和它的價錢在同一列（對調價錢會被抓到）
  const lampRows = html.match(/<ul class="price-list">[\s\S]*?<\/ul>/)?.[0].match(/<li>[\s\S]*?<\/li>/g) || [];
  assert.equal(lampRows.length, LAMPS.length, "one row per lamp");
  LAMPS.forEach((l, i) => {
    assert.ok(lampRows[i].includes(`>${l.name}<`) && lampRows[i].includes(`>${money(l.price)}<`), `${l.name} row says ${money(l.price)}`);
  });
  const base = html.match(/<p class="quiz-base">[\s\S]*?<\/p>/)?.[0] ?? "";
  assert.ok(base.includes(`>${JIEGAI_BASE.name}<`) && base.includes(`>${money(JIEGAI_BASE.price)}<`) && base.includes(JIEGAI_BASE.desc), "base row");
  const labels = html.match(/<label>[\s\S]*?<\/label>/g) || [];
  assert.equal(labels.length, JIEGAI_ADDONS.length, "one quiz row per add-on");
  JIEGAI_ADDONS.forEach((a, i) => {
    const row = labels[i];
    assert.match(row, new RegExp(`<input[^>]*type="checkbox"[^>]*value="${a.id}"`), `${a.name}: its own box`);
    assert.ok(row.includes(`>${a.who}<`), `${a.name}: says who it is for (${a.who})`);
    assert.ok(row.includes(`>${a.name}<`) && row.includes(`>${money(a.price)}<`), `${a.name} row says ${money(a.price)}`);
  });
  assert.match(html, /aria-live="polite"/, "the total is announced when it changes");
  assert.match(html, /<div class="todo[^"]*"[^>]*>[\s\S]*?預約[\s\S]*?<\/div>/, "booking is still a 待填 box");
  assert.match(html, /<script type="module" src="js\/blueprint-view.js"><\/script>/);
  assert.doesNotMatch(read("js/page.js"), /blueprint/, "the shared page script stays calm");
});

test("wording follows the slides", () => {
  assert.equal(JIEGAI_ADDONS.find((a) => a.id === "bujiayun").who, "一家之主代表祈求");
  assert.doesNotMatch(html, /兩盞光合一/);
});

test("光明燈: just the chart, no 點燈 button or glow (the effect was too small)", () => {
  const lamp = html.match(/<figure class="lamp"[\s\S]*?<\/figure>/)?.[0] ?? "";
  assert.match(lamp, /<svg class="handover"/, "the chart is still there");
  assert.doesNotMatch(lamp, /<button|lamp-light|示意/, "no button, no glow, no demo note");
  const view = read("js/blueprint-view.js");
  assert.doesNotMatch(view, /lampButton|lampGlow|--glow/, "nothing left in the script for it");
  assert.doesNotMatch(read("pages.css"), /\.lamp-button|\.lamp-light|--glow/, "nothing left in the styles for it");
  // 兩條線直接寫在網頁上（沒有 JavaScript 也看得到），而且跟 handover() 算出來的一樣
  const p = handoverPaths();
  assert.ok(lamp.includes(`class="curve-old" d="${p.old}"`), "old-year curve is in the page");
  assert.ok(lamp.includes(`class="curve-new" d="${p.fresh}"`), "new-year curve is in the page");
  assert.ok(lamp.includes(`cy="${p.dotY}"`), "the 元旦 dot sits where the curves cross");
  assert.doesNotMatch(read("js/blueprint-view.js"), /setupLamp|curve-old/, "the script no longer has to draw them");
  // 新年那條金色、微微發光；舊年那條灰色
  const css = read("pages.css");
  assert.match(css, /\.curve-new\s*\{[^}]*stroke:\s*var\(--gold\)[^}]*drop-shadow/, "new year: gold with a soft glow");
  assert.match(css, /\.curve-old\s*\{[^}]*stroke:\s*#8b8178/, "old year: grey");
});

test("without JavaScript, the bits that only work with it are hidden; the rest is all there", () => {
  const classes = (cls) => [...html.matchAll(/class="([^"]*)"/g)].map((m) => m[1].split(/\s+/)).filter((c) => c.includes(cls));
  for (const cls of ["quiz-total"]) assert.ok(classes(cls).length && classes(cls).every((c) => c.includes("js-only")), `${cls} is js-only`);
  assert.match(read("pages.css"), /\.journey:not\(\.is-live\)\s+\.js-only\s*\{[^}]*display:\s*none/);
});

test("三層護持: no hint line; hovering a ring or its row lights both; tap and keyboard still work", () => {
  const tiers = html.match(/<section class="bp-tiers-wrap">[\s\S]*?<\/section>/)?.[0] ?? "";
  assert.ok(tiers, "the 三層護持 section is there");
  assert.doesNotMatch(tiers, /點一圈|從核心防護到隨喜感恩/, "the hint line is gone");
  assert.doesNotMatch(tiers, /<h2>三層護持<\/h2>\s*<p>/, "no line between the heading and the rings");
  const view = read("js/blueprint-view.js");
  const setup = view.slice(view.indexOf("function setupTiers"), view.indexOf("function setupLamp"));
  assert.match(setup, /rings\.addEventListener\("pointermove"/, "hovering the rings lights one");
  assert.match(setup, /tierAt\(/, "it finds which ring the mouse is on");
  assert.match(setup, /addEventListener\("pointerenter"/, "hovering a row on the right lights it too");
  assert.match(setup, /addEventListener\("focus"/, "moving the keyboard onto a name lights it");
  assert.match(setup, /rings\.addEventListener\("click"/, "a tap on the rings still works on phones");
  assert.match(setup, /pointerType [!=]== "touch"/, "a finger scrolling past does not count as hovering");
  assert.doesNotMatch(setup, /pointerleave|mouseleave|mouseout/, "leaving keeps the last one lit (no flicker back)");
  // 右邊那一列的字也要亮
  const css = read("pages.css");
  assert.match(css, /\.tier-list li\.is-on \.tier-name\s*\{[^}]*text-shadow/, "the lit row's name glows");
  assert.match(css, /\.tier-list li\s*\{[^}]*transition:[^;}]*box-shadow/, "the row's glow fades in, it does not pop");
});

test("the rail lights the stop you are at (none before the first)", () => {
  const marks = [1000, 2000, 3000, 4000];
  const vh = 800;
  assert.equal(railStop(100, marks, vh), -1, "still in the intro");
  assert.equal(railStop(1000, marks, vh), 0);
  assert.equal(railStop(1400, marks, vh), 0, "closer to the first stop");
  assert.equal(railStop(1600, marks, vh), 1, "closer to the second stop");
  assert.equal(railStop(9000, marks, vh), 3, "past the last stop");
});

test("the year rail has the four stops in order", () => {
  assert.deepEqual(STOPS.map((s) => s.when), ["元旦", "新春", "農曆八月", "不定期"]);
  for (const s of STOPS) assert.match(html, new RegExp(`data-stop="${s.id}"`), `${s.when} section is marked`);
});

test("season colours blend smoothly from stop to stop (no jumps)", () => {
  const marks = [100, 600, 1100, 1600];
  assert.deepEqual(seasonMix(0, marks), { a: 0, b: 0, w: 0 }, "before the first stop");
  assert.deepEqual(seasonMix(5000, marks), { a: 3, b: 3, w: 0 }, "after the last stop");
  const mid = seasonMix(350, marks);
  assert.equal(mid.a, 0);
  assert.equal(mid.b, 1);
  assert.ok(Math.abs(mid.w - 0.5) < 1e-9, "halfway is an even mix");
  // 一路捲下去，「現在混到哪」一直往前、沒有跳
  let prev = 0;
  for (let y = 0; y <= 1800; y += 5) {
    const m = seasonMix(y, marks);
    const pos = m.a + m.w * (m.b - m.a);
    assert.ok(pos >= prev - 1e-9, `moves forward at ${y}`);
    assert.ok(pos - prev < 0.05, `no jump at ${y}`);
    prev = pos;
  }
});

test("three tiers: centre is core, middle ring is free to join, outer ring is 隨喜", () => {
  const R = 200;
  assert.equal(tierAt(0, 0, R), "core");
  assert.equal(tierAt(40, 30, R), "core");
  assert.equal(tierAt(0, 110, R), "free");
  assert.equal(tierAt(-120, -90, R), "joy");
  assert.equal(tierAt(0, 230, R), null, "outside the rings");
});

test("handover curves: last year's energy falls, the new year's rises, they cross at 元旦 (the middle)", () => {
  const { old, fresh } = handover(40);
  assert.equal(old.length, 41);
  for (let i = 1; i <= 40; i++) {
    assert.ok(old[i] <= old[i - 1], "old falls");
    assert.ok(fresh[i] >= fresh[i - 1], "new rises");
  }
  assert.ok(old[0] > 0.8 && fresh[0] < 0.2);
  assert.ok(old[40] < 0.2 && fresh[40] > 0.8);
  assert.ok(Math.abs(old[20] - fresh[20]) < 1e-9, "cross in the middle");
});

test("核心交集 plays when reached: the lights merge, the two names fade before they touch, then 完整的能量防護 appears (never both)", () => {
  assert.ok(MERGE_MS >= 3000 && MERGE_MS <= 4500, `${MERGE_MS} ms`);
  assert.deepEqual(mergeFrame(0), { apart: 1, label: 1, word: 0 }, "starts apart, names showing");
  assert.deepEqual(mergeFrame(MERGE_MS), { apart: 0, label: 0, word: 1 }, "ends merged, only 完整的能量防護");
  assert.deepEqual(mergeFrame(MERGE_MS * 2), { apart: 0, label: 0, word: 1 }, "stays there");
  let prev = mergeFrame(0);
  for (let t = 16; t <= MERGE_MS; t += 16) {
    const f = mergeFrame(t);
    assert.ok(f.label === 0 || f.word === 0, `never both sets of words at ${t} ms`);
    // 兩團光各 160px 寬、中心相距 192 × apart：apart ≥ 160 / 192 才完全沒碰到
    if (f.label > 0) assert.ok(f.apart >= 160 / 192, `the names are gone before the lights touch (${t} ms: apart ${f.apart.toFixed(2)})`);
    for (const k of ["apart", "label", "word"]) assert.ok(Math.abs(f[k] - prev[k]) < 0.03, `${k} moves smoothly at ${t} ms`);
    assert.ok(f.apart <= prev.apart && f.label <= prev.label && f.word >= prev.word, `only moves one way at ${t} ms`);
    prev = f;
  }
  // 沒有 JavaScript 時是合起來的樣子；捲到才播；要求減少動畫直接到最後
  assert.match(read("pages.css"), /\.bp-merge\s*\{[^}]*--apart:\s*0;[^}]*--label:\s*0;[^}]*--word:\s*1/, "no-JS default is the merged picture");
  const view = read("js/blueprint-view.js");
  const setup = view.slice(view.indexOf("function setupMerge"), view.indexOf("function setupYearLine"));
  assert.match(setup, /if \(.*\breduce\b.*\) return/, "reduced motion keeps the CSS (merged) picture");
  assert.match(setup, /"IntersectionObserver" in window/, "old browsers without it keep the merged picture instead of getting stuck half-way");
  assert.match(setup, /playWhenSeen\(/, "plays when seen (shared with 全年平安藍圖)");
  const helper = view.slice(view.indexOf("function playWhenSeen"), view.indexOf("function setupMerge"));
  assert.match(helper, /cue\([^)]*intersectionRatio/, "how much of it is in view decides when it plays (see viewCue)");
  assert.match(helper, /cancelAnimationFrame\(frame\)/, "rewinding stops the loop (no loop left running off screen)");
});

test("核心交集 loops while on screen: merge, hold, part again slowly, hold, merge — smooth all the way round", () => {
  assert.ok(LOOP_MS >= 2 * MERGE_MS + 2000 && LOOP_MS <= 14000, `one round is ${LOOP_MS} ms`);
  assert.deepEqual(mergeLoop(0), mergeFrame(0), "starts apart, names showing");
  assert.deepEqual(mergeLoop(MERGE_MS), mergeFrame(MERGE_MS), "merged after the first half");
  assert.deepEqual(mergeLoop(MERGE_MS + 1000), mergeFrame(MERGE_MS), "holds merged for a while");
  assert.deepEqual(mergeLoop(LOOP_MS - 300), mergeFrame(0), "holds apart for a moment before merging again");
  // 兩圈走下來：每一格都很順（包括一圈接下一圈的地方）、兩組字不會同時出現、名字只在兩團光沒碰到時出現
  let prev = mergeLoop(0);
  for (let t = 16; t <= LOOP_MS * 2; t += 16) {
    const f = mergeLoop(t);
    assert.ok(f.label === 0 || f.word === 0, `never both sets of words at ${t} ms`);
    if (f.label > 0) assert.ok(f.apart >= 160 / 192, `names only while the lights are apart (${t} ms)`);
    for (const k of ["apart", "label", "word"]) assert.ok(Math.abs(f[k] - prev[k]) < 0.03, `${k} moves smoothly at ${t} ms`);
    prev = f;
  }
  for (const t of [0, 1234, 5000, 9999]) assert.deepEqual(mergeLoop(t + LOOP_MS), mergeLoop(t), "every round is the same");
  const view = read("js/blueprint-view.js");
  assert.match(view, /playWhenSeen\(stage, mergeLoop, set\);/, "the page loops it (no end time given)");
  assert.match(view, /function playWhenSeen\(el, frameAt, set, until = Infinity\)/, "no end time = keeps going");
  assert.match(view, /if \(ms < until\) frame = requestAnimationFrame\(tick\)/, "the next frame is asked for until the end time (forever for 核心交集)");
});

test("核心交集 starts from the beginning every time you come back to it, and only rewinds when nobody can see it", () => {
  // viewCue(狀態, 看到的比例)；比例是 null = 停留 0.3 秒的計時到了
  const step = (state, ratio) => viewCue(state, ratio);
  assert.deepEqual(step("ready", 0.9), { state: "waiting", act: "wait" }, "mostly in view: wait a moment");
  assert.deepEqual(step("ready", 0.7999), { state: "waiting", act: "wait" }, "the browser may report the 80% line as 0.7999");
  assert.deepEqual(step("waiting", null), { state: "played", act: "play" }, "still there after the wait: play");
  assert.deepEqual(step("waiting", 0.5), { state: "ready", act: "cancel" }, "scrolled past quickly: do not play unseen");
  assert.deepEqual(step("ready", null), { state: "ready", act: null }, "a stale timer does nothing");
  assert.deepEqual(step("played", 0.9), { state: "played", act: null }, "keeps looping while on screen (no restart from the beginning)");
  assert.deepEqual(step("played", 0.4), { state: "played", act: null }, "half visible: no rewind in front of you");
  assert.deepEqual(step("played", 0), { state: "ready", act: "reset" }, "fully out of view: rewind to the start");
  assert.deepEqual(step("waiting", 0), { state: "ready", act: "reset" });
  assert.deepEqual(step("ready", 0), { state: "ready", act: null }, "already at the start");
  // 走一趟：看到 → 播 → 離開 → 回來 → 又播
  let s = "ready";
  const acts = [];
  for (const r of [0.9, null, 0.5, 0, 0.3, 0.9, null]) {
    const out = step(s, r);
    s = out.state;
    if (out.act) acts.push(out.act);
  }
  assert.deepEqual(acts, ["wait", "play", "reset", "wait", "play"], "plays again on the second visit");
  assert.match(read("js/blueprint-view.js"), /viewCue\(/, "the page uses it");
});

test("the lotus opens slowly as you reach that part", () => {
  assert.equal(mergeAt(0), 1, "apart before");
  assert.equal(mergeAt(1), 0, "together after");
  assert.equal(mergeAt(-1), 1);
  assert.equal(mergeAt(2), 0);
  let prev = 1;
  for (let p = 0; p <= 1; p += 0.01) {
    const d = mergeAt(p);
    assert.ok(d <= prev && prev - d < 0.03, `smooth at ${p.toFixed(2)}`);
    prev = d;
  }
});

// 全年平安藍圖的那條線（沒有 JavaScript 也在網頁上）
const yearBox = html.match(/<div class="plan-line" id="planLine">[\s\S]*?<\/ol>[\s\S]*?<\/div>/)?.[0] ?? "";
const yearRows = yearBox.match(/<li[\s\S]*?<\/li>/g) || [];
const atOf = (row) => {
  const m = row.match(/style="--at:\s*([\d.]+)"/);
  return m ? Number(m[1]) : null;
};

test("全年平安藍圖: one line from 元旦 to 歲末; the stops sit at their real time of year and link back up", () => {
  assert.ok(yearBox, "the line is in the page (works without JavaScript)");
  const want = [
    { id: "yuandan", tier: "core", text: ["元旦", "啟動光明燈", "核心預留"] },
    { id: "xinchun", tier: "core", text: ["新春", "祭改與祈福", "核心預留"] },
    { id: "bayue", tier: "free", text: ["農曆八月", "蟠桃盛會普施", "自由評估"] },
    { id: "shengdan", tier: "joy", text: ["不定期", "聖誕與週年慶回娘家", "隨喜同樂"] }
  ];
  assert.deepEqual(want.map((w) => w.id), STOPS.map((s) => s.id), "same order as the year");
  assert.equal(yearRows.length, want.length, "one entry per stop");
  yearRows.forEach((row, i) => {
    const w = want[i];
    assert.match(row, new RegExp(`<a href="#stop-${w.id}"`), `${w.id}: links back up to its part`);
    assert.match(html, new RegExp(`id="stop-${w.id}"`), `${w.id}: the part it links to exists`);
    assert.match(row, new RegExp(`class="[^"]*\\byp-${w.tier}\\b`), `${w.id}: ${w.tier} colour`);
    const words = row.replace(/<[^>]+>/g, "|").split("|").map((s) => s.trim()).filter(Boolean);
    assert.deepEqual(words, w.text, `${w.id}: says ${w.text.join(" / ")}`);
  });
  const ats = yearRows.map(atOf);
  assert.equal(ats[0], 0, "元旦 starts the line");
  assert.ok(ats[1] > 0.05 && ats[1] < 0.15, `新春 a little after (lunar new year: late Jan to mid Feb), got ${ats[1]}`);
  assert.ok(ats[2] > 0.6 && ats[2] < 0.8, `農曆八月 about seven tenths in (around September), got ${ats[2]}`);
  assert.equal(ats[3], null, "不定期 is not a point");
  assert.match(yearBox, /class="plan-band"/, "不定期 is a soft band along the whole year");
  assert.match(yearBox, />歲末</, "the line ends at 歲末");
  assert.doesNotMatch(yearBox, /模組/, "no computer word 模組 on the line (the 新春 part keeps the slide's own wording)");
});

test("全年平安藍圖: labels never overlap — on each side of the line, one grows right and one grows left from further along", () => {
  const side = (row) => (/\byp-up\b/.test(row) ? "up" : /\byp-down\b/.test(row) ? "down" : null);
  const sides = yearRows.map(side);
  assert.deepEqual(sides, ["up", "down", "up", "down"], "元旦、八月 above; 新春、不定期 below");
  for (const s of ["up", "down"]) {
    const rows = yearRows.filter((r) => side(r) === s);
    const right = rows.filter((r) => !/\byp-end\b/.test(r));
    const left = rows.filter((r) => /\byp-end\b/.test(r));
    assert.equal(right.length, 1, `${s}: one label grows right`);
    assert.equal(left.length, 1, `${s}: one label grows left`);
    assert.ok((atOf(right[0]) ?? 1) < (atOf(left[0]) ?? 1), `${s}: the right-growing one starts first`);
  }
  // 字不斷行；最窄的手機（320 寬，線長 264px）用小一點的字，同一邊的兩組字中間至少還有 8px
  const css = read("pages.css");
  assert.match(css, /\.year-plan a\s*\{[^}]*white-space:\s*nowrap/, "labels never wrap");
  const narrow = css.slice(css.indexOf("/* 全年平安藍圖")).match(/@media \(max-width: 360px\)\s*\{[\s\S]*?\n\}/)?.[0] ?? "";
  const size = Number(narrow.match(/\.year-plan \.what\s*\{[^}]*font-size:\s*(\d+)px/)?.[1]);
  const pad = Number(narrow.match(/\.year-plan a\s*\{[^}]*padding-left:\s*(\d+)px/)?.[1]);
  const padEnd = Number(narrow.match(/\.yp-end a\s*\{[^}]*padding-right:\s*(\d+)px/)?.[1]);
  assert.ok(size <= 14 && pad <= 8 && padEnd <= 8, `320 wide: smaller words (${size}px) and padding (${pad}/${padEnd}px)`);
  const W = 264;
  const width = (row) => {
    const words = row.replace(/<[^>]+>/g, "|").split("|").map((t) => t.trim()).filter(Boolean);
    return Math.max(...words.map((w, i) => w.length * (i === 1 ? size : 13))) + (/\byp-end\b/.test(row) ? padEnd : pad);
  };
  for (const s of ["up", "down"]) {
    const rows = yearRows.filter((r) => side(r) === s);
    const right = rows.find((r) => !/\byp-end\b/.test(r));
    const left = rows.find((r) => /\byp-end\b/.test(r));
    const rightEnd = (atOf(right) ?? 1) * W + width(right);
    const leftStart = (atOf(left) ?? 1) * W - width(left);
    assert.ok(leftStart - rightEnd >= 8, `${s}, 320 wide: ${rightEnd.toFixed(0)}px then ${leftStart.toFixed(0)}px`);
  }
});

test("全年平安藍圖: 核心 is light on the pocket — 小燈 + 祭改 is $1,900 a year", () => {
  const small = LAMPS.find((l) => l.id === "small");
  assert.equal(coreFrom(), small.price + JIEGAI_BASE.price);
  assert.equal(coreFrom(), 1900);
  const sum = html.match(/<p class="year-sum">[\s\S]*?<\/p>/)?.[0] ?? "";
  assert.match(sum, /小燈[\s\S]*祭改[\s\S]*起/, "says what it is made of");
  for (const v of [small.price, JIEGAI_BASE.price, coreFrom()]) assert.ok(sum.includes(`>${money(v)}<`), `says ${money(v)}`);
});

test("全年平安藍圖: the light walks slowly from 元旦 to 歲末; a stop lights only when the light reaches it", () => {
  assert.ok(YEAR_MS >= 2500 && YEAR_MS <= 4000, `${YEAR_MS} ms`);
  const ats = [0, 0.1, 0.7, 1]; // 不定期 = 整年，光走完才亮
  const start = yearFrame(0, ats);
  assert.equal(start.lit, 0);
  assert.equal(start.head, 0, "the walking light fades in");
  assert.deepEqual(start.on, [true, false, false, false], "元旦 lights as the light sets off");
  const end = yearFrame(YEAR_MS, ats);
  assert.deepEqual(end, { lit: 1, head: 0, on: [true, true, true, true] }, "all lit at 歲末, the walking light gone");
  assert.deepEqual(yearFrame(YEAR_MS * 3, ats), end, "stays lit");
  assert.equal(yearFrame(YEAR_MS / 2, ats).head, 1, "the walking light is bright on the way");
  let prev = start;
  for (let t = 16; t <= YEAR_MS + 16; t += 16) {
    const f = yearFrame(t, ats);
    assert.ok(f.lit >= prev.lit && f.lit - prev.lit < 0.03, `walks smoothly, never back (${t} ms)`);
    assert.ok(Math.abs(f.head - prev.head) < 0.06, `the walking light fades smoothly (${t} ms)`);
    f.on.forEach((on, i) => assert.equal(on, f.lit >= ats[i], `stop ${i} lights exactly when reached (${t} ms)`));
    prev = f;
  }
});

test("全年平安藍圖: no JavaScript or reduced motion → the whole line is lit; otherwise it plays like 核心交集", () => {
  const css = read("pages.css");
  assert.match(css, /\.plan-line\s*\{[^}]*--lit:\s*1;[^}]*--head:\s*0/, "no-JS default: all lit, no walking light");
  // 法會活動頁已經有自己的 .year-line（農曆一年那條線）：這裡的名字不能跟它撞到
  const from = css.indexOf("/* 全年平安藍圖");
  const to = css.indexOf(".year-sum strong");
  assert.ok(from > 0 && to > from, "the line's styles sit together");
  const outside = css.slice(0, from) + css.slice(to);
  assert.doesNotMatch(outside, /\.plan-(line|track|glow|band|head|end)\b/, "nothing else styles the line's parts");
  assert.doesNotMatch(yearBox, /class="year-(line|track|glow|band|head|end)"/, "no names shared with the events page");
  assert.match(css, /\.plan-line\.is-live li:not\(\.is-lit\) a::before\s*\{[^}]*grayscale/, "with the script, a stop's dot waits grey for the light");
  assert.doesNotMatch(css, /\.plan-line\.is-live li:not\(\.is-lit\)\s*\{[^}]*opacity/, "the words do not fade away (they stay readable while waiting)");
  assert.match(css, /\.plan-line\.is-live li:not\(\.is-lit\) \.what\s*\{[^}]*color:\s*var\(--text-soft\)/, "waiting words are only a little softer (contrast 4.8)");
  const print = [...css.matchAll(/@media print\s*\{[\s\S]*?\n\}/g)].map((m) => m[0]).join("\n");
  assert.match(print, /\.plan-line\s*\{[^}]*--lit:\s*1\s*!important/, "printing: the whole line is lit");
  assert.match(print, /\.plan-line li \.what\s*\{[^}]*color:\s*var\(--text\)\s*!important/, "printing: no soft waiting words");
  assert.match(print, /\.plan-line li a::before\s*\{[^}]*filter:\s*none\s*!important/, "printing: no grey waiting dots");
  // 線、點、帶子都是背景畫的：瀏覽器預設不印背景，要特別說「照印」；也不要被切成兩頁
  assert.match(print, /\.plan-line[^{]*\{[^}]*(?<!-)print-color-adjust:\s*exact/, "printing: the line, dots and band are printed (not dropped as backgrounds)");
  assert.match(print, /\.plan-line[^{]*::before[^{]*\{[^}]*print-color-adjust:\s*exact/, "…including the dots and stems");
  assert.match(print, /\.plan-line\s*\{[^}]*break-inside:\s*avoid/, "printing: the line is not cut across two pages");
  assert.match(print, /\.bp-year\s*\{[^}]*break-inside:\s*avoid/, "printing: the heading stays on the same page as its line");
  assert.match(print, /\.plan-line \*::before[^{]*\{[^}]*transition:\s*none/, "printing: the dots do not stop half-way through fading either");
  // 還沒亮的站：滑鼠移上去、鍵盤移到上面，字一樣會變金色（要蓋得過等光的淡色）
  assert.match(css, /\.plan-line \.year-plan li a:hover \.what,\s*\.plan-line \.year-plan li a:focus-visible \.what\s*\{[^}]*color:\s*var\(--gold-text\)/, "hover / focus turns the words gold even while waiting");
  const view = read("js/blueprint-view.js");
  const setup = view.slice(view.indexOf("function setupYearLine"), view.indexOf("function setupScrollPieces"));
  assert.match(setup, /glide\(/, "the links scroll up slowly (like the rail)");
  assert.match(setup, /if \(.*\breduce\b.*\) return/, "reduced motion keeps the lit line");
  assert.match(setup, /"IntersectionObserver" in window/, "old browsers keep the lit line");
  assert.match(setup, /playWhenSeen\(/, "mostly in view for 0.3 s → plays; rewinds only when out of view");
  assert.match(setup, /yearFrame\(/);
  assert.match(setup, /playWhenSeen\(line, \(ms\) => yearFrame\(ms, ats\), set, YEAR_MS\)/, "plays once and stops at 歲末 (no endless loop)");
  assert.match(setup, /stopAt\(li\.style\.getPropertyValue\("--at"\)\)/, "each stop's place comes from the page (see stopAt)");
  // 點了以後：鍵盤的位置（下一個 Tab）跟著到那一段，不會留在下面
  const glideFn = view.slice(view.indexOf("function glide"), view.indexOf("function setupYear("));
  assert.match(glideFn, /setAttribute\("tabindex", "-1"\)/, "the part can take the focus");
  assert.match(glideFn, /\.focus\(\{ preventScroll: true \}\)/, "focus moves there without jumping the slow scroll");
  assert.ok(setup.indexOf("glide(") < setup.search(/if \(.*\breduce\b.*\) return/), "links work even with reduced motion");
  assert.match(view, /\["全年平安藍圖", setupYearLine\]/, "set up on its own (if it fails, only this part is lost)");
  assert.match(view.slice(view.indexOf("function setupYear("), view.indexOf("function setupTiers")), /glide\(/, "the rail uses the same slow scroll");
});

test("全年平安藍圖: a stop's place on the line comes from the page; 不定期 (no place) counts as the whole year", () => {
  assert.equal(stopAt(""), 1, "no place = the whole year: lights when the light has walked all of it");
  assert.equal(stopAt(" "), 1);
  assert.equal(stopAt("0"), 0, "元旦 (0) is a real place, not 'none'");
  assert.equal(stopAt(" 0.1"), 0.1);
  assert.equal(stopAt("0.7"), 0.7);
  const ats = yearRows.map((r) => stopAt(r.match(/style="--at:([^"]*)"/)?.[1] ?? ""));
  assert.deepEqual(ats, [0, 0.1, 0.7, 1], "the places read from the page");
});

test("全年平安藍圖 colours follow the three tiers: 核心 solid gold, 自由 a hollow gold ring, 隨喜 a soft pink band", () => {
  const css = read("pages.css");
  assert.match(css, /\.yp-core a::before\s*\{[^}]*background:[^;]*(var\(--gold\)|#c9a463)/, "核心: solid gold dot");
  assert.match(css, /\.yp-free a::before\s*\{[^}]*background:\s*var\(--paper-light\)[^}]*border:[^;]*var\(--gold\)/, "自由: hollow ring");
  // 點是連結的一部分：點那顆點也會捲上去
  assert.match(css, /\.year-plan a::before\s*\{/, "the dot belongs to the link");
  assert.doesNotMatch(css, /\.year-plan li::(before|after)|\.yp-[a-z]+::(before|after)/, "no dot or stem outside the link");
  // 細線停在點的邊上，不會穿過空心圈（字到線中間是 16px）
  const dot = Number(css.match(/\.year-plan a::before\s*\{[^}]*width:\s*(\d+)px/)?.[1]);
  const stem = Number(css.match(/\.year-plan a::after\s*\{[^}]*height:\s*(\d+)px/)?.[1]);
  assert.equal(stem + dot / 2, 16, `the stem (${stem}px) stops at the dot's edge (dot ${dot}px)`);
  assert.match(css, /\.plan-band\s*\{[^}]*236,\s*170,\s*180/, "隨喜: the same soft pink as 祭改's light");
});

test("motion: reduced-motion visitors get no animation on this page", () => {
  const css = read("pages.css");
  const reduced = css.slice(css.indexOf("@media (prefers-reduced-motion: reduce)"));
  assert.match(reduced, /\.year-rail[^{]*\{[^}]*transition:\s*none/, "the rail does not fade");
  assert.match(reduced, /\.ring-joy::after[^{]*\{[^}]*animation:\s*none/, "the orbiting light stands still");
  const view = read("js/blueprint-view.js");
  assert.match(view, /prefers-reduced-motion/, "the script checks it too");
});
