// 光明燈「一戶一個連結」：Excel 匯入、分戶、算錢。只有計算（方便測試），規格在 test/household.test.mjs。
// 畫面：樞理用 lamp-admin.html（js/lamp-admin-view.js）、信眾用 household.html（js/household-view.js）；
// 讀寫試算表在 js/lamp-store.js、tools/lamp-sheet.gs。
//
// 2026-11-26 使用者：「Excel 匯入信眾與家戶資料 → 系統自動建立各戶登記資料 → 產生專屬登記與付款連結 →
// 信眾核對資料是否正確，點選確認即為同意 → 選擇支付方式並付款 → 核對款項並更新登記狀態」；
// 大燈 3600、小燈 1800；一戶一個連結；先做轉帳，綠界之後接；祭改「功能可以先做好」。
// Excel 一列一盞燈；一家人「每列都寫地址，同地址就是一家，甚至有的地址不一樣，只有順序排在一起」
// → 系統先猜（地址換了 = 下一戶），樞理在匯入畫面上自己合併、分開。

export const DEFAULT_PRICES = { big: 3600, small: 1800, jigai: 0 }; // jigai 0：祭改另計（不算進這次的錢）
export const CARD_FEE_RATE = 0.028; // 信用卡：金流頁面上加 2.8%
export const SIZE_NAMES = { big: "大燈", small: "小燈" };
export const STATUS = { pending: "待確認", confirmed: "已確認", reported: "已回報付款", paid: "已付款" };
export const MAX_HOUSEHOLDS = 500; // 一次匯入最多幾戶
export const MAX_LINES = 60; // 一戶最多幾列（人×燈）

// Excel 標題 → 欄位（標題裡的空白不算：「生 日」「地　址」也認得）
const HEADERS = [
  ["name", /姓名|名字|信眾|戶名/],
  ["birth", /生日|出生/],
  ["hour", /時辰/],
  ["lamp", /光明燈|燈/],
  ["zodiac", /生肖/],
  ["jigai", /祭改/],
  ["address", /地址/],
  ["amount", /^金額$/]
];

const text = (v) => String(v ?? "").replace(/ /g, " ").trim();
const squeeze = (v) => text(v).replace(/\s+/g, "");

// 找標題那一列（前 15 列裡第一個像標題的）：{ at: 第幾列, cols: { name: 0, lamp: 3, … } }；找不到：null
export function findHeader(rows) {
  for (let r = 0; r < Math.min(rows.length, 15); r++) {
    const cells = (rows[r] ?? []).map(squeeze);
    if (!cells.some((c) => /地址|光明燈/.test(c))) continue;
    const cols = {};
    cells.forEach((c, i) => {
      if (!c) return;
      const hit = HEADERS.find(([key, re]) => !(key in cols) && re.test(c));
      if (hit) cols[hit[0]] = i;
    });
    // 最上面的大標題（「115年光明燈名冊」）不算：標題列要有燈或祭改，再加至少兩個認得的欄
    if (!("lamp" in cols) && !("jigai" in cols)) continue;
    if (Object.keys(cols).length < 3) continue;
    // 名字那欄常常沒有標題（截圖裡 A 欄是空的）：沒寫就當作第一欄
    if (!("name" in cols)) cols.name = 0;
    return { at: r, cols };
  }
  return null;
}

const splitItems = (v) =>
  text(v)
    .split(/[、,，;；\n]+/)
    .map((t) => t.trim())
    .filter(Boolean);

const toAmount = (v) => {
  const n = Number(text(v).replace(/[^\d.]/g, ""));
  return text(v) && Number.isFinite(n) ? Math.round(n) : null;
};

// Excel 的每一列 → 一筆（一個人的一列）。名字空白：跟上一列同一個人（一盞燈一列，第二列以後常常不寫名字）。
// 完全空白、沒有燈也沒有祭改的列：跳過。回傳 { records, error }
export function readRows(rows) {
  const header = findHeader(rows);
  if (!header) return { records: [], error: "header" };
  const { at, cols } = header;
  const get = (row, key) => (key in cols ? text(row[cols[key]]) : "");
  const records = [];
  let last = null;
  for (let r = at + 1; r < rows.length; r++) {
    const row = rows[r] ?? [];
    const lamps = splitItems(get(row, "lamp"));
    const jigai = splitItems(get(row, "jigai"));
    let name = get(row, "name");
    if (!lamps.length && !jigai.length) {
      continue; // 小計列、空白列
    }
    const continued = !name && last !== null;
    if (!name && !last) continue; // 第一筆就沒有名字：不知道是誰，跳過
    if (continued) name = last.name;
    const record = {
      row: r + 1, // Excel 上看到的列號
      name: name.slice(0, 40),
      birth: get(row, "birth") || (continued ? last.birth : ""),
      hour: get(row, "hour") || (continued ? last.hour : ""),
      zodiac: get(row, "zodiac") || (continued ? last.zodiac : ""),
      address: (get(row, "address") || (continued ? last.address : "")).slice(0, 120),
      lamps: lamps.map((t) => t.slice(0, 20)),
      jigai: jigai.map((t) => t.slice(0, 20)),
      amount: toAmount(get(row, "amount")),
      continued
    };
    records.push(record);
    last = record;
  }
  return { records, error: records.length ? null : "empty" };
}

const sameAddress = (a, b) => squeeze(a).replace(/臺/g, "台") === squeeze(b).replace(/臺/g, "台");

