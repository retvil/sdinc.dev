#!/usr/bin/env python3
"""Post-merge pass: enforce pixel-identical border strip on the clean plate.

Root cause of the right-edge seam: build_mask() dilates the content mask
(MaxFilter(15)) until it reaches the crop border; the glass frame has no
content of its own to interpolate from, so pyramid_fill derives those
columns from the interior green field — up to ~13 lum off the master.
The cropped border pixels are never masked (all content rects stay inside
the crop), so the original crop strip is the correct one: copy it back.

Run after make-screen-surface.py overwrites the plate:
    python scripts/make-screen-surface.py
    python scripts/fix-surface-border.py
"""

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
REFERENCE = ROOT / "public" / "assets" / "device" / "SDINC_reference_4K_conservative.png"
OUT_PLATE = ROOT / "public" / "assets" / "device" / "screen-surface.png"

# The dilated mask can reach the crop edge by up to 7 px; 24 px keeps a
# generous safety margin on every side without touching interior content.
BORDER = 24


def main() -> None:
    plate = Image.open(OUT_PLATE).convert("RGB")
    assert plate.size == (2088, 1354), f"unexpected plate size {plate.size}"

    reference = Image.open(REFERENCE).convert("RGB")
    strip = reference.crop((
        (1250, 588),                     # CROP_LEFT, CROP_TOP
        (1250 + 2088, 588 + 1354),       # full crop, re-sliced below
    ))
    w, h = strip.size
    edges = [
        strip.crop((0, 0, w, BORDER)),          # top
        strip.crop((0, h - BORDER, w, h)),      # bottom
        strip.crop((0, 0, BORDER, h)),          # left
        strip.crop((w - BORDER, 0, w, h)),      # right
    ]
    for rect, edge in [
        ((0, 0, w, BORDER), 0),
        ((0, h - BORDER, w, h), 1),
        ((0, 0, BORDER, h), 2),
        ((w - BORDER, 0, w, h), 3),
    ]:
        plate.paste(edges[edge], rect)

    plate.save(OUT_PLATE)
    print(f"border strip ({BORDER}px) restored from reference crop on all 4 sides")


if __name__ == "__main__":
    main()
