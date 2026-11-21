#!/usr/bin/env python3
"""Generate clean "empty screen" per-tab master rasters (projects + contact).

Goal: the backing plate for Projects / Contact must NOT show the profile
artwork (portrait + diagram + LLM card). It must read as the SAME device with
an empty, powered-on display — one organic glass tone, same falloff, same
style as the rest of the chassis.

Approach: derive the empty-glass tone FROM THE REFERENCE ITSELF.
For every row inside the glass rect we take the dark cluster (percentile
filter) and average it, which yields the true per-row glass tone with all
artwork excluded. The resulting vertical profile is then smoothed, so the
generated plate inherits the real glass falloff instead of an invented one.

Chassis, bezel, dials, buttons and tabs remain byte-identical.
The profile master is untouched.
"""
import os
import numpy as np
from PIL import Image

ROOT = r'F:\SDProject\SDInc.dev'
REF = os.path.join(ROOT, 'public/assets/device/SDINC_reference_4K_conservative.png')
OUT_PROJECTS = os.path.join(ROOT, 'public/assets/device/SDINC_reference_4K_conservative_projects.png')
OUT_CONTACT = os.path.join(ROOT, 'public/assets/device/SDINC_reference_4K_conservative_contact.png')

# Glass interior, inset from the screen node [1250,588,3338,1942] so the
# display bezel / highlight ring stays untouched.
GLASS = (1258, 600, 3334, 1932)  # L, T, R, B

# Row-tone extraction
DARK_PCT = 45      # keep the darkest 45% of each row = empty glass, no artwork
SMOOTH_WIN = 61    # vertical smoothing window (odd), softens residual bumps
EDGE_DARKEN = 0.06 # very subtle horizontal edge falloff (6%)


def row_tones(rgb, rect):
    """Per-row empty-glass tone: average of the darkest DARK_PCT% of pixels."""
    L, T, R, B = rect
    h = B - T
    tones = np.zeros((h, 3), dtype=np.float64)
    for i in range(h):
        row = rgb[T + i, L:R]                       # (w, 3)
        lum = row.mean(axis=1)
        thr = np.percentile(lum, DARK_PCT)
        sel = row[lum <= thr]
        tones[i] = sel.mean(axis=0)
    return tones


def smooth_1d(a, win):
    """Box-smooth along axis 0 with edge padding."""
    n = a.shape[0]
    win = min(win, n if n % 2 == 1 else n - 1)
    half = win // 2
    pad = np.pad(a, ((half, half), (0, 0)), mode='edge')
    kern = np.ones(win) / win
    out = np.empty_like(a)
    for c in range(a.shape[1]):
        out[:, c] = np.convolve(pad[:, c], kern, mode='valid')[:n]
    return out


def build_fill(tones, height, width):
    """Expand per-row tones to a full rect + subtle horizontal edge falloff."""
    rows = smooth_1d(tones, SMOOTH_WIN)
    base = np.repeat(rows[:, None, :], width, axis=1)   # (h, w, 3)
    hx = (np.arange(width, dtype=np.float64) / max(1, width - 1)) * 2 - 1
    hfade = 1.0 - EDGE_DARKEN * (hx ** 2)
    base *= hfade[None, :, None]
    return np.clip(base, 0, 255).astype(np.uint8)


def make_variant(out_path, tones):
    master = Image.open(REF).convert('RGB')
    H, W = master.size[1], master.size[0]
    L, T, R, B = GLASS
    fill = build_fill(tones, B - T, R - L)
    arr = np.asarray(master, dtype=np.uint8).copy()
    arr[T:B, L:R] = fill
    out = Image.fromarray(arr, 'RGB')
    out.save(out_path)

    orig = np.asarray(master, dtype=np.uint8)
    o = np.asarray(out, dtype=np.uint8)
    mask = np.ones((H, W), dtype=bool)
    mask[T:B, L:R] = False
    glass = o[T:B, L:R].astype(np.float64)

    print('wrote', os.path.basename(out_path), out.size)
    print('  chassis max|Δ| vs master:', int(np.abs(o[mask] - orig[mask]).max()), '(expect 0)')
    print('  glass mean:', glass.reshape(-1, 3).mean(axis=0).astype(int).tolist())
    print('  glass std  :', round(float(glass.reshape(-1, 3).std(axis=0).mean()), 2), '(low = clean, no artwork)')
    print('  glass luma min/max:', int(glass.mean(axis=2).min()), '/', int(glass.mean(axis=2).max()))


def main():
    master = Image.open(REF).convert('RGB')
    rgb = np.asarray(master, dtype=np.float64)
    tones = row_tones(rgb, GLASS)
    print('empty-glass row tones sampled:', len(tones))
    print('  top tone   :', tones[:5].mean(axis=0).astype(int).tolist())
    print('  middle tone:', tones[len(tones) // 2 - 2:len(tones) // 2 + 3].mean(axis=0).astype(int).tolist())
    print('  bottom tone:', tones[-5:].mean(axis=0).astype(int).tolist())
    print()
    make_variant(OUT_PROJECTS, tones)
    make_variant(OUT_CONTACT, tones)


if __name__ == '__main__':
    main()
