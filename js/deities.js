// 四位神明的資料。改文字、顏色都在這裡。
// ⚠️ cloth（珠簾上的字）目前是暫用的聖號與祝福語，請換成道場正式的經文或寶誥。
// 風格 A「月白素雅」：同一張黎明背景，每位神明換一層不同的晨光色調（tint）。

const INK = "#2f2a25";
const GOLD = "#a8844a";

export const DEITIES = {
  jinmu: {
    id: "jinmu",
    name: "瑤池金母",
    plaque: "瑤池金母",
    eyebrow: "慈惠道場 · 主祀",
    title: "瑤池金母",
    subtitle: "慈悲為懷，護佑眾生",
    aside: "金母慈光照耀，願來到這裡的每一個人，心有所安。",
    cloth: "無極瑤池金母大天尊慈悲護佑眾生平安吉祥",
    note: 0,
    theme: { tint: "#ffffff", tintA: 0, mist: "rgba(255, 255, 255, 0.45)", ink: INK, gold: GOLD, petal: "#ead3cc" }
  },
  xuannu: {
    id: "xuannu",
    name: "九天玄女",
    plaque: "九天玄女",
    eyebrow: "慈惠道場 · 陪祀",
    title: "九天玄女",
    subtitle: "智慧之神，指引明路",
    aside: "傳說玄女授黃帝兵書，助其平定天下。",
    cloth: "九天玄女娘娘慈悲賜福智慧光明指引道路",
    note: 2,
    theme: { tint: "#8c84c8", tintA: 0.32, mist: "rgba(240, 238, 255, 0.45)", ink: "#2c2a3a", gold: "#8e86b8", petal: "#d9d4ea" }
  },
  nezha: {
    id: "nezha",
    name: "中壇元帥",
    plaque: "中壇元帥",
    eyebrow: "慈惠道場 · 陪祀",
    title: "中壇元帥",
    subtitle: "腳踏風火，鎮守中壇",
    aside: "俗稱太子爺、哪吒三太子，護法除煞，守護一方。",
    cloth: "中壇元帥太子爺護法除煞鎮守中壇合境平安",
    note: 4,
    theme: { tint: "#e4a072", tintA: 0.3, mist: "rgba(255, 244, 236, 0.45)", ink: "#3a2a22", gold: "#b9794a", petal: "#efd2bd" }
  },
  tudi: {
    id: "tudi",
    name: "福德正神",
    plaque: "福德正神",
    eyebrow: "慈惠道場 · 陪祀",
    title: "福德正神",
    subtitle: "土地之神，福佑家園",
    aside: "俗稱土地公，守護土地與家宅，保佑五穀豐收、生意興隆。",
    cloth: "福德正神土地公保佑家宅平安五穀豐收財源廣進",
    note: 7,
    theme: { tint: "#d6bb78", tintA: 0.3, mist: "rgba(255, 250, 236, 0.45)", ink: "#33301f", gold: "#a8914a", petal: "#ebdfba" }
  }
};

export const ORDER = ["jinmu", "xuannu", "nezha", "tudi"];
