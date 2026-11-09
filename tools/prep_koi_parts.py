"""把鯉魚拆成零件：身體、尾巴、各片鰭，打包成一張圖集（atlas）+ 一份說明（json）。
用法: python -I tools/prep_koi_parts.py
輸入: assets/raw/chatgpt2/{bluekoi,redkoi,platinumkoi}.png、koi-{色}-body.png、koi-{色}-fins.png
輸出: assets/koi/{色}.webp（零件）、{色}-shadow.webp（同位置、模糊的影子）、{色}.json

座標說明（json 裡）：
  L：身體長度（頭尖到身體末端，像素）
  每個零件：rect = 在圖集裡的位置；pivot = 零件接在身體上的那一點（在 rect 裡的像素）；
  s = 那一點沿身體的位置（0 = 頭尖、1 = 身體末端），d = 離中線多遠（÷L，正 = 圖的下方）。
  魚的圖都是「從上往下看、頭朝右」。
"""
import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage

SRC = Path("assets/raw/chatgpt2")
OUT = Path("assets/koi")
FISH = [("blue", "bluekoi"), ("red", "redkoi"), ("platinum", "platinumkoi")]
TARGET_L = 420  # 身體長度縮到幾像素（整隻魚含尾巴約 600）
PAD = 14  # 每個零件四周留邊（給影子模糊）
SHADOW_RGB = (92, 80, 68)
MIN_BLOB = 300


def load(p):
    return np.asarray(Image.open(p).convert("RGBA")).astype(np.uint8)


def best_shift(part, whole):
    """part 要平移多少（dx, dy）才最貼合整隻魚"""
    pm = part[..., 3] > 40
    wm = whole[..., 3] > 40
    best = (-1, 0, 0)
    for dy in range(-16, 17, 2):
        for dx in range(-16, 17, 2):
            s = np.roll(np.roll(pm, dy, 0), dx, 1)
            o = (s & wm).sum() / max(1, s.sum())
            if o > best[0]:
                best = (o, dx, dy)
    return best[1], best[2]


def shift(img, dx, dy):
    return np.roll(np.roll(img, dy, 0), dx, 1)


def crop_to(a, shape):
    h, w = shape
    out = np.zeros((h, w, 4), np.uint8)
    hh, ww = min(h, a.shape[0]), min(w, a.shape[1])
    out[:hh, :ww] = a[:hh, :ww]
    return out


