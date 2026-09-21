"""Construieste fundalurile graficii din afisul principal.

Foloseste doar fundalul difuz din dreapta artistului (x 700-1070, y 180-770) —
o zona fara persoana si fara textul imprimat pe afis — pe care o intinde peste
toata panza, o blureaza si o stinge spre negru cald.

    python3 make_bg.py /cale/catre/afis.webp
"""
from PIL import Image, ImageFilter
import numpy as np
import sys

P = Image.open(sys.argv[1] if len(sys.argv) > 1 else 'afis.webp').convert('RGB')
BACKDROP = (700, 180, 1070, 770)          # fundal difuz, fara artist

def build(W, H, glow_y, fade_start, fade_end, top_dark=0.0):
    src = P.crop(BACKDROP).resize((W, H), Image.LANCZOS)
    a = np.asarray(src.filter(ImageFilter.GaussianBlur(int(46 * W / 1080)))).astype(float)

    yy = np.linspace(0, H, H)[:, None]
    xx = np.linspace(0, 1, W)[None, :]
    # halou cald in treimea de sus, acolo unde sta logo-ul si numele
    glow = 0.52 + 1.30 * np.exp(-(((yy - glow_y) ** 2) / (2 * (H * 0.17) ** 2)
                                  + ((xx - 0.5) ** 2) / 0.24))
    t = np.clip((yy - fade_start) / (fade_end - fade_start), 0, 1)
    fade = 1 - 0.80 * (t ** 1.2)
    fade = fade * (1 - top_dark * np.exp(-(yy ** 2) / (2 * 140.0 ** 2)))
    vig = np.clip(1 - 0.46 * (((xx - 0.5) * 2) ** 2)
                    - 0.16 * (((yy / H - 0.30) * 2) ** 2), 0.26, 1)

    a = a * (glow * fade * vig)[..., None] * 0.92
    a = a * np.array([1.08, 0.97, 0.85]) + np.array([14, 9, 6])
    a = np.clip(a, 0, 255)
    rng = np.random.default_rng(11)
    a = np.clip(a + rng.normal(0, 4.2, a.shape), 0, 255).astype(np.uint8)
    return Image.fromarray(a)

if __name__ == '__main__':
    build(1080, 1440, 300, 430,  980).save('assets/bg.png')
    build(1080, 1920, 520, 700, 1330, top_dark=0.34).save('assets/bg_story.png')
    print('assets/bg.png + assets/bg_story.png regenerate')
