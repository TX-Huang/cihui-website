"""整理青鳥的圖：飛行三格（往上、展翅、往下）＋ 停著兩種（側面、正面），打包成圖集＋說明。
也量出大門上可以停的位置（屋脊、匾額上緣），印出來貼到 js/gate.js。
用法: python -I tools/prep_bird.py
輸出: assets/birds/bluebird.webp、bluebird.json
"""
import json
from pathlib import Path

import numpy as np
from PIL import Image

SRC = Path("assets/raw/chatgpt2")
OUT = Path("assets/birds")
FLY_W = 420  # 飛行圖縮到多寬（像素）
PERCH_H = 330  # 停著的圖縮到多高
PAD = 4

# 飛行三格放在同一張畫布上（頭的位置本來就對齊），用同一個裁切框才不會跳
fly_names = [("up", "bluebird-wing-up.png"), ("mid", "bluebird.png"), ("down", "bluebird-wing-down.png")]
fly = [(k, Image.open(SRC / n).convert("RGBA")) for k, n in fly_names]
alpha = np.zeros(np.asarray(fly[0][1]).shape[:2], bool)
for _, im in fly:
    alpha |= np.asarray(im)[..., 3] > 30
ys, xs = np.nonzero(alpha)
box = (xs.min(), ys.min(), xs.max() + 1, ys.max() + 1)
kf = FLY_W / (box[2] - box[0])
mid = np.asarray(fly[1][1])[..., 3] > 30
my, mx = np.nonzero(mid)
body_c = ((mx.mean() - box[0]) * kf, (my.mean() - box[1]) * kf)  # 飛行時的轉動中心：大約在身體中間

parts = []
for k, im in fly:
    c = im.crop(box)
    c = c.resize((round(c.width * kf), round(c.height * kf)), Image.LANCZOS)
    parts.append({"name": k, "im": c, "pivot": [round(body_c[0], 1), round(body_c[1], 1)]})

# 停著的：腳的位置當接點（看圖量的，原圖座標）
for k, n, feet in [("perch", "bluebird-perch.png", (870, 675)), ("front", "bluebird-perch-front.png", (852, 670))]:
    im = Image.open(SRC / n).convert("RGBA")
    a = np.asarray(im)[..., 3] > 30
    ys, xs = np.nonzero(a)
    b = (xs.min(), ys.min(), xs.max() + 1, ys.max() + 1)
    kp = PERCH_H / (b[3] - b[1])
    c = im.crop(b).resize((round((b[2] - b[0]) * kp), PERCH_H), Image.LANCZOS)
    parts.append({"name": k, "im": c, "pivot": [round((feet[0] - b[0]) * kp, 1), round((feet[1] - b[1]) * kp, 1)]})

# 打包
W = 1024
x = y = row = 0
for p in parts:
    w, h = p["im"].width + PAD * 2, p["im"].height + PAD * 2
    if x + w > W:
        x, y, row = 0, y + row, 0
    p["rect"] = [x + PAD, y + PAD, p["im"].width, p["im"].height]
    x += w
    row = max(row, h)
atlas = Image.new("RGBA", (W, y + row), (0, 0, 0, 0))
for p in parts:
    atlas.alpha_composite(p["im"], (p["rect"][0], p["rect"][1]))
OUT.mkdir(parents=True, exist_ok=True)
atlas.save(OUT / "bluebird.webp", quality=88, method=6)
meta = {"atlas": [W, y + row], "flyLength": FLY_W, "perchHeight": PERCH_H,
        "parts": {p["name"]: {"rect": p["rect"], "pivot": p["pivot"]} for p in parts}}
(OUT / "bluebird.json").write_text(json.dumps(meta, indent=1), encoding="utf-8")
print("atlas", atlas.size, {p["name"]: p["rect"] for p in parts})

# ── 大門上可以停的位置（設計座標，寬 1600）──
g = np.asarray(Image.open("assets/gate-grand.webp").convert("RGBA"))[..., 3] > 200
gk = 1600 / g.shape[1]


def top_y(xd):
    col = g[:, int(xd / gk)]
    return round(np.nonzero(col)[0].min() * gk)


for xd in [180, 260, 340, 1260, 1340, 1420]:
    print("roof", xd, top_y(xd))
