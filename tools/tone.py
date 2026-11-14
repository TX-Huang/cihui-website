"""把油畫風的素材調淡，配月白素雅的網頁（使用者 2026-11-15 選的方向：「素材調淡」）。
用法（給其他 prep 程式 import）: from tone import tone；tone(rgb陣列 0～255, 強度)
也可以單獨跑看效果: python -I tools/tone.py 圖.png 強度 輸出.png

跟比較圖（docs/previews/style-match.jpg 第 2 欄）用的 CSS 濾鏡一樣，強度 1 =
  saturate(0.5) sepia(0.22) brightness(1.07) contrast(0.88)
強度 0.5 = 一半（鳳凰是主角，只調一半，保留紅色）。
"""
import sys

import numpy as np

# CSS 濾鏡規格裡的矩陣（Filter Effects Module Level 1）
_LUM = np.array([0.2126, 0.7152, 0.0722])
_SEPIA = np.array([[0.393, 0.769, 0.189], [0.349, 0.686, 0.168], [0.272, 0.534, 0.131]])


def tone(rgb, amount=1.0):
    """rgb：H×W×3 的 0～255 浮點數陣列；回傳調好的（一樣的形狀和範圍）"""
    t = float(amount)
    if t <= 0:
        return rgb
    x = rgb / 255.0
    # 1. 降低飽和度：往同樣亮度的灰靠
    s = 1 - 0.5 * t
    lum = (x @ _LUM)[..., None]
    x = lum + (x - lum) * s
    # 2. 一點點舊紙的暖色
    p = 0.22 * t
    x = x * (1 - p) + np.clip(x @ _SEPIA.T, 0, 1) * p
    # 3. 亮一點、4. 對比低一點
    x = x * (1 + 0.07 * t)
    x = (x - 0.5) * (1 - 0.12 * t) + 0.5
    return np.clip(x * 255, 0, 255)


if __name__ == "__main__":
    from PIL import Image

    src, amount, out = sys.argv[1], float(sys.argv[2]), sys.argv[3]
    im = Image.open(src).convert("RGBA")
    a = np.asarray(im).astype(float)
    a[..., :3] = tone(a[..., :3], amount)
    Image.fromarray(a.clip(0, 255).astype(np.uint8), "RGBA").save(out)
