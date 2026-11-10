"""把蓮花（花、花苞、荷葉）改成網頁風格的金蓮：照亮暗程度換成金色漸層，保留原本的明暗和細節。
用法: python -I tools/gold_lotus.py [preview|apply] [A|B]
  A＝花和葉都是金色；B＝金色的花、青瓷色的葉（跟大門的瓦一樣）
preview：在背景圖上排一張比較圖；apply：寫進 assets/elements/lotus-*.webp
"""
import sys
from pathlib import Path

import numpy as np
from PIL import Image

RAW = Path("assets/raw/chatgpt2")
OUT = Path("assets/elements")

# 漸層：亮度 0～1 → 顏色
PETAL = [(0.0, "#7a5c2c"), (0.3, "#b8955a"), (0.6, "#e0c995"), (0.82, "#f4ead2"), (1.0, "#fffcf5")]
LEAF_GOLD = [(0.0, "#6b5a36"), (0.4, "#a8935f"), (0.7, "#d3c49a"), (1.0, "#f1e9d3")]
LEAF_CELADON = [(0.0, "#55685d"), (0.4, "#93a89b"), (0.7, "#c3d2c7"), (1.0, "#edf2ec")]


def hex2rgb(h):
    return np.array([int(h[i : i + 2], 16) for i in (1, 3, 5)], float)


def gradient_map(im, stops, lift=0.0):
    arr = np.asarray(im.convert("RGBA")).astype(float)
    lum = (arr[..., :3] @ np.array([0.299, 0.587, 0.114])) / 255
    a = arr[..., 3] > 0
    lo, hi = np.percentile(lum[a], 2), np.percentile(lum[a], 99.5)
    t = np.clip((lum - lo) / max(hi - lo, 1e-6), 0, 1) * (1 - lift) + lift
    xs = [s[0] for s in stops]
    cols = np.stack([hex2rgb(s[1]) for s in stops])
    out = np.stack([np.interp(t, xs, cols[:, k]) for k in range(3)], -1)
    arr[..., :3] = out
    return Image.fromarray(arr.clip(0, 255).astype(np.uint8), "RGBA")


def prep(name, height=300):
    im = Image.open(RAW / f"{name}.png").convert("RGBA")
    a = np.asarray(im)[..., 3]
    im.putalpha(Image.fromarray(np.where(a < 8, 0, a).astype(np.uint8)))
    im = im.crop(im.getbbox())
    return im.resize((round(im.width * height / im.height), height), Image.LANCZOS)


def make(variant):
    leaf = LEAF_GOLD if variant == "A" else LEAF_CELADON
    return {
        "lotus-open": gradient_map(prep("lotus-open"), PETAL, 0.05),
        "lotus-bud": gradient_map(prep("lotus-bud"), PETAL, 0.05),
        "lotus-leaf": gradient_map(prep("lotus-leaf"), leaf, 0.1),
    }


def scene(parts, bg):
    """跟網頁一樣的畫法：荷葉壓扁平躺，花坐在中間"""
    c = bg.copy()
    s = 220
    for i, x in enumerate([180, 520]):
        y = 300
        leaf = parts["lotus-leaf"]
        lw = int(s * 1.5)
        lh = int(lw * 0.45 * leaf.height / leaf.width)
        c.alpha_composite(leaf.resize((lw, lh), Image.LANCZOS), (x - lw // 2, y - lh // 2))
        fl = parts["lotus-open" if i == 0 else "lotus-bud"]
        fw = s if i == 0 else int(s * 0.95 * fl.width / fl.height)
        fh = int(fw * fl.height / fl.width)
        top = y - int(fh * 0.78) if i == 0 else y + int(lh * 0.1) - fh
        c.alpha_composite(fl.resize((fw, fh), Image.LANCZOS), (x - fw // 2, top))
    return c


if __name__ == "__main__":
    mode = sys.argv[1] if len(sys.argv) > 1 else "preview"
    if mode == "preview":
        bg = Image.open("assets/bg-yaochi.webp").convert("RGBA")
        bg = bg.crop((300, 560, 1000, 960)).resize((700, 400))
        old = {n: prep(n) for n in ("lotus-open", "lotus-bud", "lotus-leaf")}
        rows = [scene(old, bg), scene(make("A"), bg), scene(make("B"), bg)]
        sheet = Image.new("RGBA", (700, 1200 + 40), "#ece8e3")
        for k, r in enumerate(rows):
            sheet.alpha_composite(r, (0, k * 420))
        sheet.convert("RGB").save(sys.argv[2])
        print("saved", sys.argv[2])
    else:
        for n, im in make(sys.argv[2]).items():
            im.save(OUT / f"{n}.webp", quality=84, method=6)
            print("wrote", n, im.size)
