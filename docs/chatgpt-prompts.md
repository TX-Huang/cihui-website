# 用 ChatGPT（GPT Image）生圖 — 方向 A「月白素雅」

定案方向：**A 月白素雅**（2026-11-08）。參考圖：`docs/previews/style-A-vs-B.jpg` 的**左半邊**。

## 怎麼做

1. 每張圖**開一個新對話**。
2. 先把 `docs/previews/style-A-vs-B.jpg` 上傳給 ChatGPT 當參考圖（它會照左半邊的風格畫）。
3. 把下面整段英文貼上。
4. 不滿意就在同一個對話叫它改（例如「屋簷再翹一點」「牆再暖一點」）。
5. 滿意後下載 PNG，放到 `assets/raw/`，檔名照下面寫。

**建議順序：先只做 `gate.png`**，我換進網站給你看，方向對了再做其他的。

---

## 1. `gate.png` — 拱門（最重要）

> Create an image. Size 1024x1536 (portrait). Transparent background PNG.
>
> Use the LEFT half of the attached image only as a style reference (palette, materials, mood) — do not copy its layout.
>
> A perfectly symmetrical, straight-on front orthographic view of an elegant, modern Taiwanese Taoist daochang (道場) gate. Quiet luxury, like a high-end zen resort — refined and calm, not a traditional busy temple and not an imperial palace.
> Double-eave roof with pale warm stone-colored matte tiles; eaves only gently upturned; very minimal ridge ornaments.
> Matte moon-white plaster walls and square pillars with a fine, soft texture. Only ultra-thin pale gold lines as accents.
> A light natural-wood horizontal plaque with a hairline pale-gold border centered above the doorway — completely blank, no characters.
> In the center, a tall round-topped arched doorway (semicircle top, straight vertical sides) with a slim pale stone arch frame. The doorway opening must be fully transparent (empty) — no doors, nothing inside it.
> Three wide pale stone steps at the bottom.
> NO lanterns, no red, no painted decoration, no people, no text, no sky, no trees, no ground beyond the steps.
> Soft diffused dawn light from the upper left, subtle shadows, photorealistic with a slight painterly softness, very fine detail.

## 2. `bg.png` — 瑤池背景

> Create an image. Size 1536x1024 (landscape).
>
> Use the LEFT half of the attached image only as a style reference (palette and mood) — but show no buildings.
>
> The mythical Jade Pool (瑤池) on Mount Kunlun at dawn. Layered distant mountains dissolving into soft mist; an almost monochrome palette of moon white, pale mist blue and warm grey, with the faintest blush of dawn near the horizon.
> In the lower part, a vast, perfectly still pool like a mirror, reflecting the sky and mountains.
> Keep the center open and quiet (mist, distant mountains) because a gate will be placed in the middle later.
> Huge negative space, quiet luxury, serene and sacred. No buildings, no people, no birds, no text.

## 3. `koi-1.png`、`koi-2.png`、`koi-3.png` — 鯉魚（一張一隻）

每次把 `[COLOR]` 換掉（配合月白色調，選高雅的花色）：

- koi-1：`platinum white with a soft pale-gold sheen (platinum ogon)`
- koi-2：`pure white with a single soft vermilion patch on the head (tancho)`
- koi-3：`silver-grey with delicate blue-grey scale edges (asagi)`

> Create an image. Size 1536x1024 (landscape). Transparent background PNG.
>
> A single ornamental koi carp seen from directly above, as if looking straight down into water. The body is straight and horizontal, head pointing to the RIGHT, long flowing translucent butterfly fins and tail spread wide. Color: [COLOR].
> Refined, elegant, realistic with a slight painterly softness, finely detailed scales.
> Only the fish — no water, no shadow, no ripples, no text.

---

## 網站要一起改的地方（等新圖來了一起做）

- 珠簾：發光的紅綠珠子 → 深墨色字＋一點淡金（白底上才看得清楚）
- 花瓣：粉紅 → 很淡的白色花瓣或光點
- 匾額字：金色漸層 → 低調的深色刻字
- 文字：白字 → 深灰墨色；頂部選單改成淺色霧面玻璃
- 四位神明的區別：同一張黎明背景，換不同的晨光色調（金母：月白、玄女：淡紫、元帥：暖橘晨光、福德：暖金午後）
