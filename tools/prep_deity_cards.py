"""關於道場頁的四張神明卡片配圖：用首頁已經有的元素（不用生新圖），裁掉透明邊、縮到一樣高。
用法: python -I tools/prep_deity_cards.py
輸出: assets/elements/card-jinmu.webp（丹鳳）、card-xuannu.webp（拂塵）、card-nezha.webp（乾坤圈）、card-tudi.webp（稻穗）
（2026-11-15 起都是鳳凰油畫風的新元素：丹鳳搬到金母、玄女改拂塵、三太子改乾坤圈和火尖槍）
"""
import json
from pathlib import Path

from PIL import Image

H = 360  # 卡片上最多 180 像素高，高解析度螢幕 ×2


def frame(sheet, data, key, i):
    x, y, w, h = json.load(open(data, encoding="utf-8"))[key][i][:4]
    return Image.open(sheet).convert("RGBA").crop((x, y, x + w, y + h))


def save(im, name):
    im = im.crop(im.getbbox())
    im = im.resize((round(im.width * H / im.height), H), Image.LANCZOS)
    out = Path(f"assets/elements/card-{name}.webp")
    im.save(out, quality=85, method=6)
    print(out, im.size)


save(frame("assets/phoenix2/fly.webp", "assets/phoenix2/fly.json", "frames", 0), "jinmu")
save(Image.open("assets/elements/fuchen.webp").convert("RGBA"), "xuannu")
save(Image.open("assets/elements/qiankunquan.webp").convert("RGBA"), "nezha")
save(Image.open("assets/elements/rice.webp").convert("RGBA"), "tudi")
