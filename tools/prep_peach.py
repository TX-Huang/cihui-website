"""蟠桃樹的圖：裁掉多餘的透明邊、縮小，存成網頁用的 webp。
用法: python -I tools/prep_peach.py
輸入: assets/raw/chatgpt2/keyed/peach-tree.png（2026-11-15 起是 AI Video 做的油畫風版本，先用 tools/key_v2.py 去背）
輸出: assets/elements/peach-tree.webp
"""
from pathlib import Path

import numpy as np
from PIL import Image

im = Image.open("assets/raw/chatgpt2/keyed/peach-tree.png").convert("RGBA")
a = np.asarray(im)[..., 3]
im.putalpha(Image.fromarray(np.where(a < 8, 0, a).astype(np.uint8)))
im = im.crop(im.getbbox())
h = 1000  # 桌機最高 600 像素，高解析度螢幕 ×2 也夠清楚
im = im.resize((round(im.width * h / im.height), h), Image.LANCZOS)
out = Path("assets/elements/peach-tree.webp")
im.save(out, quality=84, method=6)
print(out, im.size, f"{out.stat().st_size // 1024} KB")