def process(color, whole_name):
    whole = load(SRC / f"{whole_name}.png")
    shape = whole.shape[:2]
    body = crop_to(load(SRC / f"koi-{color}-body.png"), shape)
    fins = crop_to(load(SRC / f"koi-{color}-fins.png"), shape)
    body = shift(body, *best_shift(body, whole))
    fins = shift(fins, *best_shift(fins, whole))

    bm = body[..., 3] > 40
    ys, xs = np.nonzero(bm)
    bx0, bx1 = xs.min(), xs.max()  # 身體末端、頭尖（頭朝右）
    L = bx1 - bx0
    # 每一欄身體的中線 y
    axis = np.full(shape[1], np.nan)
    for x in range(bx0, bx1 + 1):
        col = np.nonzero(bm[:, x])[0]
        if len(col):
            axis[x] = (col.min() + col.max()) / 2
    axis[: bx0] = axis[bx0]
    axis[bx1 + 1 :] = axis[bx1]

    fm = fins[..., 3] > 40
    lab, n = ndimage.label(fm)
    parts = []  # (名稱, 遮罩)
    near_head = []
    for i in range(1, n + 1):
        m = lab == i
        if m.sum() < MIN_BLOB:
            continue
        mys, mxs = np.nonzero(m)
        if mxs.min() > bx0 + 0.85 * L:  # 頭附近的小東西（鬍鬚）：併回身體
            near_head.append(m)
            continue
        if mxs.min() < bx0 - 0.05 * L and mxs.max() > bx0 + 0.25 * L:
            # 尾巴跟上面一片鰭黏在一起：在身體末端附近切開
            cut = bx0 + int(0.06 * L)
            tail = m.copy()
            tail[:, cut:] = False
            rest = m.copy()
            rest[:, :cut] = False
            parts.append(("tail", tail))
            rl, rn = ndimage.label(rest)
            for j in range(1, rn + 1):
                if (rl == j).sum() >= MIN_BLOB:
                    parts.append(("fin", rl == j))
            continue
        parts.append(("tail" if mxs.min() < bx0 - 0.05 * L else "fin", m))

    # 鬍鬚畫回身體
    body = body.copy()
    for m in near_head:
        body[m] = fins[m]
        bm |= m

    # 把身體「拉直」：ChatGPT 畫的身體中線不是水平的（上下差到快 20 像素），
    # 但網頁是把身體圖的正中間對在脊椎上。所以每一欄上下挪，讓每欄的中線都在同一條水平線 A 上。
    # 鰭的 d 是從「那一欄的中線」量的，拉直後就跟網頁對得上。
    A = int(round(np.nanmean(axis[bx0 : bx1 + 1])))
    for x in range(bx0, bx1 + 1):
        dy = int(round(A - axis[x]))
        if dy:
            body[:, x] = np.roll(body[:, x], dy, axis=0)
            bm[:, x] = np.roll(bm[:, x], dy, axis=0)

    # 每個零件接在身體上的點：零件裡離身體最近的那些像素的中心
    dist_to_body = ndimage.distance_transform_edt(~bm)
    pieces = [("body", bm, body, None)]
    for kind, m in parts:
        d = np.where(m, dist_to_body, np.inf)
        root = m & (d <= d[m].min() + 6)
        ry, rx = np.nonzero(root)
        pieces.append((kind, m, fins, (rx.mean(), ry.mean())))

    # 縮放
    k = TARGET_L / L
    out = []
    for kind, m, src, root in pieces:
        ys, xs = np.nonzero(m)
        x0, x1, y0, y1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1
        if kind == "body":  # 上下對稱地裁，圖的正中間 = 中線 A
            half = max(A - y0, y1 - A)
            y0, y1 = A - half, A + half
        rgba = src[y0:y1, x0:x1].copy()
        rgba[..., 3] = np.where(m[y0:y1, x0:x1], rgba[..., 3], 0)
        im = Image.fromarray(rgba, "RGBA")
        w, h = max(1, round((x1 - x0) * k)), max(1, round((y1 - y0) * k))
        im = im.resize((w, h), Image.LANCZOS)
        if kind == "body":
            px, py = (x1 - 1 - x0) * k, (A - y0) * k  # 身體的「接點」= 頭尖
            s, dd = 0.0, 0.0
        else:
            px, py = (root[0] - x0) * k, (root[1] - y0) * k
            s = (bx1 - root[0]) / L
            dd = (root[1] - axis[int(round(root[0]))]) / L
        # 尾巴：記下它在身體中線的上下範圍（畫成跟著擺的帶子用）
        extra = {}
        if kind == "tail":
            ay = axis[bx0]
            extra = {"up": (ay - y0) * k, "down": (y1 - ay) * k}
        out.append({"kind": kind, "im": im, "pivot": [px, py], "s": s, "d": dd, **extra})

    # 打包成圖集（一列一列排）
    out.sort(key=lambda p: -p["im"].height)
    W = 1024
    x = y = row_h = 0
    for p in out:
        pw, ph = p["im"].width + PAD * 2, p["im"].height + PAD * 2
        if x + pw > W:
            x, y, row_h = 0, y + row_h, 0
        p["rect"] = [x + PAD, y + PAD, p["im"].width, p["im"].height]
        x += pw
        row_h = max(row_h, ph)
    H = y + row_h
    atlas = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    for p in out:
        atlas.alpha_composite(p["im"], (p["rect"][0], p["rect"][1]))
    a = np.asarray(atlas).copy()
    sh = np.zeros_like(a)
    sh[..., 0], sh[..., 1], sh[..., 2] = SHADOW_RGB
    sh[..., 3] = a[..., 3]
    shadow = Image.fromarray(sh, "RGBA").filter(ImageFilter.GaussianBlur(6))

    OUT.mkdir(parents=True, exist_ok=True)
    atlas.save(OUT / f"{color}.webp", quality=88, method=6)
    shadow.save(OUT / f"{color}-shadow.webp", quality=80, method=6)
    meta = {
        "L": TARGET_L,
        "pad": PAD,  # 影子圖集裡每個零件四周多出來的模糊範圍
        "atlas": [W, H],
        "parts": [
            {k2: (round(v, 4) if isinstance(v, float) else v) for k2, v in p.items() if k2 != "im"}
            | {"pivot": [round(p["pivot"][0], 1), round(p["pivot"][1], 1)]}
            for p in out
        ],
    }
    (OUT / f"{color}.json").write_text(json.dumps(meta, ensure_ascii=False, indent=1), encoding="utf-8")
    print(color, "L", L, "->", TARGET_L, "atlas", (W, H), [(p["kind"], round(p["s"], 2), round(p["d"], 2)) for p in out])


for color, whole in FISH:
    process(color, whole)
