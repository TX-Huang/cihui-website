import { test } from "node:test";
import assert from "node:assert/strict";
import { DEITIES, ORDER } from "../js/deities.js";

// 每位神尊的珠簾用自己的經典（2026-11-09 道場誦本核對）
test("deities: every deity's curtain uses a different scripture", () => {
  const texts = ORDER.map((id) => DEITIES[id].cloth);
  assert.equal(new Set(texts).size, ORDER.length);
});

test("deities: curtains have no punctuation (one bead = one character)", () => {
  for (const id of ORDER) {
    assert.doesNotMatch(DEITIES[id].cloth, /[。，、；：「」『』！？.,]/, `${id} has punctuation`);
  }
});

test("deities: the wording checked against the daochang's own book is used", () => {
  const has = (id, words) => {
    for (const w of words) assert.ok(DEITIES[id].cloth.includes(w), `${id} should contain 「${w}」`);
  };
  has("jinmu", ["欲明解脫", "五蘊自明三家會合"]);
  has("tudi", ["吾是三皇五帝后土之臣", "墾荒教導純純", "敕封福德正神", "保佑四境生靈"]);
  has("xuannu", ["炎黃世冑德為榮", "吾為救世降紅塵", "手執寶劍斬妖邪", "難逃天譴禍相侵"]);
  has("nezha", ["吾是玉皇靈珠兒", "金光洞裏鍊金剛", "腳踏金霞風火輪"]);
  assert.ok(!DEITIES.tudi.cloth.includes("懇荒"));
  assert.ok(!DEITIES.nezha.cloth.includes("金光洞裹"));
});
