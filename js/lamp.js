// 光明燈登記：燈的名目、專屬連結、送到試算表的資料。只有計算（方便測試）；
// 畫面在 js/lamp-view.js（登記頁 lamp.html）和 js/lamp-link-view.js（樞理做連結的 lamp-link.html）。規格在 test/lamp.test.mjs。
import { lunarDate } from "./events.js";

// 燈的名目：大燈、小燈各一串（道場還沒給，先標待填；改這裡就好，id 不要改，已經發出去的連結靠它認燈）
export const LAMPS = {
  big: {
    label: "大燈",
    items: [
      { id: "big-1", name: "名目一（待填）" },
      { id: "big-2", name: "名目二（待填）" },
      { id: "big-3", name: "名目三（待填）" }
    ]
  },
  small: {
    label: "小燈",
    items: [
      { id: "small-1", name: "名目一（待填）" },
      { id: "small-2", name: "名目二（待填）" },
      { id: "small-3", name: "名目三（待填）" }
    ]
  }
};

// Google 試算表的網址（Apps Script 部署成「網頁應用程式」後拿到的網址，做法在 tools/lamp-sheet.gs 最上面）。
// 空的：登記頁會說「登記功能還沒開通」
export const SHEET_URL = "";

export const NAME_MAX = 40;
export const ADDRESS_MAX = 120;
export const thisRocYear = () => new Date().getFullYear() - 1911;

// 十二時辰（hour 是 1～12：子時是 1）
export const HOURS = [
  ["子", "晚上11點～凌晨1點"],
  ["丑", "凌晨1點～3點"],
  ["寅", "凌晨3點～5點"],
  ["卯", "早上5點～7點"],
  ["辰", "早上7點～9點"],
  ["巳", "早上9點～11點"],
  ["午", "中午11點～下午1點"],
  ["未", "下午1點～3點"],
  ["申", "下午3點～5點"],
  ["酉", "傍晚5點～7點"],
  ["戌", "晚上7點～9點"],
  ["亥", "晚上9點～11點"]
].map(([n, time]) => ({ name: `${n}時`, time }));

const inRange = (v, lo, hi) => Number.isInteger(v) && v >= lo && v <= hi;

// 新信眾的農曆生日：「民國70年 農曆閏四月初五 子時」；不知道時辰：「… 吉時」（使用者：「不知道到時候就會變成吉時」）。
// 年 1～今年（民國）、月 1～12、日 1～30、時辰選一個或勾不知道；不對：null
export function lunarBirth({ year, month, day, leap = false, hour, hourUnknown = false, maxYear = thisRocYear() } = {}) {
  const ok = inRange(year, 1, maxYear) && inRange(month, 1, 12) && inRange(day, 1, 30) && (hourUnknown || inRange(hour, 1, 12));
  if (!ok) return null;
  const date = lunarDate(month, day);
  return `民國${year}年 ${leap ? date.replace("農曆", "農曆閏") : date} ${hourUnknown ? "吉時" : HOURS[hour - 1].name}`;
}

const LABELS = new Map(Object.values(LAMPS).flatMap((g) => g.items.map((i) => [i.id, `${g.label}・${i.name}`])));

// 「大燈・名目一」；不認得的燈：null
export const lampLabel = (id) => LABELS.get(id) ?? null;

const cleanName = (name) => String(name ?? "").trim().slice(0, NAME_MAX);
const cleanLamps = (ids) => [...new Set((Array.isArray(ids) ? ids : []).filter((id) => LABELS.has(id)))];

// 中文 → UTF-8 → base64url（可以放在網址 # 後面）
function toBase64Url(text) {
  let bin = "";
  for (const b of new TextEncoder().encode(text)) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(code) {
  const bin = atob(code.replace(/-/g, "+").replace(/_/g, "/"));
  return new TextDecoder("utf-8", { fatal: true }).decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
}

// 專屬連結 # 後面那段：名字、樞理建議的燈、是不是新信眾（f: 1）
export function encodeLink({ name, suggested, newcomer = false }) {
  const data = { n: String(name ?? ""), s: suggested ?? [] };
  if (newcomer) data.f = 1;
  return `#${toBase64Url(JSON.stringify(data))}`;
}

// 讀專屬連結；壞掉、沒有名字：null。不認得的燈丟掉、重複的只留一個、名字最多 40 個字
export function decodeLink(hash) {
  const code = String(hash ?? "").replace(/^#/, "");
  if (code.length > 2000 || !/^[A-Za-z0-9_-]+$/.test(code)) return null; // 太長：當作壞掉（不花時間解）
  let data;
  try {
    data = JSON.parse(fromBase64Url(code));
  } catch {
    return null;
  }
  const name = cleanName(data?.n);
  return name ? { name, suggested: cleanLamps(data.s), newcomer: data.f === 1 } : null;
}

// 樞理做連結：base 是做連結那一頁的網址（lamp.html 在它旁邊）。error："name" 沒打名字、"lamps" 沒勾燈
export function makeLink({ name, suggested, newcomer = false, base }) {
  const n = cleanName(name);
  const s = cleanLamps(suggested);
  if (!n) return { error: "name" };
  if (!s.length) return { error: "lamps" };
  const url = new URL("lamp.html", base).href + encodeLink({ name: n, suggested: s, newcomer });
  const message = `${n} 您好，這是您的光明燈登記連結，點開就可以登記：\n${url}`;
  return { error: null, url, line: `https://line.me/R/msg/text/?${encodeURIComponent(message)}` };
}

// 新信眾要有生日和地址（往年信眾不送這兩樣）；不齊：null
function newcomerInfo({ newcomer, birth, address }) {
  if (!newcomer) return { birth: "", address: "" };
  const b = lunarBirth(birth);
  const a = String(address ?? "").trim().slice(0, ADDRESS_MAX);
  return b && a ? { birth: b, address: a } : null;
}

// 送到試算表的一筆：名字、燈、新信眾的資料不對就 null（不送）。followed：登記的燈跟樞理建議的一模一樣（順序不管）
export function buildEntry({ name, lamps, suggested, id, newcomer = false, birth, address }) {
  const n = cleanName(name);
  const l = cleanLamps(lamps);
  const s = cleanLamps(suggested);
  const info = newcomerInfo({ newcomer, birth, address });
  if (!n || !l.length || !info) return null;
  const followed = s.length > 0 && s.length === l.length && s.every((x) => l.includes(x));
  return { id, name: n, newcomer: !!newcomer, ...info, followed, lamps: l.map(lampLabel), suggested: s.map(lampLabel) };
}
