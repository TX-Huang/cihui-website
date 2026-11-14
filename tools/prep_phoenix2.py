"""新丹鳳（金母頁）：把 AI Video 做的拍翅影片（綠背景）變成動畫圖集，光柱、光暈的圖也一起整理。
用法: python -I tools/prep_phoenix2.py
輸入: assets/raw/chatgpt2/phoenix2-fly-frames/0001～0107.png（H3 影片拆好的格子，1920x1088）
      assets/raw/chatgpt2/compare/light-rays-1.png、warm-glow-1.png（FLUX 黑底，畫面上用「濾色」疊上去）
輸出: assets/phoenix2/fly.webp/.json、rays.webp、glow.webp

做法：
1. 選格子：1～79 格是兩下拍翅，每 2 格取 1 格；80～106 格鳥幾乎不動（慢慢回到第 1 格的姿勢），
   每 4 格取 1 格，把停頓縮短。第 107 格跟第 1 格一樣，不取（接回第 1 格剛好）。
2. 去背：每一格背景的綠都不太一樣（量過：(7,236,15)～(29,198,45)），所以每一格自己量四個角的綠。
   跟綠的距離 → 透明度；邊緣把混進來的綠扣掉，殘留的綠壓掉。
3. 鳥的身體在影片裡本來就不太動（量過），所以不對齊，全部格子共用一個裁切框。
   另外記下第 1 格鳥的框（ref）：畫面上用這個框對齊鳥的位置和大小。
3b. lift：每一格翅膀有多低（-1 最高、1 最低）。量「鳥最上緣」的高度（翅膀舉高時最上緣在上面），
   前後各一格平均一下。畫面上照這個讓身體起伏：翅膀往下拍時身體被推上去。
4. 光的圖：太暗的地方（< 20）直接變全黑，不然濾色疊上去整頁會灰灰的。
   光暈是一顆圓：裁成正方形後，外圈再慢慢壓到全黑，畫面上才不會看到方框的邊。
"""
import json
from pathlib import Path

import numpy as np
from PIL import Image

RAW = Path("assets/raw/chatgpt2")
OUT = Path("assets/phoenix2")
CELL_W = 560
COLS = 8
PICK = list(range(1, 80, 2)) + list(range(80, 107, 4))


def key(path):
    im = np.asarray(Image.open(path).convert("RGB")).astype(float)
    corners = [im[:40, :40], im[:40, -40:], im[-40:, :40], im[-40:, -40:]]
    bg = np.median(np.concatenate([c.reshape(-1, 3) for c in corners]), axis=0)
    d = np.sqrt(((im - bg) ** 2).sum(axis=2))
    a = np.clip((d - 60) / 110, 0, 1)
    av = np.maximum(a, 0.15)[..., None]
    rgb = np.clip((im - (1 - av) * bg) / av, 0, 255)
    rgb[..., 1] = np.minimum(rgb[..., 1], np.maximum(rgb[..., 0], rgb[..., 2]))
    a[a < 0.04] = 0
    return np.dstack([rgb, a * 255]).clip(0, 255).astype(np.uint8)


def bbox(mask):
    ys, xs = np.nonzero(mask)
    return xs.min(), ys.min(), xs.max() + 1, ys.max() + 1


def fly():
    frames = [key(RAW / "phoenix2-fly-frames" / f"{i:04d}.png") for i in PICK]
    H, W = frames[0].shape[:2]
    union = np.zeros((H, W), bool)
    for f in frames:
        union |= f[..., 3] > 20
    x0, y0, x1, y1 = bbox(union)
    box = (max(0, x0 - 4), max(0, y0 - 4), min(W, x1 + 4), min(H, y1 + 4))
    k = CELL_W / (box[2] - box[0])
    ch = round((box[3] - box[1]) * k)
    r0 = bbox(frames[0][..., 3] > 128)
    ref = [round((r0[0] - box[0]) * k, 1), round((r0[1] - box[1]) * k, 1), round((r0[2] - r0[0]) * k, 1), round((r0[3] - r0[1]) * k, 1)]
    rows = (len(frames) + COLS - 1) // COLS
    atlas = Image.new("RGBA", (COLS * CELL_W, rows * ch), (0, 0, 0, 0))
    rects = []
    for i, f in enumerate(frames):
        cell = Image.fromarray(f, "RGBA").crop(box).resize((CELL_W, ch), Image.LANCZOS)
        x, y = (i % COLS) * CELL_W, (i // COLS) * ch
        atlas.alpha_composite(cell, (x, y))
        # 每一格播多久（以原影片的格數算）：前段每 2 格取 1、後段每 4 格取 1
        rects.append([x, y, CELL_W, ch, 2 if PICK[i] < 80 else 4])
    OUT.mkdir(parents=True, exist_ok=True)
    atlas.save(OUT / "fly.webp", quality=82, method=6)
    tops = np.array([float(np.nonzero((f[..., 3] > 128).any(axis=1))[0].min()) for f in frames])
    tops = (np.roll(tops, 1) + tops + np.roll(tops, -1)) / 3  # 前後平均（首尾接得起來）
    lift = (tops - tops.min()) / max(1e-6, np.ptp(tops)) * 2 - 1
    meta = {"atlas": list(atlas.size), "fps": 24, "frames": rects, "width": CELL_W, "height": ch, "ref": ref, "lift": [round(float(v), 3) for v in lift]}
    (OUT / "fly.json").write_text(json.dumps(meta), encoding="utf-8")
    print("fly", len(frames), "frames, cell", (CELL_W, ch), "atlas", atlas.size, "ref", ref, f"{(OUT / 'fly.webp').stat().st_size // 1024} KB")


def light(src, dst, width, crop=None, round_fade=False):
    im = Image.open(RAW / "compare" / src).convert("RGB")
    if crop:
        im = im.crop(crop)
    im = im.resize((width, round(im.height * width / im.width)), Image.LANCZOS)
    a = np.asarray(im).astype(float)
    # 太暗的地方變全黑；20 以上慢慢接回來，不會出現一圈邊
    lum = a.max(axis=2, keepdims=True)
    a = a * np.clip((lum - 20) / 20, 0, 1)
    if round_fade:
        h, w = a.shape[:2]
        yy, xx = np.mgrid[0:h, 0:w]
        r = np.hypot((xx - w / 2) / (w / 2), (yy - h / 2) / (h / 2))
        a = a * np.clip((1 - r) / 0.25, 0, 1)[..., None]
    Image.fromarray(a.clip(0, 255).astype(np.uint8)).save(OUT / dst, quality=82, method=6)
    print(dst, im.size, f"{(OUT / dst).stat().st_size // 1024} KB")


fly()
light("light-rays-1.png", "rays.webp", 1280)
# 光暈在 1280x704 圖的中間偏左：裁成正方形
light("warm-glow-1.png", "glow.webp", 512, crop=(290, 0, 994, 704), round_fade=True)
