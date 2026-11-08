"""把一張灰底、三列鯉魚的圖切成三張透明背景的鯉魚。
用法: python -I tools/cut_koi.py assets/raw/koi.png assets/
"""
import sys
import numpy as np
from PIL import Image
from scipy import ndimage

src, outdir = sys.argv[1], sys.argv[2]
a = np.asarray(Image.open(src).convert("RGB")).astype(np.float32)
h, w, _ = a.shape
grey = np.median(a[5:40, 5:40].reshape(-1, 3), axis=0)

# 找出白色分隔線（整列都很白）
row_white = (a.min(axis=2) > 235).mean(axis=1) > 0.9
lines = np.nonzero(row_white)[0]
cuts = [0]
if len(lines):
    groups = np.split(lines, np.nonzero(np.diff(lines) > 1)[0] + 1)
    for g in groups:
        cuts += [g[0], g[-1] + 1]
cuts.append(h)
bands = [(cuts[i], cuts[i + 1]) for i in range(0, len(cuts), 2) if cuts[i + 1] - cuts[i] > h * 0.15]
names = ["koi-kohaku", "koi-gold", "koi-showa"]

for (y0, y1), name in zip(bands, names):
    band = a[y0:y1]
    d = np.sqrt(((band - grey) ** 2).sum(axis=2))
    alpha = np.clip((d - 10) / 50, 0, 1)
    # 只留最大的那一塊（魚本身），去掉雜點
    lab, n = ndimage.label(alpha > 0.15)
    if n:
        sizes = ndimage.sum(np.ones_like(lab), lab, range(1, n + 1))
        keep = lab == (np.argmax(sizes) + 1)
        keep = ndimage.binary_dilation(keep, iterations=3)
        alpha *= keep
    # 半透明的鰭：把灰色混色去掉，讓它在任何背景上都乾淨
    al = np.maximum(alpha, 1e-3)[..., None]
    fg = np.clip((band - (1 - al) * grey) / al, 0, 255)
    rgba = np.dstack([fg, alpha * 255]).astype(np.uint8)
    ys, xs = np.nonzero(alpha > 0.02)
    pad = 8
    crop = rgba[max(0, ys.min() - pad): ys.max() + pad, max(0, xs.min() - pad): xs.max() + pad]
    im = Image.fromarray(crop)
    im = im.resize((900, round(900 * im.height / im.width)), Image.LANCZOS)
    im.save(f"{outdir}/{name}.webp", quality=90, method=6)
    print(name, im.size)
