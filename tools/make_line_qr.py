"""把道場的 LINE 連結做成 QR code 的格子，寫進 js/line-qr.js（網頁用它把桃樹的葉子排成 QR）。
用法: python -I tools/make_line_qr.py "https://lin.ee/xxxx"
換連結就重跑一次。會先自己解碼一次，確定掃得出同一個連結才寫檔。
檢查現在的檔案: python -I tools/make_line_qr.py --check（測試會用：解碼 js/line-qr.js，要讀出裡面的 LINE_URL）
"""
import json
import re
import sys
from pathlib import Path

import cv2
import numpy as np

OUT = Path("js/line-qr.js")


def decode(grid):
    """格子 → 放大、加留白的黑白圖 → OpenCV 解碼"""
    big = np.kron(np.where(grid, 0, 255).astype(np.uint8), np.ones((10, 10), np.uint8))
    big = cv2.copyMakeBorder(big, 40, 40, 40, 40, cv2.BORDER_CONSTANT, value=255)
    return cv2.QRCodeDetector().detectAndDecode(big)[0]


if len(sys.argv) == 2 and sys.argv[1] == "--check":
    src = OUT.read_text(encoding="utf-8")
    url = json.loads(re.search(r"LINE_URL = (\".*?\");", src).group(1))
    rows = json.loads(re.search(r"LINE_QR = (\[.*?\]);", src, re.S).group(1))
    text = decode(np.array([[c == "1" for c in r] for r in rows]))
    if text != url:
        sys.exit(f"decode check failed: got {text!r}, expected {url!r}")
    print(f"decoded OK: {url}")
    sys.exit(0)

if len(sys.argv) != 2 or not sys.argv[1].startswith("https://"):
    sys.exit('用法: python -I tools/make_line_qr.py "https://lin.ee/xxxx"（或 --check）')
url = sys.argv[1]
params = cv2.QRCodeEncoder.Params()
params.correction_level = cv2.QRCodeEncoder_CORRECT_LEVEL_M  # 中等容錯：葉子邊緣不完美也掃得到
img = cv2.QRCodeEncoder.create(params).encode(url)  # 白底黑格、四邊留白，每格 1 像素
dark = img < 128
ys, xs = np.nonzero(dark)
grid = dark[ys.min() : ys.max() + 1, xs.min() : xs.max() + 1]  # 去掉留白，只留格子
n = grid.shape[0]
assert grid.shape == (n, n) and (n - 17) % 4 == 0, grid.shape

# 自己掃一次：解得出同一個連結才算數
text = decode(grid)
assert text == url, f"decode check failed: {text!r}"

rows = ["".join("1" if v else "0" for v in r) for r in grid]
out = OUT
out.write_text(
    "// 由 tools/make_line_qr.py 產生，不要手改。換 LINE 連結：python -I tools/make_line_qr.py \"新連結\"\n"
    f"export const LINE_URL = {json.dumps(url)};\n"
    "// QR code 的格子（1＝深色），一列一個字串\n"
    f"export const LINE_QR = {json.dumps(rows, indent=2)};\n",
    encoding="utf-8",
    newline="\n",
)
print(f"{n}x{n} modules, {int(grid.sum())} dark, decoded OK -> {out}")
