#!/usr/bin/env python3
"""Generate the clean display surface (screen-surface.png) for SDINC.

Derives a clean inner-display plate from the approved 4K reference by
REMOVING ONLY the mode-specific start content (digital twin diagram + LLM
card). The removed regions are emitted as TRANSPARENT (alpha=0) so the
master raster's ORIGINAL glass shows straight through when the plate is
overlaid — this is the artifact fix: no interpolated interior means no
double-tint, no horizontal seam band, no right-edge color step.

- Source: public/assets/device/SDINC_reference_4K_conservative.png (untouched).
- Crop:   [1250, 588] .. [3338, 1942] -> 2088x1354, no resize, no sharpening,
  no color correction.
- Output: RGBA plate. Opaque (alpha=255) everywhere except the masked
  content regions (alpha=0). Unmasked pixels are byte-identical to the
  master crop, so the plate's edges are seamless by construction.
- The legacy pyramid-fill + 24px border-restore path (and the separate
  fix-surface-border.py) is superseded: with a transparent cutout the
  interior is the master itself, so there is nothing to reconstruct and
  nothing to re-paste.

Outputs:
  public/assets/device/screen-surface.png        (RGBA plate, transparent cutout)
  docs/screen-surface/screen-surface-mask.png    (removed-content mask)
  docs/screen-surface/screen-surface-compare.png (before | composited-over-master)

Reference file is never modified.
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

    # TRANSPARENT-CUTOUT MODE (the artifact fix): the plate is emitted as RGBA.
    # Every pixel the mask removed (where the mode-specific content used to be)
    # becomes alpha=0 so the master's ORIGINAL glass shows straight through —
    # no interpolated interior, hence no double-tint / horizontal band / right
    # seam. Everything outside the mask keeps the original crop pixels at
    # alpha=255. This supersedes the older pyramid-fill approach whose derived
    # interior drifted from the master glass (mean 11.4 / max 240 lum).
    arr = np.asarray(plate_before, dtype=np.uint8).copy()
    alpha = np.full(arr.shape[:2], 255, dtype=np.uint8)
    alpha[binary] = 0
    rgba = np.dstack([arr, alpha[..., None]])
    plate = Image.fromarray(rgba, "RGBA")

    # The plate is now RGBA: original crop pixels everywhere (alpha=255),
    # transparent (alpha=0) exactly where the mask removed content. No border
    # restoration is needed — the unmasked border pixels are already the
    # original crop, pixel-identical to the master by construction.

    OUT_PLATE.parent.mkdir(parents=True, exist_ok=True)
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    plate.save(OUT_PLATE)
    mask_image.save(OUT_DIR / "screen-surface-mask.png")

    # Compare: show the original crop and the plate composited over the
    # master crop (alpha-blend), so the transparent cutout reads as "master
    # showing through" rather than black.
    compare_bg = plate_before.copy().convert("RGBA")
    composited = Image.alpha_composite(compare_bg, plate)
    compare = Image.new("RGB", (size[0] + 12, size[1] * 2 + 12), (24, 24, 24))
    compare.paste(plate_before, (0, 0))
    compare.paste(composited.convert("RGB"), (0, size[1] + 12))
    compare.save(OUT_DIR / "screen-surface-compare.png")

    # Verify: the plate must be pixel-identical to the master crop everywhere
    # it is OPAQUE (alpha=255). Opaque-region delta should be 0.
    ref_arr = np.asarray(plate_before, dtype=np.float64)
    plate_rgba = np.asarray(plate, dtype=np.float64)
    opaque = alpha == 255
    opaque_delta = np.abs(plate_rgba[..., :3][opaque] - ref_arr[opaque]).max()
    print("plate:", OUT_PLATE.name, plate.size, "mode:", plate.mode)
    print("mask:", OUT_DIR / "screen-surface-mask.png")
    print("compare:", OUT_DIR / "screen-surface-compare.png")
    print(f"opaque-region max |Δ vs master|: {opaque_delta:.2f} (expect 0.00)")
    print(f"transparent pixels: {int((~opaque).sum())} / {opaque.size}")


if __name__ == "__main__":
    main()
