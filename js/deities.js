// 四位神明的資料。改文字、顏色都在這裡。
// 風格 A「月白素雅」：同一張黎明背景，每位神明換一層不同的晨光色調（tint）。

// 珠簾經文：《瑤池金母普度收圓定慧解脫真經》金母開示「定慧解脫」一段（經名的核心）。
// 依維基文庫版與真佛宗網站版對照，兩處用字不同：
//   「欲明解說／欲明解脫」：採「欲明解脫」（真佛宗版），待道場誦本確認
//   「五蘊自明／五蘊既明。三家會合」：道場誦本為「五蘊自明」（2026-11-08 確認）
// 標點拿掉，句與句之間不留空；每輪結尾加一個全形空白。
export const SUTRA =
  "解脫非難難在定慧身心大定便生智慧智慧既生解脫亦易" +
  "欲明解脫先除六賊耳不聽聲目不視色身不觸污意不著物鼻不妄嗅口不貪食" +
  "六賊既空五蘊自明受想行識如鏡見形" +
  "五蘊自明三家會合精氣與神長養活潑上下流通何難解脫" +
  "　";

const INK = "#2f2a25";
const GOLD = "#a8844a";

export const DEITIES = {
  jinmu: {
    id: "jinmu",
    name: "瑤池金母",
    plaque: "慈惠道場",
    eyebrow: "慈惠道場 · 主祀",
    title: "瑤池金母",
    subtitle: "慈悲為懷，護佑眾生",
    aside: "金母慈光照耀，願來到這裡的每一個人，心有所安。",
    cloth: SUTRA,
    note: 0,
    theme: { tint: "#ffffff", tintA: 0, mist: "rgba(255, 255, 255, 0.45)", ink: INK, gold: GOLD, petal: "#ead3cc" }
  },
  xuannu: {
    id: "xuannu",
    name: "九天玄女",
    plaque: "慈惠道場",
    eyebrow: "慈惠道場 · 陪祀",
    title: "九天玄女",
    subtitle: "智慧之神，指引明路",
    aside: "傳說玄女授黃帝兵書，助其平定天下。",
    cloth: SUTRA,
    note: 2,
    theme: { tint: "#8c84c8", tintA: 0.32, mist: "rgba(240, 238, 255, 0.45)", ink: "#2c2a3a", gold: "#8e86b8", petal: "#d9d4ea" }
  },
  nezha: {
    id: "nezha",
    name: "中壇元帥",
    plaque: "慈惠道場",
    eyebrow: "慈惠道場 · 陪祀",
    title: "中壇元帥",
    subtitle: "腳踏風火，鎮守中壇",
    aside: "俗稱太子爺、哪吒三太子，護法除煞，守護一方。",
    cloth: SUTRA,
    note: 4,
    theme: { tint: "#e4a072", tintA: 0.3, mist: "rgba(255, 244, 236, 0.45)", ink: "#3a2a22", gold: "#b9794a", petal: "#efd2bd" }
  },
  tudi: {
    id: "tudi",
    name: "福德正神",
    plaque: "慈惠道場",
    eyebrow: "慈惠道場 · 陪祀",
    title: "福德正神",
    subtitle: "土地之神，福佑家園",
    aside: "俗稱土地公，守護土地與家宅，保佑五穀豐收、生意興隆。",
    cloth: SUTRA,
    note: 7,
    theme: { tint: "#d6bb78", tintA: 0.3, mist: "rgba(255, 250, 236, 0.45)", ink: "#33301f", gold: "#a8914a", petal: "#ebdfba" }
  }
};

export const ORDER = ["jinmu", "xuannu", "nezha", "tudi"];
