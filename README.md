# 慈惠道場網站

主祀瑤池金母，陪祀九天玄女、中壇元帥、福德正神。

## 效果

- 全螢幕瑤池背景，拱門門洞裡掛著「字做的珠簾」：滑鼠碰到會晃、可以拉，還有五聲音階的風鈴聲
- 往下滑 = 走進門，換到下一位神明（背景色調、匾額、珠簾一起換）
- 鯉魚在拱門後面游：滑鼠停著會游過來，揮太快或點一下會被嚇跑
- 飄落的蟠桃花瓣

## 本機預覽

ES modules 需要用伺服器開，不能直接雙擊 index.html：

```bash
python -m http.server 5173
```

然後打開 http://localhost:5173

## 測試

```bash
npm test
```

## 檔案

| 檔案 | 用途 |
|---|---|
| `js/deities.js` | 四位神明的文字、顏色（**珠簾文字目前是暫用的，要換成正式經文**） |
| `js/cloth.js` | 珠簾物理（Verlet） |
| `js/chimes.js` | 風鈴聲（Web Audio 即時合成） |
| `js/koi.js` | 鯉魚游動 |
| `js/petals.js` | 花瓣 |
| `js/gate.js` | 拱門圖的門洞、匾額位置 |
| `tools/cut_gate.py`、`tools/cut_koi.py` | AI 圖去背、裁切 |
| `docs/asset-prompts.md` | 生成圖片用的提示詞 |
| `docs/deities-lore.md` | 神明典故研究（附來源） |
