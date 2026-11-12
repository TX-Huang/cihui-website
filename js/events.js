// 法會活動：一行一場。以後要改日期、加活動，改這裡就好。
// month、day 是農曆。confirmed：跟道場確認過了就改成 true（沒確認的會在頁面上標「待確認」）。
// note：補充說明（可以不寫）。seal：橫軸上那個小印裡的一個字。
// 四位神明的聖誕各地說法不一，先用 docs/deities-lore.md 查到最常見的，等道場確認。
export const EVENTS = [
  { name: "瑤池金母聖誕", seal: "母", month: 7, day: 18, confirmed: false, note: "慈惠堂傳統的日子" },
  { name: "九天玄女聖誕", seal: "玄", month: 2, day: 15, confirmed: false },
  { name: "中壇元帥聖誕", seal: "帥", month: 9, day: 9, confirmed: false },
  { name: "福德正神聖誕", seal: "福", month: 2, day: 2, confirmed: false, note: "頭牙" }
];

const NUM = ["", "一", "二", "三", "四", "五", "六", "七", "八", "九", "十"];
const MONTH = ["", "正", "二", "三", "四", "五", "六", "七", "八", "九", "十", "十一", "十二"];

function dayName(d) {
  if (d <= 10) return "初" + NUM[d];
  if (d < 20) return "十" + NUM[d - 10];
  if (d === 20) return "二十";
  if (d < 30) return "廿" + NUM[d - 20];
  return "三十";
}

// 農曆日期的寫法：lunarDate(7, 18) → 「農曆七月十八」
export function lunarDate(month, day) {
  if (!Number.isInteger(month) || month < 1 || month > 12) throw new RangeError(`農曆月份要是 1～12，這裡是 ${month}`);
  if (!Number.isInteger(day) || day < 1 || day > 30) throw new RangeError(`農曆日子要是 1～30，這裡是 ${day}`);
  return `農曆${MONTH[month]}月${dayName(day)}`;
}

// 給頁面用的一列一列：照農曆月日排好
export function eventRows(list) {
  return [...list]
    .sort((a, b) => a.month - b.month || a.day - b.day)
    .map((e) => ({ date: lunarDate(e.month, e.day), name: e.name, note: e.note || "", pending: !e.confirmed }));
}
