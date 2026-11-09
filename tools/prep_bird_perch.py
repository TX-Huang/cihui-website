"""把青鳥「停著」的影片（轉頭、原地拍翅）變成動畫圖集。兩段影片都從同一張起始圖開始，
所以第一格的姿勢一樣，可以互相接。
用法: python -I tools/prep_bird_perch.py
輸入: assets/raw/video/head.mp4、perch-flap.mp4
輸出: assets/birds/bluebird-perch.webp、bluebird-perch.json

做法：
1. 去背（洋紅）＋把邊緣混進來的洋紅扣掉
2. 拿掉腳下的深灰色桿子；桿子擋住的那一段尾巴，用桿子上下的顏色補起來
3. 尾巴尖碰到影片底部被切掉：最底下那一段慢慢變透明，看不出硬邊
4. 兩段影片用同一個縮放；各自裁切，接點（腳踩的地方）各自換算
"""
import json
import subprocess
import tempfile
from pathlib import Path

import numpy as np
from PIL import Image

# (名稱, 檔案, 每幾格取一格, 只取前幾格)
# 原地拍翅那支最後沒回到原本的站姿，所以只取前 37 格（張開、拍），網頁上再倒著播回來
# 起飛那支取前 41 格（蹲下、張翅、飛到桿子上方）：正著播 = 起飛，倒著播 = 降落
CLIPS = [
    ("head", "assets/raw/video/head.mp4", 4, None),
    ("flutter", "assets/raw/video/perch-flap.mp4", 2, 37),
    ("takeoff", "assets/raw/video/takeoff.mp4", 2, 41),
]
OUT = Path("assets/birds")
BIRD_H = 140  # 停著的鳥（頭冠到腳）縮到幾像素高
COLS = 10
FADE = 50  # 影片最底下多少像素慢慢變透明


def frames_of(path, step, limit):
    d = Path(tempfile.mkdtemp())
    subprocess.run(["ffmpeg", "-v", "error", "-i", path, str(d / "%03d.png")], check=True)
    files = sorted(d.glob("*.png"))[:limit][::step]
    return [np.asarray(Image.open(f).convert("RGB")).astype(float) for f in files]


clips = {name: frames_of(path, step, limit) for name, path, step, limit in CLIPS}
first = clips["head"][0]
H, W = first.shape[:2]
bg = np.median(first[:30, :30].reshape(-1, 3), axis=0)

# 桿子：深灰色、很多像素排成一橫列
grey = (np.abs(first[..., 0] - first[..., 1]) < 18) & (np.abs(first[..., 1] - first[..., 2]) < 18) & (first[..., 0] < 120)
bar_y = int(np.argmax(grey.sum(axis=1)))
bar_rows = np.nonzero(grey.sum(axis=1) > grey.sum(axis=1).max() * 0.5)[0]
bar_top, bar_bot = bar_rows.min() - 3, bar_rows.max() + 4  # 多留幾列，桿子的淡邊也一起拿掉
print("bar rows", bar_top, bar_bot)


def key(im):
    d = np.sqrt(((im - bg) ** 2).sum(axis=2))
    a = np.clip((d - 45) / 90, 0, 1)
    av = np.maximum(a, 0.15)[..., None]
    rgb = np.clip((im - (1 - av) * bg) / av, 0, 255)
    spill = np.clip(np.minimum(rgb[..., 0], rgb[..., 2]) - rgb[..., 1], 0, None)
    rgb[..., 0] -= spill
    rgb[..., 2] -= spill
    # 拿掉桿子：桿子那幾列的灰色像素變透明
    band = slice(bar_top, bar_bot + 1)
    # 不是鳥的顏色（灰灰的、沒什麼彩度）就拿掉；鳥的尾巴是藍綠色，彩度高，不會被拿掉
    sat = rgb[band].max(axis=2) - rgb[band].min(axis=2)
    g = sat < 45
    ab = a[band]
    ab[g] = 0
    ab[ab < 0.6] = 0  # 桿子的淡邊
    a[band] = ab
    # 桿子擋住的尾巴：上下都有鳥的欄位，用上下的顏色內插補起來
    above, below = bar_top - 2, bar_bot + 2
    if below < H:
        fill = (a[above] > 0.5) & (a[below] > 0.5)
        n = bar_bot - bar_top + 1
        for i, y in enumerate(range(bar_top, bar_bot + 1)):
            t = (i + 1) / (n + 1)
            rgb[y, fill] = rgb[above, fill] * (1 - t) + rgb[below, fill] * t
            a[y, fill] = a[above, fill] * (1 - t) + a[below, fill] * t
    # 底部淡出（尾巴尖被影片切到的地方）
    a[H - FADE :] *= np.linspace(1, 0, FADE)[:, None]
    return np.dstack([rgb, a * 255]).clip(0, 255).astype(np.uint8)


