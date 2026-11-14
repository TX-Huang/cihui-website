"""把整隻鯉魚（已去背）拆成「身體」和「鰭＋尾巴」兩張圖，給 tools/prep_koi_parts.py 用。
用法: python -I tools/split_koi.py
輸入: assets/raw/chatgpt2/keyed/{redkoi,bluekoi,platinumkoi}.png（tools/key_v2.py 去背的，頭朝右、從上往下看）
輸出: assets/raw/chatgpt2/keyed/koi-{red,blue,platinum}-body.png、koi-{色}-fins.png（同一張畫布、同一個位置）

為什麼要自己拆：AI Video 的 FLUX 改圖拆不開（每次都還是整隻魚）。
做法（第二版；第一版用圓去刷，鰭根太厚會被當成身體）：
  魚頭朝右、身體橫的。中線用一條（幾乎直的）線去配每一欄的中點，被鰭拉歪的欄不算。
  每一欄量「中線往上、往下各有多厚」，畫成兩條曲線。
  鰭會讓曲線在某一段突然鼓起來；身體的曲線是平滑的。所以把曲線上「鼓起來的那一段」削掉
  （一維的 opening：比鰭還寬的視窗裡取最小、再取最大），剩下的就是身體的上下邊緣。
  身體從頭尖到尾柄最細的地方；尾柄後面整片都算尾巴。鰭 = 整隻魚扣掉身體。
"""
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage

DIR = Path("assets/raw/chatgpt2/keyed")
FISH = [("red", "redkoi"), ("blue", "bluekoi"), ("platinum", "platinumkoi")]


def disk(r):
    y, x = np.mgrid[-r : r + 1, -r : r + 1]
    return x * x + y * y <= r * r


def smooth1d(v, n):
    k = np.ones(n) / n
    return np.convolve(np.pad(v, n, mode="edge"), k, mode="same")[n:-n]


for color, name in FISH:
    im = np.asarray(Image.open(DIR / f"{name}.png").convert("RGBA"))
    a = im[..., 3].astype(float) / 255
    solid = a > 0.5
    ys, xs = np.nonzero(solid)
    x0, x1 = xs.min(), xs.max()
    L = x1 - x0
    # 中線：每一欄不透明部分的中點，平滑一下
    cols = range(x0, x1 + 1)
    mid = np.array([np.nonzero(solid[:, x])[0].mean() if solid[:, x].any() else np.nan for x in cols])
    # 魚身是直的：用一條線（稍微可以彎）去配，鰭把某些欄的中點拉歪的就丟掉、再配一次
    ok = ~np.isnan(mid)
    xi = np.arange(len(mid))
    for _ in range(4):
        fit = np.polyfit(xi[ok], mid[ok], 2)
        res = np.abs(mid - np.polyval(fit, xi))
        ok = ok & (res < max(6, np.nanpercentile(res[ok], 60)))
    mid = np.polyval(fit, xi)
    # 量厚度用的：直的方向把 30 像素以內的透明縫補起來（鰓、鱗片邊有時候有細縫，剛好在中線上就會量成 0）
    closed = ndimage.binary_closing(solid, structure=np.ones((31, 1)))
    up = np.zeros(len(mid))
    dn = np.zeros(len(mid))
    for i, x in enumerate(cols):
        c = int(round(mid[i]))
        col = closed[:, x]
        if not col[c]:
            continue
        # 從中線往上、往下數連續不透明的長度
        above = np.nonzero(~col[:c][::-1])[0]
        below = np.nonzero(~col[c:])[0]
        up[i] = above[0] if len(above) else c
        dn[i] = below[0] if len(below) else len(col) - c
    # 中線剛好碰到透明縫的那幾欄（量出來是 0）：用旁邊的欄補，不然下面的 opening 會把那一整段（例如頭）削掉
    for v in (up, dn):
        bad = v <= 0
        if bad.any() and (~bad).any():
            v[bad] = np.interp(np.nonzero(bad)[0], np.nonzero(~bad)[0], v[~bad])
    win = max(9, int(L * 0.22))  # 比鰭寬的視窗
    up2 = ndimage.grey_opening(up, size=win)
    dn2 = ndimage.grey_opening(dn, size=win)
    up2 = smooth1d(np.minimum(up2, up), 9)
    dn2 = smooth1d(np.minimum(dn2, dn), 9)
    # 尾柄：尾巴前面最細的地方；尾柄後面都是尾巴
    thick = up2 + dn2
    raw = smooth1d(up + dn, 9)  # 沒削過的厚度：尾鰭那段很厚，尾柄最細
    back = slice(int(len(thick) * 0.15), int(len(thick) * 0.55))  # 這批鯉魚的尾巴很長（量過：約占魚長最後 35%），尾柄在這段裡
    tail_i = back.start + int(np.argmin(raw[back]))
    body = np.zeros_like(solid)
    yy = np.arange(solid.shape[0])[:, None]
    for i, x in enumerate(cols):
        if i < tail_i:
            continue
        c = mid[i]
        body[:, x] = ((yy[:, 0] >= c - up2[i]) & (yy[:, 0] <= c + dn2[i])) & (a[:, x] > 0.05)
    # 鰓那裡有時候有一條半透明的縫，頭會跟身體斷開：橫向補起來；再丟掉零星的小塊
    body = ndimage.binary_closing(body, structure=np.ones((1, 31))) & (a > 0.05)
    lab, n = ndimage.label(body)
    sizes = ndimage.sum(np.ones_like(a), lab, range(1, n + 1))
    body = np.isin(lab, 1 + np.nonzero(sizes >= sizes.max() * 0.05)[0])
    body = ndimage.binary_fill_holes(body)
    soft = ndimage.gaussian_filter(ndimage.binary_dilation(body, iterations=2).astype(float), 1.5)
    out_body = im.copy()
    out_body[..., 3] = (a * soft * 255).clip(0, 255).astype(np.uint8)
    out_fins = im.copy()
    out_fins[..., 3] = (a * (1 - soft) * 255).clip(0, 255).astype(np.uint8)
    Image.fromarray(out_body, "RGBA").save(DIR / f"koi-{color}-body.png")
    Image.fromarray(out_fins, "RGBA").save(DIR / f"koi-{color}-fins.png")
    bys, bxs = np.nonzero(body)
    print(f"{color}: 魚長 {L}，尾柄在 x {x0 + tail_i}，身體 x {bxs.min()}-{bxs.max()}、最厚 {thick.max():.0f}px")
