"""三太子的風火輪：AI Video 做的火焰影片（黑底）變成動畫圖集，輪子另外剪下來給程式轉。
用法: python -I tools/prep_fenghuolun.py
輸入: assets/raw/chatgpt2/fenghuolun-soft-frames/0001～0107.png（H3，黑底，1920x1088，最後一格＝第一格）
      （第一格是 fenghuolun-soft-start.png：原本風格重畫的輪子 #2 放在純黑上；輪子圓盤從影片第一格剪）
輸出: assets/elements/fenghuolun.webp（火焰動畫圖集）、fenghuolun-wheel.webp（左右兩個輪子的圓盤）、fenghuolun.json

做法：
1. 火焰：黑底 → 用亮度當透明度（暗的地方透明），顏色除回去。影片中段底下有一層很淡的灰煙，
   灰色、不夠亮的地方門檻再拉高（白色的風捲雲很亮，會留下來）。每 2 格取 1 格（54 格），播的時候兩格之間混過去。
2. 輪子：影片裡輪子幾乎不轉（H3 只會讓火動），所以從第一格把兩個輪子的圓盤剪下來，
   網頁上蓋在影片的輪子上面、由程式轉。輪子中心用「轉 36 度（10 根輻條）跟原來最像」找；
   半徑 138：再往外就是火焰了（量過：半徑 144 以外橘紅色突然變多）。
3. 不調淡：原本風格已經很淡雅（只有鳳凰是油畫風，2026-11-15 定案）。
"""
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage

sys.path.insert(0, str(Path(__file__).parent))
from tone import tone  # noqa: E402

RAW = Path("assets/raw/chatgpt2")
OUT = Path("assets/elements")
CELL_W = 400
COLS = 6
STRIDE = 2
R = 138  # 輪子圓盤半徑（原圖像素）
SPOKES = 10
TONE = 0


def key(path):
    im = np.asarray(Image.open(path).convert("RGB")).astype(float)
    lum = im.max(axis=2)
    a = np.clip((lum - 50) / 90, 0, 1)
    # 灰煙：不鮮豔、也不夠亮（白色的風捲雲很亮，保留）→ 門檻拉高到 130
    sat = (lum - im.min(axis=2)) / np.maximum(lum, 1)
    grey = np.clip((0.3 - sat) / 0.15, 0, 1)
    a = a * (1 - grey) + np.clip((lum - 130) / 70, 0, 1) * grey
    rgb = np.where(a[..., None] > 0, im / np.maximum(a[..., None], 0.3), 0)
    rgb = tone(np.clip(rgb, 0, 255), TONE)
    return np.dstack([rgb, a * 255]).clip(0, 255).astype(np.uint8)


def wheel_center(gray, est):
    """轉一根輻條的角度後跟原來最像的那一點"""
    best = None
    for dy in range(-20, 21, 2):
        for dx in range(-20, 21, 2):
            cx, cy = est[0] + dx, est[1] + dy
            patch = gray[cy - 120 : cy + 120, cx - 120 : cx + 120]
            rot = ndimage.rotate(patch, 360 / SPOKES, reshape=False, order=1)
            yy, xx = np.mgrid[-120:120, -120:120]
            v = np.abs(rot - patch)[(xx**2 + yy**2) < 108**2].mean()
            if best is None or v < best[0]:
                best = (v, cx, cy)
    return best[1], best[2]


files = sorted((RAW / "fenghuolun-soft-frames").glob("*.png"))[:-1:STRIDE]  # 最後一格＝第一格，不取
frames = [key(f) for f in files]
H, W = frames[0].shape[:2]
union = np.zeros((H, W), bool)
for f in frames:
    union |= f[..., 3] > 25
ys, xs = np.nonzero(union)
box = (max(0, xs.min() - 4), max(0, ys.min() - 4), min(W, xs.max() + 5), min(H, ys.max() + 5))
k = CELL_W / (box[2] - box[0])
ch = round((box[3] - box[1]) * k)
rows = (len(frames) + COLS - 1) // COLS
atlas = Image.new("RGBA", (COLS * CELL_W, rows * ch), (0, 0, 0, 0))
rects = []
for i, f in enumerate(frames):
    cell = Image.fromarray(f, "RGBA").crop(box).resize((CELL_W, ch), Image.LANCZOS)
    x, y = (i % COLS) * CELL_W, (i // COLS) * ch
    atlas.alpha_composite(cell, (x, y))
    rects.append([x, y, CELL_W, ch, STRIDE])
OUT.mkdir(parents=True, exist_ok=True)
atlas.save(OUT / "fenghuolun.webp", quality=72, method=6)

# 輪子圓盤
# 從影片第一格剪（H3 重新編碼後輪子跟起始圖差幾像素，要對齊影片裡的輪子）
start = np.asarray(Image.open(files[0]).convert("RGB")).astype(float)
gray = start.mean(axis=2)
centers = [wheel_center(gray, (765, 559)), wheel_center(gray, (1157, 560))]
d = round(2 * R * k)
sheet = Image.new("RGBA", (d * 2, d), (0, 0, 0, 0))
yy, xx = np.mgrid[-R:R, -R:R]
edge = np.clip((R - np.hypot(xx + 0.5, yy + 0.5)) / 4, 0, 1)  # 邊緣 4 像素淡出
wheels = []
for i, (cx, cy) in enumerate(centers):
    # 輻條之間的黑底要透明（網頁會先把影片裡的輪子挖掉，再畫這個會轉的圓盤）
    disc = start[cy - R : cy + R, cx - R : cx + R]
    da = np.clip((disc.max(axis=2) - 45) / 70, 0, 1)
    disc = tone(np.clip(disc / np.maximum(da[..., None], 0.3), 0, 255), TONE)
    rgba = np.dstack([disc, da * edge * 255]).clip(0, 255).astype(np.uint8)
    sheet.alpha_composite(Image.fromarray(rgba, "RGBA").resize((d, d), Image.LANCZOS), (i * d, 0))
    wheels.append({"x": round((cx - box[0]) * k, 1), "y": round((cy - box[1]) * k, 1), "r": round(R * k, 1), "src": [i * d, 0, d, d]})
sheet.save(OUT / "fenghuolun-wheel.webp", quality=85, method=6)

meta = {"atlas": list(atlas.size), "frames": rects, "width": CELL_W, "height": ch, "wheels": wheels}
(OUT / "fenghuolun.json").write_text(json.dumps(meta), encoding="utf-8")
print("frames", len(frames), "cell", (CELL_W, ch), "aspect", round(CELL_W / ch, 2), "atlas", atlas.size,
      f"{(OUT / 'fenghuolun.webp').stat().st_size // 1024} KB", "wheels", centers)
