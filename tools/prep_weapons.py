"""玄女的拂塵和雲氣、三太子的乾坤圈和火尖槍：裁掉透明邊、縮小，存成網頁用的 webp，並量出動畫要用的點。
用法: python -I tools/prep_weapons.py
輸入: assets/raw/chatgpt2/keyed/fuchen.png、cloud-wisp.png、qiankunquan.png、huojianqiang.png（tools/key_v2.py 去背的）
輸出: assets/elements/fuchen.webp、cloud-wisp.webp、qiankunquan.webp、huojianqiang.webp，和 weapons.json：
  fuchen.root：毛從哪裡開始（從上往下的比例）。上面是玉柄（不會彎），下面的毛一段一段彎
  huojianqiang.tip：槍尖火焰的中心（在圖裡的比例 x, y），火星從這裡冒
"""
import json
from pathlib import Path

import numpy as np
from PIL import Image

SRC = Path("assets/raw/chatgpt2/keyed")
OUT = Path("assets/elements")
# 名稱: 縮到多大（長邊像素）
ITEMS = {"fuchen": 900, "cloud-wisp": 700, "qiankunquan": 420, "huojianqiang": 900}

meta = {}
for name, size in ITEMS.items():
    im = Image.open(SRC / f"{name}.png").convert("RGBA")
    a = np.asarray(im)[..., 3]
    im.putalpha(Image.fromarray(np.where(a < 8, 0, a).astype(np.uint8)))
    im = im.crop(im.getbbox())
    k = size / max(im.size)
    im = im.resize((round(im.width * k), round(im.height * k)), Image.LANCZOS)
    im.save(OUT / f"{name}.webp", quality=84, method=6)
    info = {"w": im.width, "h": im.height}
    a = np.asarray(im)[..., 3] > 128
    if name == "fuchen":
        # 每一列不透明的寬度：玉柄很窄，到了毛就突然變寬
        widths = np.array([(np.ptp(np.nonzero(r)[0]) + 1) if r.any() else 0 for r in a])
        handle = np.median(widths[: len(widths) // 6])
        root = int(np.argmax(widths > handle * 1.8))
        info["root"] = round(root / im.height, 3)
    if name == "huojianqiang":
        # 槍尖在右上：x - y 最大的那些點附近
        ys, xs = np.nonzero(a)
        score = xs / im.width - ys / im.height
        top = score >= np.percentile(score, 99.5)
        info["tip"] = [round(float(xs[top].mean()) / im.width, 3), round(float(ys[top].mean()) / im.height, 3)]
    meta[name] = info
    print(name, info, f"{(OUT / f'{name}.webp').stat().st_size // 1024} KB")
(OUT / "weapons.json").write_text(json.dumps(meta), encoding="utf-8")
