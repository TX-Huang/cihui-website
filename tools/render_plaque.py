"""把匾額文字用崇羲篆體畫成透明背景的金箔字圖（樣式 3）。
崇羲篆體授權 CC BY-ND 3.0 TW：可以使用、要標示作者、不能改字型檔。
所以這裡只「用字型畫圖」，不把字型檔放進網站，也不修改字型。
用法: python -I tools/render_plaque.py 字型檔.otf assets/plaque-text.webp
"""
import sys
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageChops

font_path, out = sys.argv[1], sys.argv[2]
TEXT = "慈惠道場"
# 匾額大小（js/gate.js 的 plaque：w 384, h 86），畫 3 倍大比較清楚
S = 3
W, H = 384 * S, 86 * S
size = int(H * 0.72)        # 字高約匾額高的 72%
spacing = size * 0.35       # 字距

font = ImageFont.truetype(font_path, size)
widths = [font.getbbox(c)[2] - font.getbbox(c)[0] for c in TEXT]
total = sum(widths) + spacing * (len(TEXT) - 1)
mask = Image.new("L", (W, H), 0)
d = ImageDraw.Draw(mask)
x = (W - total) / 2
for c, cw in zip(TEXT, widths):
    bb = font.getbbox(c)
    d.text((x - bb[0], H / 2 - (bb[1] + bb[3]) / 2), c, font=font, fill=255)
    x += cw + spacing

out_img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
# 淡淡的陰影，讓字像貼在木頭上
shadow = Image.new("RGBA", (W, H), (60, 35, 10, 150))
shadow.putalpha(ImageChops.offset(mask, 1 * S, 2 * S).filter(ImageFilter.GaussianBlur(1.5 * S)))
out_img.alpha_composite(shadow)
# 金箔：上亮下深的漸層
grad = Image.linear_gradient("L").resize((W, H))
top, bot = (246, 222, 150), (150, 105, 40)
gold = Image.merge("RGB", [grad.point(lambda v, a=a, b=b: int(a + (b - a) * v / 255)) for a, b in zip(top, bot)]).convert("RGBA")
gold.putalpha(mask)
out_img.alpha_composite(gold)
out_img.save(out, quality=92, method=6)
print(out, out_img.size)
