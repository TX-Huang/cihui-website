// 內頁的兩個重點畫面（純計算，方便測試；畫面在 js/page.js）
// 1. 關於道場：神明卡片，主祀一張大卡、陪祀一排小卡，各配首頁已經有的圖
// 2. 法會活動：「農曆一年」橫軸，每個聖誕是一個朱紅小印

// 每位神明配哪張圖（tools/prep_deity_cards.py 做的，都是首頁已經有的素材）
const PICTURES = { jinmu: "青鳥", xuannu: "鳳凰", nezha: "金蓮", tudi: "稻穗" };

export function deityCards(deities) {
  return Object.values(deities).map((d) => {
    const main = d.id === "jinmu";
    return {
      id: d.id,
      main,
      role: main ? "主祀" : "陪祀",
      name: d.name,
      sub: d.subtitle || "",
      img: `assets/elements/card-${d.id}.webp`,
      picture: PICTURES[d.id],
      href: `index.html#${d.id}`
    };
  });
}

// 農曆月份的傳統說法：十一月叫冬月、十二月叫臘月
export const MONTHS = ["正", "二", "三", "四", "五", "六", "七", "八", "九", "十", "冬", "臘"];

// 一年橫軸：width 寬的一條線，十二個月平均分；每個聖誕照月、日放一個印。
// 靠太近的印（像二月初二、二月十五）上下錯開成第二排，不疊在一起
export function yearTimeline(events, width) {
  const size = width >= 480 ? 30 : 24;
  const months = MONTHS.map((label, i) => ({ label, x: ((i + 0.5) / 12) * width }));
  const placed = [];
  const seals = [...events]
    .map((e) => ({
      name: e.name,
      char: e.seal || [...e.name][0],
      pending: !e.confirmed,
      x: Math.min(width - size / 2, Math.max(size / 2, ((e.month - 1 + (e.day - 1) / 30) / 12) * width))
    }))
    .sort((a, b) => a.x - b.x);
  for (const s of seals) {
    let row = 0;
    while (placed.some((p) => p.row === row && Math.abs(p.x - s.x) < size)) row++;
    s.row = row;
    placed.push(s);
  }
  return { months, seals, size };
}
