"""把仙佛元素的圖（透明背景 PNG）裁掉多餘的透明邊、縮小，存成網頁用的 webp。
用法: python -I tools/prep_elements.py
輸入: assets/raw/chatgpt2/keyed/rice.png、lotus-open.png、lotus-bud.png、lotus-leaf.png、tiger.png
      （2026-11-15 起是 AI Video 做的油畫風版本，先用 tools/key_v2.py 去背；
       蓮花本身就畫成金花、青瓷葉了，不用再跑 tools/gold_lotus.py）
輸出: assets/elements/*.webp，和 elements.json（每張多大、稻穗莖的底部在哪）
"""
import json
from pathlib import Path

import numpy as np
from PIL import Image

RAW = Path("assets/raw/chatgpt2/keyed")
OUT = Path("assets/elements")
# 名稱: 縮到多高（像素）
ITEMS = {"rice": 600, "lotus-open": 300, "lotus-bud": 300, "lotus-leaf": 300, "tiger": 300}

OUT.mkdir(parents=True, exist_ok=True)
meta = {}
for name, height in ITEMS.items():
    im = Image.open(RAW / f"{name}.png").convert("RGBA")
    a = np.asarray(im)[..., 3]
    im.putalpha(Image.fromarray(np.where(a < 8, 0, a).astype(np.uint8)))
    im = im.crop(im.getbbox())
    w = round(im.width * height / im.height)
    im = im.resize((w, height), Image.LANCZOS)
    im.save(OUT / f"{name}.webp", quality=84, method=6)
    info = {"w": w, "h": height}
    if name == "rice":
        # 莖的底部在哪（從左邊算的比例）：彎的時候以這點為根
        bottom = np.asarray(im)[-6:, :, 3] > 100
        xs = np.nonzero(bottom.any(axis=0))[0]
        info["baseX"] = round(float(xs.mean()) / w, 3)
    meta[name] = info
    print(name, info)
(OUT / "elements.json").write_text(json.dumps(meta), encoding="utf-8")
