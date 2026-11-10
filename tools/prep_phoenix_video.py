"""把丹鳳的影片（綠色背景）變成一格一格的動畫圖集。
用法: python -I tools/prep_phoenix_video.py
輸入: assets/raw/chatgpt2/phoenix-flap.mp4（側面飛）、phoenix-front.mp4（正面展翅）
輸出: assets/phoenix/phoenix-side.webp/.json、phoenix-front.webp/.json

做法（跟 tools/prep_bird_video.py 一樣，只是背景是綠色）：
1. ffmpeg 把影片拆成一張張圖，只取「首尾接得起來」的那一段（量過：側面 37～92 格是完整一下拍翅，
   正面 0～99 格是兩下拍翅、第 100 格跟第 0 格幾乎一樣）
2. 去背：跟綠色背景的距離 → 透明度（邊緣柔和）；邊緣把混進來的綠扣掉，殘留的綠也壓掉
3. 不對齊：影片裡鳥本來就跟著拍翅上下起伏，而且選的那段首尾位置一樣（量過），直接用最自然。
   只量「頭／身體中線」的平均位置，當作畫的時候的對齊點
4. 接頭：側面那段翅膀接得上、尾羽接不上（會跳一下）。最後 12 格慢慢混成「開始那格之前的 12 格」，
   播到最後一格時剛好是第一格的前一格，接回去就順了
5. 縮小、排成格子
"""
import json
import subprocess
import tempfile
from pathlib import Path

import numpy as np
from PIL import Image

RAW = Path("assets/raw/chatgpt2")
OUT = Path("assets/phoenix")
FFMPEG = "ffmpeg"

CLIPS = {
    # 名稱: (影片, 開始格, 格數, 每格多寬, 每列幾格, 對齊方式, 接頭混幾格)
    "side": ("phoenix-flap.mp4", 37, 56, 300, 8, "head", 12),
    "front": ("phoenix-front.mp4", 0, 100, 300, 10, "body", 0),
}


def frames_of(video, start, count):
    tmp = Path(tempfile.mkdtemp())
    subprocess.run([FFMPEG, "-v", "error", "-i", str(RAW / video), "-vsync", "0", str(tmp / "%03d.png")], check=True)
    return sorted(tmp.glob("*.png"))[start : start + count]


def mix(a, b, w):
    """兩格 RGBA 照比例混（先乘上透明度再混，邊緣才不會變暗或出現黑邊）"""
    a = a.astype(float)
    b = b.astype(float)
    pa = a[..., :3] * a[..., 3:] / 255
    pb = b[..., :3] * b[..., 3:] / 255
    alpha = a[..., 3:] * (1 - w) + b[..., 3:] * w
    rgb = (pa * (1 - w) + pb * w) / np.maximum(alpha / 255, 1e-6)
    return np.dstack([rgb, alpha]).clip(0, 255).astype(np.uint8)


def background(path):
    im = np.asarray(Image.open(path).convert("RGB")).astype(float)
    corners = [im[:30, :30], im[:30, -30:], im[-30:, :30], im[-30:, -30:]]
    return np.median(np.concatenate([c.reshape(-1, 3) for c in corners]), axis=0)


def key(path, bg):
    im = np.asarray(Image.open(path).convert("RGB")).astype(float)
    d = np.sqrt(((im - bg) ** 2).sum(axis=2))
    a = np.clip((d - 60) / 110, 0, 1)
    # 邊緣像素 = 鳥的顏色和綠背景混在一起：把背景那一份扣掉，還原鳥本來的顏色
    av = np.maximum(a, 0.15)[..., None]
    rgb = np.clip((im - (1 - av) * bg) / av, 0, 255)
    # 還殘留的綠（綠比紅和藍都高）壓掉：丹鳳是朱紅、粉橘、淡金，不會被影響
    rgb[..., 1] = np.minimum(rgb[..., 1], np.maximum(rgb[..., 0], rgb[..., 2]))
    a[a < 0.04] = 0
    return np.dstack([rgb, a * 255]).clip(0, 255).astype(np.uint8)


def anchor(rgba, how):
    m = rgba[..., 3] > 128
    ys, xs = np.nonzero(m)
    x0, x1, y0, y1 = xs.min(), xs.max(), ys.min(), ys.max()
    if how == "head":  # 側面：頭在最右邊那一小段
        cut = x1 - int(0.08 * (x1 - x0))
        hy, hx = np.nonzero(m[:, cut:])
        return hx.mean() + cut, hy.mean()
    # 正面：身體中線＝畫面中間那一條的重心（翅膀左右對稱，拍的時候身體幾乎不動）
    cx = (x0 + x1) / 2
    band = m[:, int(cx - 0.06 * (x1 - x0)) : int(cx + 0.06 * (x1 - x0))]
    by, bx = np.nonzero(band)
    return bx.mean() + int(cx - 0.06 * (x1 - x0)), by.mean()


def build(name, video, start, count, frame_w, cols, how, blend):
    files = frames_of(video, start - blend, count + blend)
    bg = background(files[0])
    keyed = [key(f, bg) for f in files]
    before, frames = keyed[:blend], keyed[blend:]
    for i in range(blend):
        j = count - blend + i
        frames[j] = mix(frames[j], before[i], (i + 1) / (blend + 1))
    anchors = [anchor(f, how) for f in frames]
    ref = np.mean(anchors, axis=0)
    H, W = frames[0].shape[:2]
    aligned = [Image.fromarray(f, "RGBA") for f in frames]
    # 全部格子共用一個裁切框
    union = np.zeros((H, W), bool)
    for c in aligned:
        union |= np.asarray(c)[..., 3] > 20
    ys, xs = np.nonzero(union)
    box = (max(0, xs.min() - 4), max(0, ys.min() - 4), min(W, xs.max() + 5), min(H, ys.max() + 5))
    k = frame_w / (box[2] - box[0])
    fh = round((box[3] - box[1]) * k)
    cells = [c.crop(box).resize((frame_w, fh), Image.LANCZOS) for c in aligned]
    rows = (len(cells) + cols - 1) // cols
    atlas = Image.new("RGBA", (cols * frame_w, rows * fh), (0, 0, 0, 0))
    rects = []
    for i, c in enumerate(cells):
        x, y = (i % cols) * frame_w, (i // cols) * fh
        atlas.alpha_composite(c, (x, y))
        rects.append([x, y, frame_w, fh])
    OUT.mkdir(parents=True, exist_ok=True)
    atlas.save(OUT / f"phoenix-{name}.webp", quality=80, method=6)
    meta = {
        "atlas": list(atlas.size),
        "fps": 24,
        "frames": rects,
        # 對齊點（側面＝頭、正面＝身體中線）在格子裡的位置：畫的時候用這點放在鳥的位置上
        "pivot": [round((ref[0] - box[0]) * k, 1), round((ref[1] - box[1]) * k, 1)],
        "width": frame_w,
        "height": fh,
    }
    (OUT / f"phoenix-{name}.json").write_text(json.dumps(meta), encoding="utf-8")
    jitter = np.ptp(np.array(anchors), axis=0).round(1)
    print(name, "frames", len(cells), "cell", (frame_w, fh), "atlas", atlas.size, "pivot", meta["pivot"], "anchor drift", jitter)


for name, args in CLIPS.items():
    build(name, *args)
