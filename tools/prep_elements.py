"""把仙佛元素的圖（透明背景 PNG）裁掉多餘的透明邊、縮小，存成網頁用的 webp。
用法: python -I tools/prep_elements.py
輸入: assets/raw/chatgpt2/rice.png、lotus-open.png、lotus-bud.png、lotus-leaf.png、tiger.png
輸出: assets/elements/*.webp，和 elements.json（每張多大、稻穗莖的底部在哪）
"""
import json
from pathlib import Path

import numpy as np
from PIL import Image

RAW = Path("assets/raw/chatgpt2")
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
    if name == "rice":
        # 顏色壓低一點（配月白素雅）：往灰階靠 25%
        arr = np.asarray(im).astype(float)
        gray = arr[..., :3] @ np.array([0.299, 0.587, 0.114])
        arr[..., :3] = arr[..., :3] * 0.75 + gray[..., None] * 0.25
        im = Image.fromarray(arr.clip(0, 255).astype(np.uint8), "RGBA")
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
