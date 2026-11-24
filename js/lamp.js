// 光明燈登記：燈的名目、專屬連結、送到試算表的資料。只有計算（方便測試）；
// 讀寫試算表在 js/lamp-store.js；畫面在 js/lamp-view.js（登記頁 lamp.html）和 js/lamp-link-view.js（樞理做連結的 lamp-link.html）。
// 規格在 test/lamp.test.mjs。
import { lunarDate } from "./events.js";

// Google 試算表的網址（Apps Script 部署成「網頁應用程式」後拿到的網址，做法在 tools/lamp-sheet.gs 最上面）。
// 空的：試用模式（名目只存在這台裝置、密碼 1234、登記不會真的送出）
export const SHEET_URL = "https://script.google.com/macros/s/AKfycbwUU_LvGeGIOM9tEiVfZMQxwVtb0frTkwzIRQnh9lk80zn1JA5xeMP-JlneTwGHk8sy3A/exec";
export const DEMO_PASSWORD = "1234";

// 燈的名目由樞理自己填（試算表的「燈的名目」分頁，或做連結的頁）。大燈、小燈各最多 6 個（使用者：「各6」）
export const SIZES = { big: "大燈", small: "小燈" };
export const MAX_PER_SIZE = 6;
export const LAMP_NAME_MAX = 20;
export const NAME_MAX = 40;
export const ADDRESS_MAX = 120;
export const thisRocYear = () => new Date().getFullYear() - 1911;

// 試用模式一開始的名目（樞理填好、存好以後就換掉）
export const DEMO_CATALOG = {
  big: ["一", "二", "三", "四", "五", "六"].map((n) => `名目${n}（待填）`),
  small: ["一", "二", "三", "四", "五", "六"].map((n) => `名目${n}（待填）`)
};

const tidyList = (list) => (Array.isArray(list) ? list : []).map((t) => String(t ?? "").trim().slice(0, LAMP_NAME_MAX)).filter(Boolean);

// 讀進來的名目整理好：去掉空白和空格子、重複的只留一個、每個最多 20 字、每種最多 6 個
export function cleanCatalog(raw) {
  const out = {};
  for (const size of Object.keys(SIZES)) out[size] = [...new Set(tidyList(raw?.[size]))].slice(0, MAX_PER_SIZE);
  return out;
}

// 樞理改的名目，存之前檢查：error "long" 超過 20 字、"many" 超過 6 個、"same" 同一種燈有兩個一樣的、
// "symbol" 用 = + - @ 開頭（試算表會當成公式）
export function checkCatalogEdit(raw) {
  for (const size of Object.keys(SIZES)) {
    const list = (Array.isArray(raw?.[size]) ? raw[size] : []).map((t) => String(t ?? "").trim()).filter(Boolean);
    if (list.some((t) => t.length > LAMP_NAME_MAX)) return { error: "long", size };
    if (list.some((t) => /^[=+\-@]/.test(t))) return { error: "symbol", size };
    if (list.length > MAX_PER_SIZE) return { error: "many", size };
    if (new Set(list).size !== list.length) return { error: "same", size };
  }
  return { error: null, catalog: cleanCatalog(raw) };
}

// 一盞燈 = 大小＋名目的名字（"big:光明"）。連結記這個，不記第幾格：改名、換順序都不會指錯燈
export const lampKey = (size, name) => `${size}:${name}`;
const splitKey = (key) => {
  const m = /^(big|small):(.+)$/.exec(String(key ?? ""));
  return m && m[2].length <= LAMP_NAME_MAX ? { size: m[1], name: m[2] } : null;
};
export function lampLabel(key) {
  const k = splitKey(key);
  return k ? `${SIZES[k.size]}・${k.name}` : null;
}
export const keysOf = (catalog) => Object.keys(SIZES).flatMap((size) => (catalog?.[size] ?? []).map((n) => lampKey(size, n)));
// 只留現在還有的燈（名目改了，舊連結裡沒有的就丟掉）
export function knownLamps(keys, catalog) {
  const now = new Set(keysOf(catalog));
  return [...new Set(Array.isArray(keys) ? keys : [])].filter((k) => now.has(k));
}

const cleanName = (name) => String(name ?? "").trim().slice(0, NAME_MAX);
const wellFormed = (keys) => [...new Set((Array.isArray(keys) ? keys : []).filter((k) => typeof k === "string" && splitKey(k)))];

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

// 讀專屬連結；壞掉、沒有名字：null。格式不對的燈丟掉、重複的只留一個、名字最多 40 個字。
// （燈現在還有沒有，要等讀到名目以後用 knownLamps 再篩）
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
  return name ? { name, suggested: wellFormed(data.s), newcomer: data.f === 1 } : null;
}

// 樞理做連結：base 是做連結那一頁的網址（lamp.html 在它旁邊）。error："name" 沒打名字、"lamps" 沒勾（現在有的）燈
export function makeLink({ name, suggested, newcomer = false, base, catalog }) {
  const n = cleanName(name);
  const s = knownLamps(suggested, catalog);
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
export function buildEntry({ name, lamps, suggested, id, newcomer = false, birth, address, catalog }) {
  const n = cleanName(name);
  const l = knownLamps(lamps, catalog);
  const s = knownLamps(suggested, catalog);
  const info = newcomerInfo({ newcomer, birth, address });
  if (!n || !l.length || !info) return null;
  const followed = s.length > 0 && s.length === l.length && s.every((x) => l.includes(x));
  return { action: "register", id, name: n, newcomer: !!newcomer, ...info, followed, lamps: l.map(lampLabel), suggested: s.map(lampLabel) };
}
