#!/usr/bin/env python3
"""Generate the clean display surface (screen-surface.png) for SDINC.

Derives a clean inner-display plate from the approved 4K reference by removing
ONLY the mode-specific start content (digital twin diagram + LLM card) and
keeping everything common baked: header with side rules, bottom tab row,
separator, glass glare and vignette.

- Source: public/assets/device/SDINC_reference_4K_conservative.png (untouched).
- Crop:   [1250, 588] .. [3338, 1942] -> 2088x1354, no resize, no sharpening,
  no color correction.
- Masked areas are reconstructed by coarse-to-fine pyramid interpolation of
  the surrounding ORIGINAL pixels (the background field there is smooth).
  The reconstructed background is a DERIVED layer, not an extracted original
  hidden surface.

Outputs:
  public/assets/device/screen-surface.png        (the plate, opaque)
  docs/screen-surface/screen-surface-mask.png    (removed-content mask)
  docs/screen-surface/screen-surface-compare.png (before | after side by side)

Prints residual statistics (high-pass inside masked areas) as an automated
ghost/stripe check. Reference file is never modified.
"""

from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
REFERENCE = ROOT / "public" / "assets" / "device" / "SDINC_reference_4K_conservative.png"
OUT_PLATE = ROOT / "public" / "assets" / "device" / "screen-surface.png"
OUT_DIR = ROOT / "docs" / "screen-surface"

CROP_LEFT, CROP_TOP, CROP_RIGHT, CROP_BOTTOM = 1250, 588, 3338, 1942

# Mode-specific content rects in 4K reference coordinates, padded to cover
# the soft glow around the removed graphics (no green silhouettes or halos).
# The third rect bridges the gap between diagram and card so no unmasked
# strip of original glow remains between the two padded rects.
CONTENT_RECTS_4K = [
    (1370, 788, 2575, 1668, 48),  # diagram: twin, rings, nodes, labels, links
    (2695, 820, 3275, 1610, 56),  # LLM card frame, icon, text, button
    (2575, 780, 2695, 1672, 0),   # bridge between diagram and card masks
]


def build_mask(size: tuple[int, int]) -> Image.Image:
    """Binary mask (L mode, 255 = remove) of mode-specific content."""
    w, h = size
    mask = Image.new("L", size, 0)
    px = mask.load()
    for left, top, right, bottom, pad in CONTENT_RECTS_4K:
        l = max(0, left - pad - CROP_LEFT)
        t = max(0, top - pad - CROP_TOP)
        r = min(w, right + pad - CROP_LEFT)
        b = min(h, bottom + pad - CROP_TOP)
        for y in range(t, b):
            for x in range(l, r):
                px[x, y] = 255
    # Dilate a bit more so half-covered edge pixels never seed ghosts.
    return mask.filter(ImageFilter.MaxFilter(15))


def pyramid_fill(image: np.ndarray, mask: np.ndarray) -> np.ndarray:
    """Coarse-to-fine interpolation of masked pixels from unmasked ones."""
    levels: list[tuple[np.ndarray, np.ndarray]] = []
    fine = image.astype(np.float64)
    fine_mask = mask.astype(np.float64)
    levels.append((fine, fine_mask))
    while min(levels[-1][0].shape[0], levels[-1][0].shape[1]) > 4:
        src, src_mask = levels[-1]
        h, w = src.shape[:2]
        h2, w2 = h // 2, w // 2
        down = src[: h2 * 2, : w2 * 2].reshape(h2, 2, w2, 2, 3).mean(axis=(1, 3))
        down_mask = src_mask[: h2 * 2, : w2 * 2].reshape(h2, 2, w2, 2).mean(axis=(1, 3))
        levels.append((down, down_mask))
    top_img, top_mask = levels[-1]
    unmasked = top_mask < 0.5
    if unmasked.any():
        top_img[~unmasked] = top_img[unmasked].mean(axis=0)
    for level in range(len(levels) - 2, -1, -1):
        fine_img, fine_mask = levels[level]
        coarse_img = levels[level + 1][0]
        up = np.asarray(
            Image.fromarray(np.clip(coarse_img, 0, 255).astype(np.uint8)).resize(
                (fine_img.shape[1], fine_img.shape[0]), Image.BILINEAR
            ),
            dtype=np.float64,
        )
        fill = fine_mask >= 0.5
        fine_img[fill] = up[fill]
        levels[level] = (fine_img, fine_mask)
    return levels[0][0]


def highpass_stats(filled: np.ndarray, mask: np.ndarray) -> dict:
    """Ghost/stripe check: structure left inside reconstructed areas."""
    img = Image.fromarray(np.clip(filled, 0, 255).astype(np.uint8))
    blurred = np.asarray(img.filter(ImageFilter.GaussianBlur(14)), dtype=np.float64)
    residual = np.abs(filled - blurred)[mask]
    return {
        "masked_pixels": int(mask.sum()),
        "residual_max": round(float(residual.max()), 2),
        "residual_mean": round(float(residual.mean()), 3),
        "residual_p99": round(float(np.percentile(residual, 99)), 2),
    }


def main() -> None:
    reference = Image.open(REFERENCE).convert("RGB")
    plate_before = reference.crop((CROP_LEFT, CROP_TOP, CROP_RIGHT, CROP_BOTTOM))
    size = plate_before.size
    assert size == (2088, 1354), f"unexpected crop size {size}"

    mask_image = build_mask(size)
    mask = np.asarray(mask_image, dtype=np.float64) / 255.0
    binary = mask >= 0.5

    filled = pyramid_fill(np.asarray(plate_before, dtype=np.float64), binary)
    stats = highpass_stats(filled, binary)

    plate = Image.fromarray(np.clip(filled, 0, 255).astype(np.uint8))
    OUT_PLATE.parent.mkdir(parents=True, exist_ok=True)
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    plate.save(OUT_PLATE)
    mask_image.save(OUT_DIR / "screen-surface-mask.png")

    compare = Image.new("RGB", (size[0] + 12, size[1] * 2 + 12), (24, 24, 24))
    compare.paste(plate_before, (0, 0))
    compare.paste(plate, (0, size[1] + 12))
    compare.save(OUT_DIR / "screen-surface-compare.png")

    print("plate:", OUT_PLATE.name, plate.size)
    print("mask:", OUT_DIR / "screen-surface-mask.png")
    print("compare:", OUT_DIR / "screen-surface-compare.png")
    print("highpass residual (ghost/stripe check):", stats)


if __name__ == "__main__":
    main()
