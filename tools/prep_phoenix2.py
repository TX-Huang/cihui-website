"""新丹鳳（金母頁）：把 AI Video 做的拍翅影片（綠背景）變成動畫圖集，光柱、光暈的圖也一起整理。
用法: python -I tools/prep_phoenix2.py
輸入: assets/raw/chatgpt2/phoenix2-flap-frames/0001～0046.png（H3 影片拆好的格子，1920x1088，純綠 #00FF00 背景）
      2026-11-15 換成 flap：使用者要鳳凰「持續拍翅膀，這個飛行路線應該沒辦法滑翔」。
      AI Video 從一段長影片的中間切出一圈（不會在接頭慢下來），每 2 格取 1 格：一次拍翅 0.96 秒，一圈拍 2 次。
      之前的 cruise 每拍一下翅膀會停在水平約 0.4 秒，看起來在滑翔。
      assets/raw/chatgpt2/compare/light-rays-1.png、warm-glow-1.png（FLUX 黑底，畫面上用「濾色」疊上去）
輸出: assets/phoenix2/fly.webp/.json、rays.webp、glow.webp

做法：
1. 46 格全用，每格播 1 個影片格（24 格／秒，一圈 1.92 秒）。第 46 格接回第 1 格剛好（AI Video 量過）。
   影片裡身體本來就跟著拍翅上下，網頁上不用再加起伏。
   翅膀往下拍到最低時，有 4 格（13、14、36、37）羽毛尖碰到影片的下緣，會被切平：最下面幾排慢慢變透明，看不出切口。
2. 去背：每一格自己量四個角的綠（這版都是純綠，但照樣量，換影片也能用）。
   跟綠的距離 → 透明度；邊緣把混進來的綠扣掉，殘留的綠壓掉。
3. 鳥的身體在影片裡本來就不太動（量過），所以不對齊，全部格子共用一個裁切框。
   另外記下第 1 格鳥的框（ref）：畫面上用這個框對齊鳥的位置和大小。
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
PICK = list(range(1, 47))
BOTTOM_FADE = 16  # 影片最下面幾排慢慢變透明（羽毛尖碰到下緣會被切平）


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
    a[-BOTTOM_FADE:] *= np.linspace(1, 0, BOTTOM_FADE)[:, None]
    # 不調淡：使用者 2026-11-15 定案「只有鳳凰是油畫風」，鳳凰保持原本的鮮豔
    return np.dstack([rgb, a * 255]).clip(0, 255).astype(np.uint8)


def bbox(mask):
    ys, xs = np.nonzero(mask)
    return xs.min(), ys.min(), xs.max() + 1, ys.max() + 1


def fly():
    frames = [key(RAW / "phoenix2-flap-frames" / f"{i:04d}.png") for i in PICK]
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
        rects.append([x, y, CELL_W, ch, 1])  # 每一格播 1 個影片格
    OUT.mkdir(parents=True, exist_ok=True)
    atlas.save(OUT / "fly.webp", quality=82, method=6)
    meta = {"atlas": list(atlas.size), "fps": 24, "frames": rects, "width": CELL_W, "height": ch, "ref": ref}
    (OUT / "fly.json").write_text(json.dumps(meta), encoding="utf-8")
    print("fly", len(frames), "frames,", round(sum(r[4] for r in rects) / 24, 2), "s per loop, cell", (CELL_W, ch), "atlas", atlas.size, "ref", ref, f"{(OUT / 'fly.webp').stat().st_size // 1024} KB")


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
