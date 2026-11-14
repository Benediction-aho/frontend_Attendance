#!/usr/bin/env python3
"""Rebuild the logo and PWA icons from public/logo.png (reproducible).

Usage: python3 scripts/make-logo.py
- Crops the white margins tightly.
- Removes the white background (colour-to-alpha against white), keeping anti-aliased edges.
- Writes sized wordmarks for the sidebar, top bar and sign-in (1x/2x/3x),
  plus PWA icons (any + maskable) and the Apple touch icon.
Replace public/logo.png with the official artwork and rerun when it is provided.
"""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "public" / "logo.png"
OUT = ROOT / "public" / "brand"
ICONS = ROOT / "public" / "icons"


def to_alpha(img: Image.Image) -> Image.Image:
    rgb = img.convert("RGB")
    out = Image.new("RGBA", rgb.size)
    px_in, px_out = rgb.load(), out.load()
    w, h = rgb.size
    for y in range(h):
        for x in range(w):
            r, g, b = px_in[x, y]
            a = max(255 - r, 255 - g, 255 - b)
            if a < 12:  # JPEG noise on the white background
                px_out[x, y] = (0, 0, 0, 0)
                continue
            # Un-blend from white so edges keep the true colour.
            f = 255 / a
            px_out[x, y] = tuple(
                max(0, min(255, round(255 - (255 - c) * f))) for c in (r, g, b)
            ) + (min(255, round(a * 1.15)),)
    return out


def crop(img: Image.Image, pad: int = 4) -> Image.Image:
    bbox = img.getchannel("A").point(lambda v: 255 if v > 24 else 0).getbbox()
    l, t, r, b = bbox
    return img.crop((max(0, l - pad), max(0, t - pad), r + pad, b + pad))


def by_height(img: Image.Image, h: int) -> Image.Image:
    return img.resize((round(img.width * h / img.height), h), Image.LANCZOS)


def icon(mark: Image.Image, size: int, safe: float, bg=(255, 255, 255, 255)) -> Image.Image:
    canvas = Image.new("RGBA", (size, size), bg)
    target_w = round(size * safe)
    m = mark.resize((target_w, round(mark.height * target_w / mark.width)), Image.LANCZOS)
    canvas.alpha_composite(m, ((size - m.width) // 2, (size - m.height) // 2))
    return canvas


def main() -> None:
    OUT.mkdir(exist_ok=True)
    full = crop(to_alpha(Image.open(SRC)))
    # CSS heights: sidebar 40px, top bar 28px, sign-in 48px. Export 3x for retina.
    for name, h in (("logo-sidebar", 40), ("logo-topbar", 28), ("logo-signin", 48)):
        by_height(full, h * 3).quantize(128, method=Image.Quantize.FASTOCTREE).save(
            OUT / f"{name}.png", optimize=True
        )
    # Wordmark only (first line), used inside square icons for legibility.
    a = full.getchannel("A")
    rows = [any(a.getpixel((x, y)) > 24 for x in range(0, a.width, 2)) for y in range(a.height)]
    end = next(i for i in range(len(rows)) if i > 10 and not rows[i])
    word = crop(full.crop((0, 0, full.width, end)))
    # Stack "ASSISTANCE" over "GHANA" (split at the widest blank column run) so the
    # text stays legible on a square home-screen icon.
    wa = word.getchannel("A")
    blank = [all(wa.getpixel((x, y)) <= 24 for y in range(wa.height)) for x in range(wa.width)]
    best, run, start = (0, 0), 0, 0
    for x, b in enumerate(blank):
        if b:
            run, start = (run + 1, start if run else x)
            if run > best[0] and wa.width * 0.2 < x < wa.width * 0.8:
                best = (run, start)
        else:
            run = 0
    cut = best[1] + best[0] // 2
    top, bottom = crop(word.crop((0, 0, cut, word.height))), crop(word.crop((cut, 0, word.width, word.height)))
    gap = top.height // 3
    word = Image.new("RGBA", (top.width, top.height * 2 + gap), (0, 0, 0, 0))
    word.alpha_composite(top, (0, 0))
    word.alpha_composite(bottom, ((top.width - bottom.width) // 2, top.height + gap))
    icon(word, 192, 0.78).save(ICONS / "icon-192.png", optimize=True)
    icon(word, 512, 0.78).save(ICONS / "icon-512.png", optimize=True)
    icon(word, 512, 0.66).save(ICONS / "icon-maskable-512.png", optimize=True)
    icon(word, 180, 0.78).convert("RGB").save(ICONS / "apple-touch-icon-180.png", optimize=True)
    print("logo", full.size, "wordmark", word.size)


if __name__ == "__main__":
    main()
