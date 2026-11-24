// 光明燈登記：跟 Google 試算表（tools/lamp-sheet.gs）讀寫。規格在 test/lamp.test.mjs 第 11 點。
// 試算表還沒開通（SHEET_URL 是空的）：試用模式——名目只存在這台裝置、密碼 1234、登記不會真的送出。
import { SHEET_URL, DEMO_PASSWORD, DEMO_CATALOG, cleanCatalog } from "./lamp.js";

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
    register: async () => ({ ok: true, demo: true })
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
    register: (entry) => post(entry)
  };
}

export function createStore({ url = SHEET_URL, fetchFn = globalThis.fetch?.bind(globalThis), storage = safeStorage() } = {}) {
  return url ? sheetStore(url, fetchFn) : demoStore(storage);
}