// 先猜哪裡是新的一戶：breaks[i] = true 表示第 i 筆是新的一戶的開頭。
// 同一個人（名字空白接著寫、或跟上一筆同名）不會被分開；地址換了才算下一戶。樞理之後可以自己改
export function guessBreaks(records) {
  return records.map((r, i) => {
    if (i === 0) return true;
    const prev = records[i - 1];
    if (r.continued || r.name === prev.name) return false;
    return !sameAddress(r.address, prev.address);
  });
}

// 這盞燈是大燈還是小燈：名目裡有 → 照名目；沒有 → 看 Excel 的金額（3600 大、1800 小）；都不知道：null（樞理要選）
export function guessSize(lampName, amount, catalog, prices = DEFAULT_PRICES) {
  if (catalog?.big?.includes(lampName)) return "big";
  if (catalog?.small?.includes(lampName)) return "small";
  if (amount === prices.big) return "big";
  if (amount === prices.small) return "small";
  return null;
}

// 一筆的燈的大小：每盞燈一個（一格寫好幾盞時，金額是加起來的，只好一盞一盞照名目猜）
export function guessSizes(record, catalog, prices = DEFAULT_PRICES) {
  const amount = record.lamps.length === 1 ? record.amount : null;
  return record.lamps.map((n) => guessSize(n, amount, catalog, prices));
}

// 照 breaks 分成一戶一戶。sizes[i][j]：第 i 筆第 j 盞燈的大小。
// 一戶 = { name: 第一個人的名字, address: 第一個有寫的地址, people: [{ name, birth, hour, zodiac, address, lamps: [{ name, size }], jigai: [名目] }] }
export function groupHouseholds(records, breaks, sizes) {
  const out = [];
  records.forEach((r, i) => {
    if (breaks[i] || !out.length) out.push({ name: r.name, address: "", people: [] });
    const home = out[out.length - 1];
    if (!home.address && r.address) home.address = r.address;
    let person = home.people.find((p) => p.name === r.name);
    if (!person) {
      person = { name: r.name, birth: r.birth, hour: r.hour, zodiac: r.zodiac, address: r.address, lamps: [], jigai: [] };
      home.people.push(person);
    }
    r.lamps.forEach((n, j) => person.lamps.push({ name: n, size: sizes?.[i]?.[j] ?? null }));
    for (const j of r.jigai) if (!person.jigai.includes(j)) person.jigai.push(j);
  });
  return out;
}

// 匯入前檢查：還有不知道大小的燈 → { error: "size", at: 第幾戶 }；太多戶、一戶太多列也不行
export function checkImport(households) {
  if (!households.length) return { error: "empty" };
  if (households.length > MAX_HOUSEHOLDS) return { error: "many" };
  for (let h = 0; h < households.length; h++) {
    const lines = households[h].people.reduce((n, p) => n + p.lamps.length + p.jigai.length, 0);
    if (lines > MAX_LINES) return { error: "lines", at: h };
    if (households[h].people.some((p) => p.lamps.some((l) => !SIZE_NAMES[l.size]))) return { error: "size", at: h };
  }
  return { error: null };
}

const priceOf = (prices, key) => {
  const n = Number(prices?.[key]);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : 0;
};

// 一戶要付多少：光明燈照大小算；祭改有設價錢才算（沒設：另計，不算進來）
export function householdTotal(household, prices = DEFAULT_PRICES) {
  let lamps = 0;
  let jigai = 0;
  for (const p of household?.people ?? []) {
    for (const l of p.lamps) lamps += priceOf(prices, l.size);
    jigai += p.jigai.length * priceOf(prices, "jigai");
  }
  return { lamps, jigai, total: lamps + jigai };
}

// 一個人在 Excel 的金額跟系統算的不一樣（例如名目、大小選錯）：給樞理看的提醒
export function amountMismatch(record, sizes, prices = DEFAULT_PRICES) {
  if (record.amount == null) return null;
  const counted = sizes.reduce((n, s) => n + priceOf(prices, s), 0) + record.jigai.length * priceOf(prices, "jigai");
  return counted === record.amount ? null : { excel: record.amount, counted };
}

// 信用卡：金流頁面上加 2.8%（四捨五入到元）
export const cardAmount = (total, rate = CARD_FEE_RATE) => Math.round(total * (1 + rate));

export const money = (n) => `NT$ ${Math.round(Number(n) || 0).toLocaleString("en-US")}`;

// 轉帳回報：帳號末五碼，一定是 5 個數字（全形也認得）
export function cleanLast5(v) {
  const digits = text(v).replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0));
  return /^\d{5}$/.test(digits) ? digits : null;
}

// 一戶的連結：household.html#h=編號（編號在 # 後面：不會送到網站伺服器、不會進網站紀錄）
export const householdLink = (base, id) => `${new URL("household.html", base).href}#h=${encodeURIComponent(id)}`;
export function readHouseholdHash(hash) {
  const m = /^#?h=([A-Za-z0-9_-]{8,64})$/.exec(String(hash ?? ""));
  return m ? m[1] : null;
}

export function lineShare(householdName, url) {
  const message = `${householdName} 您好，這是您家今年的光明燈登記資料，請點開核對，確認後就可以付款：\n${url}`;
  return `https://line.me/R/msg/text/?${encodeURIComponent(message)}`;
}

// 信眾看到的每一行：「大燈・生意興隆　NT$ 3,600」
export function personLines(person, prices = DEFAULT_PRICES) {
  const lines = person.lamps.map((l) => ({ label: `${SIZE_NAMES[l.size] ?? "燈"}・${l.name}`, amount: priceOf(prices, l.size) }));
  const jp = priceOf(prices, "jigai");
  for (const j of person.jigai) lines.push({ label: `祭改・${j}`, amount: jp, separate: !jp });
  return lines;
}
