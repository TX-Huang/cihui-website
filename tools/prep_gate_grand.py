"""處理三開間大門（ChatGPT 透明 PNG）。
用法: python -I tools/prep_gate_grand.py assets/raw/chatgpt2/gate.png assets/gate-grand.webp
會印出設計座標（寬 W）下的門洞、匾額位置，貼到 js/gate.js。
"""
import sys
import numpy as np
from PIL import Image
from scipy import ndimage

src, out = sys.argv[1], sys.argv[2]
W = 1600  # 設計座標寬度：讓門洞寬度跟舊的門差不多（約 430），珠簾字的大小就不用改

im = Image.open(src).convert("RGBA")
a = np.asarray(im)
ys, xs = np.nonzero(a[..., 3] > 10)
im = im.crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))
a = np.asarray(im)
h, w = a.shape[:2]
k = W / w
print(f"gate {w}x{h} -> design {W}x{round(h * k)}")

# 門洞：中間那一塊透明區
clear = a[..., 3] < 30
lab, _ = ndimage.label(clear)
door = lab == lab[int(h * 0.6), w // 2]
dy, dx = np.nonzero(door)
touches_edge = dx.min() == 0 or dx.max() == w - 1 or dy.min() == 0
print(f"door: x0 {dx.min() * k:.0f}, x1 {dx.max() * k:.0f}, y0 {dy.min() * k:.0f}, y1 {dy.max() * k:.0f}  (touches edge: {touches_edge})")

# 匾額：門洞上方、中間附近，一塊顏色均勻的木色長方形
top = dy.min()
band = a[: top, :, :3].astype(int)
mid = band[:, int(w * 0.4): int(w * 0.6)]
print("sample colors above door (center column, every 20px):")
for y in range(max(0, top - 220), top, 20):
    print(" ", y, tuple(a[y, w // 2, :3]))
im.save(out, quality=90, method=6)
print("saved", out, im.size)
