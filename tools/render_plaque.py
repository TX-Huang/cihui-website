"""把匾額文字用崇羲篆體畫成透明背景的金字圖，做出雕刻的立體感。
崇羲篆體授權 CC BY-ND 3.0 TW：可以使用、要標示作者、不能改字型檔。
所以這裡只「用字型畫圖」，不把字型檔放進網站，也不修改字型。

用法: python -I tools/render_plaque.py 字型檔.otf 輸出.webp [carved|relief|flat]
  carved：陰刻——字挖進木頭裡，凹槽裡貼金箔（左上的槽壁背光比較暗、右下的槽壁受光）
  relief：陽刻——字凸出木頭，像浮雕（左上受光、右下背光，底下有落影）
  flat  ：原本的平面金箔字

立體感的做法：把字的形狀模糊成「高度圖」（邊緣斜下去），算出每一點斜面朝哪個方向，
再用「光從左上照下來」算亮暗。
"""
import sys

import numpy as np
from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageFont
from scipy import ndimage

font_path, out = sys.argv[1], sys.argv[2]
style = sys.argv[3] if len(sys.argv) > 3 else "carved"
TEXT = "慈惠道場"
# 匾額大小（js/gate.js 的 plaque：w 319, h 83），畫 3 倍大比較清楚
S = 3
W, H = 319 * S, 83 * S
size = int(H * 0.72)  # 字高約匾額高的 72%
spacing = size * 0.35  # 字距

font = ImageFont.truetype(font_path, size)
widths = [font.getbbox(c)[2] - font.getbbox(c)[0] for c in TEXT]
total = sum(widths) + spacing * (len(TEXT) - 1)
scale = min(1, (W * 0.92) / total)  # 太寬就縮小
if scale < 1:
    font = ImageFont.truetype(font_path, int(size * scale))
    widths = [font.getbbox(c)[2] - font.getbbox(c)[0] for c in TEXT]
    spacing *= scale
    total = sum(widths) + spacing * (len(TEXT) - 1)
mask_img = Image.new("L", (W, H), 0)
d = ImageDraw.Draw(mask_img)
x = (W - total) / 2
for c, cw in zip(TEXT, widths):
    bb = font.getbbox(c)
    d.text((x - bb[0], H / 2 - (bb[1] + bb[3]) / 2), c, font=font, fill=255)
    x += cw + spacing
m = np.asarray(mask_img).astype(float) / 255

# 金箔底色：上亮下深
yy = np.linspace(0, 1, H)[:, None] * np.ones((1, W))
top, bot = np.array([246, 222, 150]), np.array([168, 120, 50])
gold = top[None, None, :] * (1 - yy[..., None]) + bot[None, None, :] * yy[..., None]

LIGHT = np.array([-0.55, -0.65, 0.52])  # 光從左上前方照過來
LIGHT /= np.linalg.norm(LIGHT)


def shading(height, strength):
    gy, gx = np.gradient(height)
    n = np.dstack([-gx * strength, -gy * strength, np.ones_like(height)])
    n /= np.linalg.norm(n, axis=2, keepdims=True)
    return (n * LIGHT).sum(axis=2)  # 平的地方約 0.52，朝光越亮、背光越暗


def to_img(rgb, alpha):
    return Image.fromarray(np.dstack([rgb.clip(0, 255), (alpha * 255).clip(0, 255)]).astype(np.uint8), "RGBA")


out_img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
bevel = 2.2 * S

if style == "flat":
    shadow = Image.new("RGBA", (W, H), (60, 35, 10, 150))
    shadow.putalpha(ImageChops.offset(mask_img, 1 * S, 2 * S).filter(ImageFilter.GaussianBlur(1.5 * S)))
    out_img.alpha_composite(shadow)
    out_img.alpha_composite(to_img(gold, m))

elif style == "relief":
    # 陽刻：字凸出來。高度 = 字的形狀模糊（邊緣是斜面）
    h = ndimage.gaussian_filter(m, bevel)
    light = shading(h, 3.2 * S)
    # 落影：往右下偏、模糊
    shadow = Image.new("RGBA", (W, H), (45, 25, 8, 170))
    shadow.putalpha(ImageChops.offset(mask_img, int(1.6 * S), int(2.4 * S)).filter(ImageFilter.GaussianBlur(1.6 * S)))
    out_img.alpha_composite(shadow)
    k = (light / 0.52)[..., None]
    rgb = gold * (0.35 + 0.65 * k)
    spec = np.clip((light - 0.75) / 0.25, 0, 1)[..., None] ** 2  # 最朝光的邊緣一點反光
    rgb = rgb + spec * 90
    out_img.alpha_composite(to_img(rgb, m))

else:  # carved 陰刻
    # 字是凹下去的槽：高度 = 負的模糊字形
    h = -ndimage.gaussian_filter(m, bevel)
    light = shading(h, 3.2 * S)
    k = (light / 0.52)[..., None]
    rgb = gold * (0.2 + 0.72 * k)  # 槽裡整體比外面暗一點（光照不太進去）
    out_img.alpha_composite(to_img(rgb, m))
    # 槽口的木頭邊：右下邊緣外側受光（淡亮線）、左上邊緣外側有一點暗
    edge = ndimage.gaussian_filter(m, 0.8 * S) - m
    edge = np.clip(edge, 0, 1)
    gy, gx = np.gradient(ndimage.gaussian_filter(m, 1.2 * S))
    facing = -(gx * LIGHT[0] + gy * LIGHT[1])  # 槽口朝光的程度
    lit = np.clip(-facing * 6 * S, 0, 1) * edge * 2.2
    dark = np.clip(facing * 6 * S, 0, 1) * edge * 2.2
    hi = np.zeros((H, W, 3)) + np.array([255, 240, 210])
    lo = np.zeros((H, W, 3)) + np.array([60, 35, 12])
    out_img.alpha_composite(to_img(hi, np.clip(lit, 0, 0.7)))
    out_img.alpha_composite(to_img(lo, np.clip(dark, 0, 0.6)))

out_img.save(out, quality=92, method=6)
print(out, style, out_img.size)
