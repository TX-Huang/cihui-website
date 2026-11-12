"""關於道場頁的四張神明卡片配圖：用首頁已經有的元素（不用生新圖），裁掉透明邊、縮到一樣高。
用法: python -I tools/prep_deity_cards.py
輸出: assets/elements/card-jinmu.webp（青鳥）、card-xuannu.webp（鳳凰）、card-nezha.webp（金蓮）、card-tudi.webp（稻穗）
"""
import json
from pathlib import Path

from PIL import Image

H = 360  # 卡片上最多 180 像素高，高解析度螢幕 ×2


def frame(sheet, data, key, i):
    x, y, w, h = json.load(open(data, encoding="utf-8"))[key][i]
    return Image.open(sheet).convert("RGBA").crop((x, y, x + w, y + h))


def save(im, name):
    im = im.crop(im.getbbox())
    im = im.resize((round(im.width * H / im.height), H), Image.LANCZOS)
    out = Path(f"assets/elements/card-{name}.webp")
    im.save(out, quality=85, method=6)
    print(out, im.size)


save(frame("assets/birds/bluebird-perch.webp", "assets/birds/bluebird-perch.json", "rects", 0), "jinmu")
save(frame("assets/phoenix/phoenix-front.webp", "assets/phoenix/phoenix-front.json", "frames", 0), "xuannu")
save(Image.open("assets/elements/lotus-open.webp").convert("RGBA"), "nezha")
save(Image.open("assets/elements/rice.webp").convert("RGBA"), "tudi")
