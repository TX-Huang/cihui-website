// 光明燈登記：跟 Google 試算表（tools/lamp-sheet.gs）讀寫。規格在 test/lamp.test.mjs 第 11 點。
// 試算表還沒開通（SHEET_URL 是空的）：試用模式——名目只存在這台裝置、密碼 1234、登記不會真的送出。
import { SHEET_URL, DEMO_PASSWORD, DEMO_CATALOG, cleanCatalog } from "./lamp.js";
import { DEFAULT_PRICES, CARD_FEE_RATE, STATUS, householdTotal } from "./household.js";

const DEMO_KEY = "cihui-lamp-demo-catalog";

function safeStorage() {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null; // 瀏覽器不給存：試用模式每次都從頭開始
  }
}

function demoStore(storage) {
  const read = () => {
    try {
      const saved = storage?.getItem(DEMO_KEY);
      return saved ? cleanCatalog(JSON.parse(saved)) : cleanCatalog(DEMO_CATALOG);
    } catch {
      return cleanCatalog(DEMO_CATALOG);
    }
  };
  const login = (password) => (password === DEMO_PASSWORD ? { ok: true } : { ok: false, error: "password" });
  return {
    demo: true,
    loadCatalog: async () => read(),
    checkPassword: async (password) => login(password),
    async saveCatalog(password, catalog) {
      const ok = login(password);
      if (!ok.ok) return ok;
      try {
        if (!storage) throw new Error("no storage");
        storage.setItem(DEMO_KEY, JSON.stringify(cleanCatalog(catalog)));
        return { ok: true };
      } catch {
        return { ok: false, error: "storage" }; // 存不了（私密瀏覽）：不假裝存好
      }
    },
    register: async () => ({ ok: true, demo: true }),
    ...demoHouseholds(storage, login)
  };
}

// ── 一戶一個連結（2026-11-26）：試用模式存在這台裝置 ──
const DEMO_HOMES_KEY = "cihui-lamp-demo-households";
const DEMO_SETTINGS = {
  prices: { ...DEFAULT_PRICES, cardFee: CARD_FEE_RATE },
  bank: { name: "範例銀行（試用）", code: "000", account: "0000-1234-5678", holder: "慈惠道場（試用）" },
  qr: ""
};

function demoHouseholds(storage, login) {
  const all = () => {
    try {
      return JSON.parse(storage?.getItem(DEMO_HOMES_KEY) ?? "[]");
    } catch {
      return [];
    }
  };
  const save = (list) => {
    if (!storage) throw new Error("no storage");
    storage.setItem(DEMO_HOMES_KEY, JSON.stringify(list));
  };
  const summary = ({ people, ...h }) => ({ ...h, people: people.length });
  const change = (id, fn) => {
    const list = all();
    const h = list.find((x) => x.id === id);
    if (!h) return { ok: false, error: "not found" };
    const error = fn(h);
    if (error) return { ok: false, error };
    try {
      save(list);
    } catch {
      return { ok: false, error: "storage" };
    }
    return { ok: true, household: summary(h) };
  };
  return {
    async importHouseholds(password, households) {
      const ok = login(password);
      if (!ok.ok) return ok;
      const list = all();
      const made = households.map((h) => {
        const id = (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}${Math.random()}`).replace(/[^A-Za-z0-9]/g, "").slice(0, 20);
        list.push({ id, name: h.name, address: h.address, people: h.people, total: householdTotal(h).total, status: STATUS.pending, method: "", last5: "" });
        return { id, name: h.name };
      });
      try {
        save(list);
      } catch {
        return { ok: false, error: "storage" };
      }
      return { ok: true, made };
    },
    async listHouseholds(password) {
      const ok = login(password);
      return ok.ok ? { ok: true, households: all().map(summary) } : ok;
    },
    async markPaid(password, id, paid) {
      const ok = login(password);
      if (!ok.ok) return ok;
      return change(id, (h) => {
        h.status = paid ? STATUS.paid : h.last5 ? STATUS.reported : STATUS.confirmed;
      });
    },
    async loadHousehold(id) {
      const h = all().find((x) => x.id === id);
      return h ? { ok: true, household: h, settings: DEMO_SETTINGS } : { ok: false, error: "not found" };
    },
    confirmHousehold: async (id) =>
      change(id, (h) => {
        if (h.status === STATUS.pending) h.status = STATUS.confirmed;
      }),
    reportPayment: async (id, last5) =>
      change(id, (h) => {
        if (h.status === STATUS.pending) return "not confirmed";
        if (h.status !== STATUS.paid) Object.assign(h, { status: STATUS.reported, method: "轉帳", last5 });
      })
  };
}

// 送到試算表：內容是純文字（瀏覽器不用先問一次）；回答是 { ok, … }
function sheetStore(url, fetchFn) {
  const post = async (data) => (await fetchFn(url, { method: "POST", body: JSON.stringify(data) })).json();
  return {
    demo: false,
    async loadCatalog() {
      const out = await (await fetchFn(`${url}?action=lamps`)).json();
      if (!out?.ok) throw new Error("names not read");
      return cleanCatalog(out);
    },
    checkPassword: (password) => post({ action: "login", password }),
    saveCatalog: (password, catalog) => post({ action: "setLamps", password, big: catalog.big, small: catalog.small }),
    register: (entry) => post(entry),
    importHouseholds: (password, households) => post({ action: "importHouseholds", password, households }),
    listHouseholds: (password) => post({ action: "listHouseholds", password }),
    markPaid: (password, id, paid) => post({ action: "markPaid", password, id, paid }),
    loadHousehold: async (id) => (await fetchFn(`${url}?action=household&id=${encodeURIComponent(id)}`)).json(),
    confirmHousehold: (id) => post({ action: "confirmHousehold", id }),
    reportPayment: (id, last5) => post({ action: "reportPayment", id, last5 })
  };
}

// 網址後面加 ?demo=1：強制試用模式（試算表開通後，還是可以在自己的手機上練習、不會寫進試算表）
const forcedDemo = () => {
  try {
    return new URLSearchParams(globalThis.location?.search ?? "").get("demo") === "1";
  } catch {
    return false;
  }
};

export function createStore({ url = forcedDemo() ? "" : SHEET_URL, fetchFn = globalThis.fetch?.bind(globalThis), storage = safeStorage() } = {}) {
  return url ? sheetStore(url, fetchFn) : demoStore(storage);
}
