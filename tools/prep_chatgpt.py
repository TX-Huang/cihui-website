"""處理 ChatGPT 生的透明 PNG：拱門、鯉魚、背景。
用法: python -I tools/prep_chatgpt.py assets/raw/chatgpt assets
會印出拱門的門洞、匾額位置（設計座標，寬 1000），貼到 js/gate.js。
"""
import sys
import numpy as np
from PIL import Image
from scipy import ndimage

src, out = sys.argv[1], sys.argv[2]


def trim(im, pad=6):
    a = np.asarray(im)[..., 3]
    ys, xs = np.nonzero(a > 10)
    return im.crop((max(0, xs.min() - pad), max(0, ys.min() - pad), xs.max() + pad + 1, ys.max() + pad + 1))


# ── 拱門 ──
g = trim(Image.open(f"{src}/5.webp").convert("RGBA"), pad=0)
a = np.asarray(g)
h, w = a.shape[:2]
k = 1000 / w
clear = a[..., 3] < 30
lab, _ = ndimage.label(clear)
door = lab == lab[int(h * 0.62), w // 2]
ys, xs = np.nonzero(door)
# 門洞底部：只算拱門內（台階以上），取門洞中間那欄最下面的透明點
print(f"gate size {w}x{h} -> 1000x{round(h * k)}")
print(f"door: x0 {xs.min() * k:.0f}, x1 {xs.max() * k:.0f}, y0 {ys.min() * k:.0f}, y1 {ys.max() * k:.0f}")
rgb = a[..., :3].astype(int)
wood = (rgb[..., 0] > 160) & (rgb[..., 0] < 225) & (rgb[..., 1] > 120) & (rgb[..., 1] < 185) & (rgb[..., 2] > 80) & (rgb[..., 2] < 145) & (a[..., 3] > 200)
wood[int(h * 0.5):] = False
lab2, n = ndimage.label(wood)
sizes = ndimage.sum(np.ones_like(lab2), lab2, range(1, n + 1))
# 匾額：中間附近最大的木色塊
best = None
for i in np.argsort(sizes)[::-1][:8]:
    yy, xx = np.nonzero(lab2 == i + 1)
    if abs((xx.min() + xx.max()) / 2 - w / 2) < w * 0.05:
        best = (xx.min(), xx.max(), yy.min(), yy.max())
        break
if best:
    x0, x1, y0, y1 = best
    print(f"plaque: cx {(x0 + x1) / 2 * k:.0f}, cy {(y0 + y1) / 2 * k:.0f}, w {(x1 - x0) * k:.0f}, h {(y1 - y0) * k:.0f}")
g.resize((1400, round(1400 * h / w)), Image.LANCZOS).save(f"{out}/gate.webp", quality=90, method=6)

# ── 鯉魚 ──
for n, name in [("1", "koi-tancho"), ("2", "koi-asagi"), ("3", "koi-platinum")]:
    im = trim(Image.open(f"{src}/{n}.webp").convert("RGBA"))
    im = im.resize((900, round(900 * im.height / im.width)), Image.LANCZOS)
    im.save(f"{out}/{name}.webp", quality=90, method=6)
    print(name, im.size)

# ── 背景 ──
b = Image.open(f"{src}/4.webp").convert("RGB")
b.save(f"{out}/bg-yaochi.webp", quality=88, method=6)
print("bg", b.size)