keyed = {name: [key(f) for f in fs] for name, fs in clips.items()}

# 腳踩的地方：桿子正上方、尾巴右邊那一段鳥的像素（尾巴從左下垂下去，腳在右邊）
a0 = keyed["head"][0][..., 3] > 128
band = a0[bar_top - 22 : bar_top - 2]
cols = np.nonzero(band.any(axis=0))[0]
runs = np.split(cols, np.nonzero(np.diff(cols) > 6)[0] + 1)
feet_x = float(np.mean(runs[-1]))
feet = (feet_x, float(bar_top))
ys, _ = np.nonzero(a0)
bird_h = bar_top - ys.min()
k = BIRD_H / bird_h

# 每段影片各自裁切（拍翅膀時翅膀張很開，共用一個框太浪費），接點各自換算
cells = []
meta_clips = {}
for name, fs in keyed.items():
    union = np.zeros((H, W), bool)
    for f in fs:
        union |= f[..., 3] > 20
    ys, xs = np.nonzero(union)
    box = (max(0, xs.min() - 4), max(0, ys.min() - 4), min(W, xs.max() + 5), min(H, ys.max() + 1))
    cw, ch = round((box[2] - box[0]) * k), round((box[3] - box[1]) * k)
    idx = []
    for f in fs:
        idx.append(len(cells))
        cells.append(Image.fromarray(f, "RGBA").crop(box).resize((cw, ch), Image.LANCZOS))
    step = next(c[2] for c in CLIPS if c[0] == name)
    # 最後一格鳥的位置（相對於腳踩的接點）：降落時，飛行要先飛到這一點，再接倒著播的起飛
    last = fs[-1][..., 3] > 128
    ly, lx = np.nonzero(last)
    end_offset = [round((lx.mean() - feet[0]) * k, 1), round((ly.mean() - feet[1]) * k, 1)]
    # 最後幾格鳥移動的速度（每秒幾像素，跟 endOffset 同一個縮放）：起飛完接一般飛行時，從這個速度、方向接著飛
    cs = []
    for f in fs[-4:]:
        my, mx = np.nonzero(f[..., 3] > 128)
        cs.append((mx.mean(), my.mean()))
    fps = 24 / next(c[2] for c in CLIPS if c[0] == name)
    end_velocity = [round((cs[-1][0] - cs[0][0]) / (len(cs) - 1) * k * fps, 1), round((cs[-1][1] - cs[0][1]) / (len(cs) - 1) * k * fps, 1)]
    meta_clips[name] = {
        "frames": idx,
        "endOffset": end_offset,
        "endVelocity": end_velocity,
        "fps": 24 / step,
        "pingpong": name == "flutter",  # 播完再倒著播回第一格
        "pivot": [round((feet[0] - box[0]) * k, 1), round((feet[1] - box[1]) * k, 1)],
    }

# 排列：一列一列放（每格大小可能不同）
AW = 2048
x = y = row_h = 0
rects = []
for c in cells:
    if x + c.width > AW:
        x, y, row_h = 0, y + row_h, 0
    rects.append([x, y, c.width, c.height])
    x += c.width
    row_h = max(row_h, c.height)
atlas = Image.new("RGBA", (AW, y + row_h), (0, 0, 0, 0))
for c, r in zip(cells, rects):
    atlas.alpha_composite(c, (r[0], r[1]))
atlas.save(OUT / "bluebird-perch.webp", quality=76, method=6)
meta = {
    "atlas": list(atlas.size),
    "rects": rects,
    "clips": meta_clips,
    "height": BIRD_H,
}
(OUT / "bluebird-perch.json").write_text(json.dumps(meta), encoding="utf-8")
print("cells", len(cells), "atlas", atlas.size, {n: (len(c["frames"]), c["pivot"]) for n, c in meta_clips.items()})
