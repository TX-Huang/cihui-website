"""比較用的油畫版首頁（網址 ?look=oil 月白油畫、?look=oil-red 朱紅油畫）：大門、背景、開場的圖。
用法: python -I tools/prep_oil.py
輸入: assets/raw/chatgpt2/（都是 AI Video 用 FLUX 改現在的圖做的，構圖一樣）
  oil-gate-a2-flat.png、oil-gate-b2-flat.png：大門（背景、門洞、窗格已經是純綠）
  oil-bg-a2.png、oil-bg-b2.png：瑤池背景（有才做；水平線要跟 bg-yaochi 一樣在 57.5%）
  oil-intro-earth-3.png：開場的凡間
  oil-intro-clouds.png、oil-intro-clouds-2.png：開場的雲（黑底）
輸出: assets/oil/

做法：
- 大門：放大成跟現在的大門一樣大（3054x2043），透明度直接用現在大門的
  （AI Video 也是用這個遮罩把背景塗綠的），所以門洞、匾額、青鳥停的點全部一樣，js/gate.js 不用重量。
  邊緣半透明的地方把混進來的綠扣掉。
- 雲：黑底 → 用亮度當透明度（暗的地方透明），顏色除回去，邊緣不會發黑。
"""
from pathlib import Path

import numpy as np
from PIL import Image

RAW = Path("assets/raw/chatgpt2")
OUT = Path("assets/oil")
OUT.mkdir(parents=True, exist_ok=True)


def gate(src, dst):
    live = Image.open("assets/gate-grand.webp").convert("RGBA")
    im = Image.open(RAW / src).convert("RGB").resize(live.size, Image.LANCZOS)
    rgb = np.asarray(im).astype(float)
    alpha = np.asarray(live)[..., 3].astype(float)
    # 綠比紅和藍都高的地方（邊緣混到的綠）：綠壓到紅藍的最大值
    rgb[..., 1] = np.minimum(rgb[..., 1], np.maximum(rgb[..., 0], rgb[..., 2]) + 6)
    out = np.dstack([rgb, alpha]).clip(0, 255).astype(np.uint8)
    Image.fromarray(out, "RGBA").save(OUT / dst, quality=85, method=6)
    print(dst, live.size, f"{(OUT / dst).stat().st_size // 1024} KB")


def clouds(src, dst):
    a = np.asarray(Image.open(RAW / src).convert("RGB")).astype(float)
    lum = a.max(axis=2)
    alpha = np.clip((lum - 70) / 90, 0, 1)
    rgb = np.where(alpha[..., None] > 0, a / np.maximum(alpha[..., None], 0.35), 0)
    out = np.dstack([rgb, alpha * 255]).clip(0, 255).astype(np.uint8)
    Image.fromarray(out, "RGBA").save(OUT / dst, quality=85, method=6)
    print(dst, f"{(OUT / dst).stat().st_size // 1024} KB")


def plain(src, dst, size=None):
    p = RAW / src
    if not p.exists():
        print("skip", src, "(還沒有)")
        return
    im = Image.open(p).convert("RGB")
    if size:
        im = im.resize(size, Image.LANCZOS)
    im.save(OUT / dst, quality=85, method=6)
    print(dst, im.size, f"{(OUT / dst).stat().st_size // 1024} KB")


gate("oil-gate-a2-flat.png", "gate.webp")
gate("oil-gate-b2-flat.png", "gate-red.webp")
plain("oil-bg-a2.png", "bg.webp", (1536, 1024))
plain("oil-bg-b2.png", "bg-red.webp", (1536, 1024))
plain("oil-intro-earth-3.png", "intro-earth.webp")
clouds("oil-intro-clouds.png", "intro-clouds.webp")
clouds("oil-intro-clouds-2.png", "intro-clouds-2.webp")
