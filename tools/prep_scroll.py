"""相簿畫卷的圖：ChatGPT 生的 4 張（docs/chatgpt-prompts-2.md 第 8 節）整理成網頁用的。
用法: python -I tools/prep_scroll.py
輸入: assets/raw/chatgpt2/scroll-paper.png、scroll-end.png、hang-top.png、hang-bottom.png
輸出: assets/scroll/
  paper.webp     橫的紙＋上下裱綾，左右接得起來（手卷，左右重複）
  paper-v.webp   同一張轉 90 度，上下接得起來（手機掛軸，上下重複）
  end.webp       捲起來的那一端（左右兩端都用，右端在網頁上左右翻轉）
  hang-top.webp、hang-bottom.webp  掛軸上下端（清掉去背沒去乾淨的小點）
"""
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage

RAW = Path("assets/raw/chatgpt2")
OUT = Path("assets/scroll")
OUT.mkdir(parents=True, exist_ok=True)


def seamless_x(im, blend=0.12):
    """左右接起來看不出接縫：右邊一段跟左邊一段漸漸混在一起，再把左邊那段切掉"""
    a = np.asarray(im).astype(float)
    w = a.shape[1]
    b = int(w * blend)
    ramp = np.linspace(0, 1, b)[None, :, None]
    right = a[:, w - b :] * (1 - ramp) + a[:, :b] * ramp
    out = np.concatenate([a[:, b : w - b], right], axis=1)
    return Image.fromarray(out.clip(0, 255).astype(np.uint8))


def calm(im, keep=0.65):
    """顏色收斂一點，往網站的月白靠（保留 65% 的彩度）"""
    a = np.asarray(im).astype(float)
    gray = a[..., :3] @ np.array([0.299, 0.587, 0.114])
    a[..., :3] = a[..., :3] * keep + gray[..., None] * (1 - keep)
    return Image.fromarray(a.clip(0, 255).astype(np.uint8), im.mode)


def clean(im, min_area=400):
    """去背沒去乾淨的小點：半透明的邊緣收乾淨，太小的碎塊拿掉"""
    a = np.asarray(im.convert("RGBA")).copy()
    alpha = a[..., 3]
    solid = alpha > 160
    lab, n = ndimage.label(solid)
    sizes = ndimage.sum(solid, lab, range(1, n + 1))
    keep = np.isin(lab, np.nonzero(sizes >= min_area)[0] + 1)
    keep = ndimage.binary_dilation(keep, iterations=2)  # 保留主體旁邊柔和的邊
    alpha = np.where(keep, alpha, 0)
    alpha = np.where(alpha < 24, 0, alpha)
    a[..., 3] = alpha
    out = Image.fromarray(a, "RGBA")
    return out.crop(out.getbbox())


def save(im, name, height=None, width=None, q=84):
    if height:
        im = im.resize((round(im.width * height / im.height), height), Image.LANCZOS)
    if width:
        im = im.resize((width, round(im.height * width / im.width)), Image.LANCZOS)
    im.save(OUT / name, quality=q, method=6)
    print(OUT / name, im.size, f"{(OUT / name).stat().st_size // 1024} KB")


paper = calm(seamless_x(Image.open(RAW / "scroll-paper.png").convert("RGB")))
save(paper, "paper.webp", height=800, q=80)
save(paper.rotate(90, expand=True), "paper-v.webp", width=800, q=80)
save(clean(Image.open(RAW / "scroll-end.png")), "end.webp", height=900)
save(clean(Image.open(RAW / "hang-top.png")), "hang-top.webp", width=1100)
save(clean(Image.open(RAW / "hang-bottom.png")), "hang-bottom.webp", width=1100)
