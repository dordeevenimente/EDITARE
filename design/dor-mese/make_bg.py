from PIL import Image, ImageFilter
import numpy as np

import sys
# afișul principal, la rezoluția originală 1080x1440
P = Image.open(sys.argv[1] if len(sys.argv) > 1 else 'afis.webp').convert('RGB')
STRIP_TOP, STRIP_BOT = 170, 770

def build(W, H, scale, head_y, fade_start, fade_end, top_dark=0.34):
    strip = P.crop((0, STRIP_TOP, 1080, STRIP_BOT))
    sw = int(1080*scale); sh = int(strip.height*scale)
    strip = strip.resize((sw, sh), Image.LANCZOS)
    canvas = Image.new('RGB', (W, H), (16, 11, 7))
    x0 = (W - sw)//2
    canvas.paste(strip, (x0, head_y))
    if x0 > 0:
        canvas.paste(strip.crop((0,0,2,sh)).resize((x0, sh), Image.BICUBIC), (0, head_y))
        canvas.paste(strip.crop((sw-2,0,sw,sh)).resize((W-x0-sw, sh), Image.BICUBIC), (x0+sw, head_y))
    full = canvas.crop((0, head_y, W, head_y+sh))
    if head_y > 0:
        canvas.paste(full.crop((0,0,W,2)).resize((W, head_y), Image.BICUBIC), (0,0))
    tail_h = max(H-head_y-sh, 1)
    tail = np.asarray(full.crop((0,sh-3,W,sh)).resize((W, tail_h), Image.BICUBIC)).astype(float)
    tail *= np.linspace(1.0, 0.0, tail_h)[:,None,None] ** 0.8
    canvas.paste(Image.fromarray(tail.astype(np.uint8)), (0, head_y+sh))

    a = np.asarray(canvas.filter(ImageFilter.GaussianBlur(4))).astype(float)
    yy = np.linspace(0, H, H)[:,None]; xx = np.linspace(0, 1, W)[None,:]
    t = np.clip((yy-fade_start)/(fade_end-fade_start), 0, 1)
    keep = (1 - 0.95*(t**1.25)) * (1 - top_dark*np.exp(-(yy**2)/(2*140.0**2)))
    vig = np.clip(1 - 0.44*(((xx-0.5)*2)**2) - 0.10*(((yy/H-0.30)*2)**2), 0.28, 1)
    a = a * (keep*vig)[...,None] * 0.84
    a = a * np.array([1.06,0.98,0.90]) + np.array([11,7,5])
    a = np.clip(a,0,255)
    rng = np.random.default_rng(5)
    a = np.clip(a + rng.normal(0,4.0,a.shape),0,255).astype(np.uint8)
    return Image.fromarray(a)

if __name__ == '__main__':
    build(1080, 1440, 0.84,  86, 505,  880).save('assets/bg.png')
    build(1080, 1920, 0.95, 296, 820, 1330, top_dark=0.0).save('assets/bg_story.png')
    print('assets/bg.png + assets/bg_story.png regenerate')
