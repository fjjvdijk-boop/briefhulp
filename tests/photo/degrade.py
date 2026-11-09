# Fotoproef: bootst echte telefoonfoto's na van de testbrieven: schaduw, donker, scheef op tafel, wazig, klein, combinatie.
import sys, os, glob, io, random
import numpy as np
from PIL import Image, ImageFilter, ImageEnhance
src, out = sys.argv[1], sys.argv[2]
ONLY = sys.argv[3].split(',') if len(sys.argv) > 3 else None
random.seed(7); np.random.seed(7)

def jpeg(im, q):
    b = io.BytesIO(); im.convert('RGB').save(b, 'JPEG', quality=q); b.seek(0); return Image.open(b).convert('RGB')

def shadow(im, strength=0.5):
    a = np.asarray(im).astype(np.float32)
    h, w = a.shape[:2]
    yy, xx = np.mgrid[0:h, 0:w]
    # schuine schaduw van een hand/telefoon over de linkerbovenhoek + lichtval van rechts
    d = (xx / w * 0.8 + yy / h * 0.6)
    m = 1 - strength * np.clip(1.2 - d * 1.6, 0, 1)
    m *= 0.85 + 0.15 * (xx / w)
    return Image.fromarray(np.clip(a * m[..., None], 0, 255).astype(np.uint8))

def dark(im):
    im = ImageEnhance.Brightness(im).enhance(0.42)
    im = ImageEnhance.Contrast(im).enhance(0.75)
    a = np.asarray(im).astype(np.float32) + np.random.normal(0, 7, (im.height, im.width, 1))
    return Image.fromarray(np.clip(a, 0, 255).astype(np.uint8))

def perspective_on_table(im):
    W, H = im.size
    bgw, bgh = int(W * 1.25), int(H * 1.18)
    # houten tafel
    t = np.zeros((bgh, bgw, 3), np.float32)
    t[...] = (128, 92, 60)
    t += np.random.normal(0, 10, (bgh, 1, 1)) + np.sin(np.arange(bgw) / 9.0)[None, :, None] * 6
    table = Image.fromarray(np.clip(t, 0, 255).astype(np.uint8))
    # vier hoeken van het papier op de foto (licht scheef + perspectief)
    ox, oy = (bgw - W) // 2, (bgh - H) // 2
    dst = [(ox + W * 0.06, oy + H * 0.03), (ox + W * 0.97, oy - H * 0.01), (ox + W * 1.02, oy + H * 1.0), (ox - W * 0.02, oy + H * 0.96)]
    srcpts = [(0, 0), (W, 0), (W, H), (0, H)]
    # coëfficiënten: van uitvoer naar invoer
    A = []; B = []
    for (x, y), (u, v) in zip(dst, srcpts):
        A += [[x, y, 1, 0, 0, 0, -u * x, -u * y], [0, 0, 0, x, y, 1, -v * x, -v * y]]; B += [u, v]
    coef = np.linalg.solve(np.array(A), np.array(B))
    warped = im.convert('RGBA').transform((bgw, bgh), Image.PERSPECTIVE, coef, Image.BICUBIC)
    table.paste(warped, (0, 0), warped)
    return table.resize((int(bgw * 0.85), int(bgh * 0.85)), Image.LANCZOS)

def blurry(im):
    return jpeg(im.filter(ImageFilter.GaussianBlur(1.4)), 35)

def small(im):
    s = 900 / im.width
    return jpeg(im.resize((900, int(im.height * s)), Image.LANCZOS), 70)

def combo(im):
    return jpeg(shadow(perspective_on_table(im), 0.45).filter(ImageFilter.GaussianBlur(0.8)), 55)

VARIANTS = {'schaduw': shadow, 'donker': dark, 'scheef': perspective_on_table, 'wazig': blurry, 'klein': small, 'combi': combo}
os.makedirs(out, exist_ok=True)
for f in sorted(glob.glob(os.path.join(src, '*.png'))):
    if ONLY and not any(os.path.basename(f).startswith(o) for o in ONLY): continue
    base = Image.open(f).convert('RGB')
    # zoals een telefoonfoto: ± 2000 px breed
    if base.width > 2000: base = base.resize((2000, int(base.height * 2000 / base.width)), Image.LANCZOS)
    name = os.path.splitext(os.path.basename(f))[0]
    for k, fn in VARIANTS.items():
        fn(base).convert('RGB').save(os.path.join(out, f'{name}__{k}.jpg'), quality=88)
print('klaar', len(os.listdir(out)))
