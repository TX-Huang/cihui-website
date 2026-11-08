"""把拱門圖去背（白底 → 透明），並把門洞的純黑挖成透明。
用法: python -I tools/cut_gate.py assets/raw/gate.png assets/gate.png
"""
import sys
import numpy as np
from PIL import Image
from scipy import ndimage

src, dst = sys.argv[1], sys.argv[2]
im = Image.open(src).convert("RGBA")
a = np.asarray(im).astype(np.int16)
rgb = a[..., :3]
h, w = rgb.shape[:2]

# 1) 背景：從四邊連通的「接近白/淺灰」區域
light = (rgb.min(axis=2) > 200) & ((rgb.max(axis=2) - rgb.min(axis=2)) < 25)
lab, _ = ndimage.label(light)
edge = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
bg = np.isin(lab, list(edge))

# 2) 門洞：從門中央連通的「接近黑」區域
dark = rgb.max(axis=2) < 40
lab2, _ = ndimage.label(dark)
cy, cx = int(h * 0.68), w // 2
door = lab2 == lab2[cy, cx] if lab2[cy, cx] else np.zeros_like(dark)

hole = bg | door
alpha = np.where(hole, 0, 255).astype(np.float32)
# 邊緣柔化一點，避免鋸齒
alpha = ndimage.gaussian_filter(alpha, 1.0)
out = a.copy()
out[..., 3] = np.clip(alpha, 0, 255)
Image.fromarray(out.astype(np.uint8)).save(dst, optimize=True)

ys, xs = np.nonzero(door)
print(f"size {w}x{h}")
if len(xs):
    print(f"door bbox x {xs.min()}-{xs.max()}  y {ys.min()}-{ys.max()}  (fraction x {xs.min()/w:.4f}-{xs.max()/w:.4f}, y {ys.min()/h:.4f}-{ys.max()/h:.4f})")
ys, xs = np.nonzero(~hole)
print(f"gate bbox x {xs.min()}-{xs.max()}  y {ys.min()}-{ys.max()}")
