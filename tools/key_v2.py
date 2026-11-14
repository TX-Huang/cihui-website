"""把 AI Video（FLUX）做的油畫風元素去背，存成透明 PNG，給 tools/prep_elements.py、prep_peach.py 等接著用。
用法: python -I tools/key_v2.py
輸入: assets/raw/chatgpt2/*（使用者 2026-11-15 照推薦挑的那張）
輸出: assets/raw/chatgpt2/keyed/{名稱}.png

FLUX 畫不出純色背景（有筆觸、顏色也不太一樣），所以不量「跟某個顏色多近」，改量「背景那個顏色多突出」：
  綠底：綠比紅藍高多少；洋紅底：紅藍比綠高多少；藍底：藍比紅綠高多少；黑底：多亮。
  背景那種顏色越突出 → 越透明，邊緣用一小段漸變；邊緣把混進來的背景色壓掉。
最後只留大塊的（主體），背景上零星的小點、小火星拿掉。
"""
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage

RAW = Path("assets/raw/chatgpt2")
OUT = RAW / "keyed"

# 名稱: (來源檔, 背景, 保留小塊的最小面積比例)
# TIGHT：背景突出到角落典型值的幾成就算背景（預設 0.7；稻穗原圖在穀粒外畫了一圈淡粉紅的光，要更嚴）
TIGHT = {"rice": 0.35}
ITEMS = {
    "peach-tree": ("peach-tree-v2-1.png", "blue", 0.002),
    "lotus-open": ("lotus-open-v2-1.png", "magenta", 0.002),
    "lotus-bud": ("lotus-bud-v2-1.png", "magenta", 0.002),
    "lotus-leaf": ("lotus-leaf-v2-2.png", "magenta", 0.002),
    "rice": ("rice-v2-2.png", "magenta", 0.0005),
    "tiger": ("tiger-v2-2.png", "green", 0.002),
    "fuchen": ("fuchen-2.png", "black", 0.0005),
    "cloud-wisp": ("cloud-wisp-4.png", "black", 0.002),
    "qiankunquan": ("qiankunquan-2.png", "green", 0.002),
    "huojianqiang": ("huojianqiang-2.png", "green", 0.0005),
    # 鯉魚：整隻去背，再用 tools/split_koi.py 拆成身體、鰭（FLUX 改圖拆不開）
    "redkoi": ("redkoi-v2-1.png", "green", 0.0005),
    "bluekoi": ("bluekoi-v2-1.png", "magenta", 0.0005),
    "platinumkoi": ("platinumkoi-v2-1.png", "green", 0.0005),
}


def dominance(rgb, bg):
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    if bg == "green":
        return g - np.maximum(r, b)
    if bg == "magenta":
        return np.minimum(r, b) - g
    if bg == "blue":
        return b - np.maximum(r, g)
    raise ValueError(bg)


def key(rgb, bg, tight=0.7):
    if bg == "black":
        lum = rgb.max(axis=2)
        a = np.clip((lum - 45) / 70, 0, 1)
        out = rgb / np.maximum(a[..., None], 0.3)
        return out, a
    d = dominance(rgb, bg)
    # 量四個角：背景有多突出（每張不太一樣）
    corners = np.concatenate([d[:40, :40].ravel(), d[:40, -40:].ravel(), d[-40:, :40].ravel(), d[-40:, -40:].ravel()])
    full = np.percentile(corners, 20)  # 這麼突出 = 完全是背景
    # 背景的筆觸有深有淺：突出到「角落典型值的 7 成」就算背景，3 成以下才完全不透明（邊緣不留一圈背景色）
    a = np.clip((full * tight - d) / (full * 0.4), 0, 1)
    # 邊緣去色：邊緣的顏色 = 主體 ×a + 背景 ×(1-a)，把背景那一份扣掉（背景色用四個角的中位數）
    edge = lambda x: np.concatenate([x[:40, :40].reshape(-1, 3), x[:40, -40:].reshape(-1, 3), x[-40:, :40].reshape(-1, 3), x[-40:, -40:].reshape(-1, 3)])
    bgcol = np.median(edge(rgb), axis=0)
    av = np.maximum(a, 0.15)[..., None]
    out = np.clip((rgb - (1 - av) * bgcol) / av, 0, 255)
    # 還殘留的背景色壓掉（只壓到跟其他顏色一樣高，主體本身的顏色不受影響）
    if bg == "green":
        out[..., 1] = np.minimum(out[..., 1], np.maximum(out[..., 0], out[..., 2]))
    elif bg == "magenta":
        out[..., 2] = np.where(a < 1, np.minimum(out[..., 2], out[..., 1] + 10), out[..., 2])
    elif bg == "blue":
        out[..., 2] = np.where(a < 1, np.minimum(out[..., 2], np.maximum(out[..., 0], out[..., 1]) + 10), out[..., 2])
    # FLUX 的筆觸會把背景色混進主體最外面 1～2 像素（細細一圈粉紅或綠）：透明度往內縮 2 像素、再柔化
    a = ndimage.minimum_filter(a, size=5)
    a = ndimage.uniform_filter(a, size=3)
    return out, a


def keep_big(a, min_frac):
    lab, n = ndimage.label(a > 0.1)
    if n == 0:
        return a
    sizes = ndimage.sum(np.ones_like(a), lab, range(1, n + 1))
    keep = np.zeros(n + 1, bool)
    keep[1:] = sizes >= max(min_frac * a.size, 30)
    keep[1 + int(np.argmax(sizes))] = True
    # 半透明的邊（< 0.1）跟著旁邊的大塊走：稍微長大一點的範圍內才保留
    mask = ndimage.binary_dilation(keep[lab], iterations=3)
    return np.where(mask, a, 0)


OUT.mkdir(parents=True, exist_ok=True)
for name, (src, bg, min_frac) in ITEMS.items():
    rgb = np.asarray(Image.open(RAW / src).convert("RGB")).astype(float)
    out, a = key(rgb, bg, TIGHT.get(name, 0.7))
    a = keep_big(a, min_frac)
    a[a < 0.03] = 0
    img = Image.fromarray(np.dstack([out, a * 255]).clip(0, 255).astype(np.uint8), "RGBA")
    img.save(OUT / f"{name}.png")
    ys, xs = np.nonzero(a > 0.5)
    print(f"{name:13s} {bg:7s} 主體 {xs.min()}-{xs.max()} x {ys.min()}-{ys.max()}  不透明 {(a > 0.5).mean():.0%}")
