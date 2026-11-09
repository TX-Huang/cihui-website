"""把青鳥拍翅膀的影片（洋紅背景）變成一格一格的動畫圖集。
用法: python -I tools/prep_bird_video.py 影片.mp4 開始格 格數
例:   python -I tools/prep_bird_video.py assets/raw/video/flap-c.mp4 35 36
輸出: assets/birds/bluebird-fly.webp、bluebird-fly.json

做法：
1. ffmpeg 把影片拆成一張張圖
2. 去背：跟洋紅背景顏色的距離 → 透明度（邊緣柔和）；邊緣把混進來的洋紅扣掉，殘留的粉紅也壓掉
3. 每格把「頭」對齊到同一點（影片裡鳥會上下飄；拿掉之後由程式自己控制起伏，循環才接得起來）
4. 縮小、排成格子
"""
import json
import subprocess
import sys
import tempfile
from pathlib import Path

import numpy as np
from PIL import Image

video, start, count = sys.argv[1], int(sys.argv[2]), int(sys.argv[3])
OUT = Path("assets/birds")
FRAME_W = 300  # 每格縮到多寬
COLS = 6

tmp = Path(tempfile.mkdtemp())
subprocess.run(["ffmpeg", "-v", "error", "-i", video, str(tmp / "%03d.png")], check=True)
files = sorted(tmp.glob("*.png"))[start : start + count]

first = np.asarray(Image.open(files[0]).convert("RGB")).astype(float)
bg = np.median(np.concatenate([first[:30, :30].reshape(-1, 3), first[-30:, -30:].reshape(-1, 3)]), axis=0)
print("background", bg.round())


def key(path):
    im = np.asarray(Image.open(path).convert("RGB")).astype(float)
    d = np.sqrt(((im - bg) ** 2).sum(axis=2))
    a = np.clip((d - 45) / 90, 0, 1)
    # 邊緣像素 = 鳥的顏色和洋紅背景混在一起：把背景那一份扣掉，還原鳥本來的顏色
    av = np.maximum(a, 0.15)[..., None]
    rgb = np.clip((im - (1 - av) * bg) / av, 0, 255)
    # 還殘留的洋紅（紅和藍都比綠高）壓掉：白色、藍綠、金色都不會被影響
    spill = np.minimum(rgb[..., 0], rgb[..., 2]) - rgb[..., 1]
    spill = np.clip(spill, 0, None)
    rgb[..., 0] -= spill
    rgb[..., 2] -= spill
    return np.dstack([rgb, a * 255]).clip(0, 255).astype(np.uint8)


def head(rgba):
    m = rgba[..., 3] > 128
    ys, xs = np.nonzero(m)
    x0 = xs.max() - int(0.08 * (xs.max() - xs.min()))
    hy, hx = np.nonzero(m[:, x0:])
    return hx.mean() + x0, hy.mean()


frames = [key(f) for f in files]
heads = [head(f) for f in frames]
ref = heads[0]
H, W = frames[0].shape[:2]
aligned = []
for f, (hx, hy) in zip(frames, heads):
    im = Image.fromarray(f, "RGBA")
    c = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    c.paste(im, (int(round(ref[0] - hx)), int(round(ref[1] - hy))), im)
    aligned.append(c)

# 全部格子共用一個裁切框
union = np.zeros((H, W), bool)
for c in aligned:
    union |= np.asarray(c)[..., 3] > 20
ys, xs = np.nonzero(union)
box = (max(0, xs.min() - 4), max(0, ys.min() - 4), min(W, xs.max() + 5), min(H, ys.max() + 5))
k = FRAME_W / (box[2] - box[0])
fh = round((box[3] - box[1]) * k)
cells = [c.crop(box).resize((FRAME_W, fh), Image.LANCZOS) for c in aligned]

# 特別的格子：翅膀最高（煞車用）、翅膀最平（滑翔用）
tops, heights = [], []
for c in aligned:
    m = np.asarray(c)[..., 3] > 128
    yy = np.nonzero(m.any(axis=1))[0]
    tops.append(yy.min())
    heights.append(yy.max() - yy.min())
up_frame = int(np.argmin(tops))
glide_frame = int(np.argmin(heights))

# 腳的位置（接點）：頭往後約 30% 鳥長、身體下緣
bird_w = box[2] - box[0]
feet = ((ref[0] - 0.3 * bird_w - box[0]) * k, (ref[1] + 0.09 * bird_w - box[1]) * k)

rows = (len(cells) + COLS - 1) // COLS
atlas = Image.new("RGBA", (COLS * FRAME_W, rows * fh), (0, 0, 0, 0))
rects = []
for i, c in enumerate(cells):
    x, y = (i % COLS) * FRAME_W, (i // COLS) * fh
    atlas.alpha_composite(c, (x, y))
    rects.append([x, y, FRAME_W, fh])
OUT.mkdir(parents=True, exist_ok=True)
atlas.save(OUT / "bluebird-fly.webp", quality=82, method=6)
meta = {
    "atlas": list(atlas.size),
    "fps": 24,
    "frames": rects,
    "pivot": [round(feet[0], 1), round(feet[1], 1)],
    "upFrame": up_frame,
    "glideFrame": glide_frame,
    "length": FRAME_W,
}
(OUT / "bluebird-fly.json").write_text(json.dumps(meta), encoding="utf-8")
print("frames", len(cells), "cell", (FRAME_W, fh), "atlas", atlas.size, "up", up_frame, "glide", glide_frame, "pivot", meta["pivot"])
