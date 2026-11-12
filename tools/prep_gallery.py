"""相簿照片：縮小成網頁用的大小，並寫出 js/gallery.js（照片清單）。
用法: python -I tools/prep_gallery.py
輸入: assets/raw/gallery/<資料夾>/  一場活動一個資料夾，裡面放照片（jpg / png / webp）和 album.json：
      {"title": "瑤池金母聖誕", "date": "農曆七月十八", "order": 1, "alt": ["第一張的說明", ...]}
      order 小的排前面（畫卷最右邊）；照片照檔名順序排；alt 可以不寫
輸出: assets/gallery/<資料夾>/<n>.webp（看大圖用，長邊 1800）、<n>-t.webp（畫卷上的小圖，高 480）
      js/gallery.js
"""
import json
from pathlib import Path
from urllib.parse import quote

from PIL import Image, ImageOps

RAW = Path("assets/raw/gallery")
OUT = Path("assets/gallery")
EXT = {".jpg", ".jpeg", ".png", ".webp"}

albums = []
for folder in sorted(p for p in RAW.iterdir() if p.is_dir()) if RAW.exists() else []:
    meta = json.loads((folder / "album.json").read_text(encoding="utf-8")) if (folder / "album.json").exists() else {}
    files = sorted(f for f in folder.iterdir() if f.suffix.lower() in EXT)
    if not files:
        continue
    out = OUT / folder.name
    out.mkdir(parents=True, exist_ok=True)
    alts = meta.get("alt", [])
    photos = []
    for n, f in enumerate(files, 1):
        im = ImageOps.exif_transpose(Image.open(f)).convert("RGB")  # 手機照片的方向
        big = im.copy()
        big.thumbnail((1800, 1800), Image.LANCZOS)
        big.save(out / f"{n}.webp", quality=82, method=6)
        th = im.resize((round(im.width * 480 / im.height), 480), Image.LANCZOS)
        th.save(out / f"{n}-t.webp", quality=78, method=6)
        photos.append(
            {
                # 資料夾名稱放進網址要編碼（像「2026#1」的 # 會被當成網址的錨點）
                "src": f"assets/gallery/{quote(folder.name)}/{n}.webp",
                "thumb": f"assets/gallery/{quote(folder.name)}/{n}-t.webp",
                "w": big.width,
                "h": big.height,
                "alt": alts[n - 1] if n - 1 < len(alts) else "",
            }
        )
    albums.append({"order": meta.get("order", 999), "title": meta.get("title", folder.name), "date": meta.get("date", ""), "photos": photos})
    print(folder.name, len(photos), "photos")

albums.sort(key=lambda a: a["order"])
for a in albums:
    del a["order"]
Path("js/gallery.js").write_text(
    "// 相簿的照片清單。由 tools/prep_gallery.py 產生，不要手改：\n"
    "//   1. 照片放進 assets/raw/gallery/<資料夾>/（一場活動一個資料夾）\n"
    '//   2. 資料夾裡放一個 album.json：{"title": "瑤池金母聖誕", "date": "農曆七月十八", "order": 1}\n'
    "//   3. 跑 python -I tools/prep_gallery.py\n"
    "// 每本相簿：{ title, date, photos: [{ src, thumb, w, h, alt }] }\n"
    f"export const ALBUMS = {json.dumps(albums, ensure_ascii=False, indent=2)};\n",
    encoding="utf-8",
    newline="\n",
)
print("wrote js/gallery.js:", len(albums), "albums")
