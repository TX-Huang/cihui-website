"""用 Real-ESRGAN（AI 放大）把透明背景的 PNG 放大，保留透明。
用法: python -I tools/upscale.py 輸入.png 輸出.png [倍數，預設 2]

模型檔放在 ~/.cache/realesrgan/RealESRGAN_x4plus.pth
（來源：https://github.com/xinntao/Real-ESRGAN/releases/download/v0.1.0/RealESRGAN_x4plus.pth）
做法：先 4 倍放大，再用 Lanczos 縮到要的倍數（比直接 2 倍細緻）。
透明的地方：顏色先往外擴（不然邊緣會有黑邊），透明度本身也用 AI 放大，邊緣比較銳利。
"""
import sys
from pathlib import Path

import numpy as np
import torch
from PIL import Image
from scipy import ndimage
from spandrel import ModelLoader

MODEL = Path.home() / ".cache/realesrgan/RealESRGAN_x4plus.pth"
TILE = 384
OVERLAP = 24


def load_model():
    state = torch.load(MODEL, map_location="cpu", weights_only=True)  # 只讀權重，不執行檔案裡的程式
    if "params_ema" in state:
        state = state["params_ema"]
    model = ModelLoader().load_from_state_dict(state).model
    dev = "cuda" if torch.cuda.is_available() else "cpu"
    return model.eval().to(dev), dev


def run(model, dev, rgb):
    """rgb: HxWx3 float 0..1 → 4 倍大的 HxWx3，分塊跑免得顯示卡記憶體不夠"""
    h, w, _ = rgb.shape
    out = np.zeros((h * 4, w * 4, 3), np.float32)
    weight = np.zeros((h * 4, w * 4, 1), np.float32)
    for y0 in range(0, h, TILE - OVERLAP):
        for x0 in range(0, w, TILE - OVERLAP):
            y1, x1 = min(h, y0 + TILE), min(w, x0 + TILE)
            tile = torch.from_numpy(rgb[y0:y1, x0:x1].transpose(2, 0, 1)).unsqueeze(0).to(dev)
            with torch.no_grad():
                up = model(tile).clamp(0, 1)[0].cpu().numpy().transpose(1, 2, 0)
            # 邊緣用漸變權重拼接，看不出接縫
            th, tw = up.shape[:2]
            ry = np.minimum(np.arange(th) + 1, np.arange(th)[::-1] + 1).clip(max=OVERLAP * 4) / (OVERLAP * 4)
            rx = np.minimum(np.arange(tw) + 1, np.arange(tw)[::-1] + 1).clip(max=OVERLAP * 4) / (OVERLAP * 4)
            m = (ry[:, None] * rx[None, :])[..., None].astype(np.float32)
            out[y0 * 4 : y0 * 4 + th, x0 * 4 : x0 * 4 + tw] += up * m
            weight[y0 * 4 : y0 * 4 + th, x0 * 4 : x0 * 4 + tw] += m
            if x1 == w:
                break
        if y1 == h:
            break
    return out / np.maximum(weight, 1e-6)


def bleed(rgba):
    """透明的地方填上最近的不透明顏色"""
    a = rgba[..., 3]
    solid = a > 0.02
    idx = ndimage.distance_transform_edt(~solid, return_distances=False, return_indices=True)
    return rgba[..., :3][idx[0], idx[1]]


def main():
    src, dst = sys.argv[1], sys.argv[2]
    factor = float(sys.argv[3]) if len(sys.argv) > 3 else 2
    im = Image.open(src).convert("RGBA")
    rgba = np.asarray(im).astype(np.float32) / 255
    model, dev = load_model()
    rgb4 = run(model, dev, bleed(rgba))
    a4 = run(model, dev, np.repeat(rgba[..., 3:4], 3, axis=2)).mean(axis=2, keepdims=True)
    big = np.concatenate([rgb4, a4], axis=2)
    big = Image.fromarray((big * 255).round().clip(0, 255).astype(np.uint8), "RGBA")
    size = (round(im.width * factor), round(im.height * factor))
    big.resize(size, Image.LANCZOS).save(dst)
    print(f"{src} {im.size} -> {dst} {size} ({dev})")


if __name__ == "__main__":
    main()
