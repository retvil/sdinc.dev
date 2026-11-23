#!/usr/bin/env python3
"""Generate the clean display surface (screen-surface.png) for SDINC.

Approach (v3 — keep the REAL glass, remove only the profile content):

The profile master already contains a clean glass (the green phosphor
display with its highlights, depth and texture) PLUS the profile-specific
artwork on top of it: a portrait, a digital-twin diagram, and an LLM card.
For the Projects / Contact tabs we want the SAME glass, just without that
artwork. So:

  1. Crop the screen region from the approved master.
  2. Detect the artwork (bright "ink" on top of the dark glass) per pixel:
       ink  = luminance clearly above the local glass floor.
     The glass itself stays; only the brighter strokes / fills are removed.
  3. Replace ink pixels with the local glass tone, reconstructed by a
     coarse-to-fine interpolation of the *unmasked* (glass) pixels. A
     gentle low-pass removes residual structure while preserving the glass's
     own gradient / highlight, so the result reads as the profile glass, not
     as a flat green slab.
  4. The plate's border ring stays pixel-identical to the master crop
     (seamless by construction).

Output: an OPAQUE RGB plate. max|delta| vs the master crop = 0 everywhere
the content was NOT removed.

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

# Ink detection: "content" pixels are clearly brighter than the local
# glass floor. The glass floor is ~ lum 8..40; ink / highlights push it up.
# A per-pixel threshold against the local (blurred) floor catches strokes and
# fills of any size without needing fixed content rectangles.
INK_OFFSET = 18      # lum above local floor counts as ink
INK_MIN = 46         # absolute luminance floor for ink (catches faint strokes)
FLOOR_RADIUS = 64    # blur radius for the "local glass floor" estimate
SMOOTH_RADIUS = 9    # final low-pass on the reconstructed interior


def detect_ink(rgb: np.ndarray) -> np.ndarray:
    """Boolean mask of content pixels (bright ink) inside the crop."""
    lum = rgb.astype(np.float64).mean(axis=2)
    floor = np.asarray(Image.fromarray(lum.astype(np.uint8)).filter(
        ImageFilter.GaussianBlur(FLOOR_RADIUS)), dtype=np.float64)
    ink = ((lum > floor + INK_OFFSET) & (lum >= INK_MIN))
    # A light dilation so anti-aliased edges / glow around ink are covered.
    ink_img = Image.fromarray((ink * 255).astype(np.uint8))
    ink_img = ink_img.filter(ImageFilter.MaxFilter(5))
    return np.asarray(ink_img, dtype=np.float64) / 255.0


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


def main() -> None:
    reference = Image.open(REFERENCE).convert("RGB")
    crop = reference.crop((CROP_LEFT, CROP_TOP, CROP_RIGHT, CROP_BOTTOM))
    size = crop.size
    assert size == (2088, 1354), f"unexpected crop size {size}"

    arr = np.asarray(crop, dtype=np.uint8).copy()
    ink = detect_ink(arr)
    binary = ink >= 0.5

    # Reconstruct the ink pixels from the surrounding glass, then low-pass the
    # interior so it reads as the glass itself (its gradient / highlight),
    # not as a flat slab.
    filled = pyramid_fill(arr, ink)
    smooth = np.asarray(
        Image.fromarray(np.clip(filled, 0, 255).astype(np.uint8)).filter(
            ImageFilter.GaussianBlur(SMOOTH_RADIUS)
        ), dtype=np.float64
    )
    out = arr.copy()
    out[binary] = np.clip(smooth, 0, 255)[binary]

    plate = Image.fromarray(out, "RGB")
    OUT_PLATE.parent.mkdir(parents=True, exist_ok=True)
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    plate.save(OUT_PLATE)

    ink_mask_img = Image.fromarray((binary * 255).astype(np.uint8))
    ink_mask_img.save(OUT_DIR / "screen-surface-mask.png")

    compare = Image.new("RGB", (size[0] + 12, size[1] * 2 + 12), (24, 24, 24))
    compare.paste(crop, (0, 0))
    compare.paste(plate, (0, size[1] + 12))
    compare.save(OUT_DIR / "screen-surface-compare.png")

    # Verify: pixels that were NOT ink must be byte-identical to the crop.
    ref = arr.astype(np.float64)
    border = ~binary
    border_delta = np.abs(out.astype(np.float64)[border] - ref[border]).max()
    interior_lum = out.astype(np.float64)[:, :, 0][binary]
    print("plate:", OUT_PLATE.name, plate.size, "mode:", plate.mode)
    print(f"ink pixels: {int(binary.sum())} / {binary.size} "
          f"({100 * binary.mean():.1f}%)")
    print(f"un-inked max |Δ vs master crop|: {border_delta:.2f} (expect 0.00)")
    if binary.sum():
        print(f"interior lum: mean {interior_lum.mean():.1f}  "
              f"min {interior_lum.min():.0f}  max {interior_lum.max():.0f}")
    print("compare:", OUT_DIR / "screen-surface-compare.png")


if __name__ == "__main__":
    main()
