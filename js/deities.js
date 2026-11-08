// 四位神明的資料。改文字、顏色都在這裡。
// ⚠️ cloth（珠簾上的字）目前是暫用的聖號與祝福語，請換成道場正式的經文或寶誥。
// theme.hue / sat / bri：把同一張瑤池背景調成不同色調（hue 是色相旋轉角度）。

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
    theme: { hue: 0, sat: 1, bri: 1, mist: "rgba(170, 235, 215, 0.18)", beadA: "#ff6a5a", beadB: "#9ff5d8", petal: "#ffb7c5" }
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
    theme: { hue: 70, sat: 0.9, bri: 0.95, mist: "rgba(200, 200, 255, 0.16)", beadA: "#d2c2ff", beadB: "#8fe9ff", petal: "#ddd6ff" }
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
    theme: { hue: -150, sat: 1.1, bri: 0.95, mist: "rgba(255, 180, 130, 0.15)", beadA: "#ffbe5c", beadB: "#ff7a4d", petal: "#ffc98a" }
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
    theme: { hue: -115, sat: 0.75, bri: 1.05, mist: "rgba(245, 225, 160, 0.15)", beadA: "#ffd96e", beadB: "#c2e889", petal: "#ffe8a8" }
  }
};

export const ORDER = ["jinmu", "xuannu", "nezha", "tudi"];
