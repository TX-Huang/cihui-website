# 美術素材清單（AI 生成用）

> 實際使用：Higgsfield 的 `nano_banana_pro`（免費方案可用，2k 一張 2 點）。
> 去背 / 裁切腳本：`tools/cut_gate.py`、`tools/cut_koi.py`。原圖在 `assets/raw/`。
> 拱門第二版：用第一版當參考圖改色成米白牆、淡青瓷瓦、香檳金（第一版太沉重）。

放到 `assets/` 資料夾。檔名照下面寫，程式會直接讀。

## 1. gate.png — 道場拱門（含屋頂）

- 透明背景 PNG，正面、置中，至少 2000px 寬
- 門洞要是**透明的**（珠簾會從程式放進去）

> Perfectly symmetrical front orthographic view of an elegant Taiwanese Taoist daochang (道場) gate, serene and light, not a heavy temple: double-eave roof with pale celadon jade-green glazed tiles and gently upturned eave tips, ivory off-white walls and pillars, champagne gold trim, light honey wood brackets, a light wooden plaque with champagne gold border above the doorway (blank, no text), a tall round-topped arched doorway in the center whose inside is pure solid black, three pale stone steps. NO lanterns. Painterly realism, soft moonlight. Isolated on a flat solid pure green (#00FF00) background, no people, no text.

## 2. bg-yaochi.jpg — 瑤池與崑崙山背景

- 16:9，至少 2560×1440，中間偏下留空給拱門

> Mystical night landscape of the Jade Pool (瑤池) on Mount Kunlun from Chinese mythology: layered misty jade-green mountains in Chinese ink-wash style, a calm luminous jade-colored pool in the foreground reflecting the sky, drifting clouds and mist, a few peach trees in blossom at the edges, faint glow in the center. Deep teal and jade palette, cinematic, painterly, calm and sacred. No buildings in the center, no people, no text.

## 3. koi-*.png — 鯉魚（從正上方看）

- 每隻一張，**平面純色背景**（之後去背），身體拉直、頭朝右，至少 1500px 寬
- 想要 4–6 種顏色：紅白、金色、黑紅白、白金、玉綠

> A single ornamental koi carp seen from directly above, as if looking down into still water. Body straight and horizontal, head pointing right, long flowing translucent fins and tail spread wide. Traditional Chinese painting style with fine detailed scales, [COLOR: red and white / golden / black red and white / white and gold / jade green]. Isolated on a flat solid #808080 background, no shadow, no water, no text.

## 4. peach.png — 蟠桃（可選）

> A single Chinese immortal peach (蟠桃) with two green leaves, soft pink blush, painterly Chinese style, isolated on flat solid #808080 background, no text.

## 5. bird.png — 青鳥（可選，金母的使者）

> A mythical blue bird (青鳥) messenger of the Queen Mother of the West, side view in flight, wings spread, elegant long tail feathers, azure and teal plumage, Chinese gongbi painting style, isolated on flat solid #808080 background, no text.
- 不要燈籠（使用者覺得醜）。生成時背景用跟主體反差大的純色（例：#00FF00），米白牆配白底會去背失敗。
