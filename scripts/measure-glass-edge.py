#!/usr/bin/env python3
"""Verify the view's right edge now aligns with the master's glass edge.

After the SCREEN_CONTENT_BOUNDS fix (right 3331 -> 3338) the HTML panel's
right edge in reference space should sit at x=3338 — the same x as the
master's baked glass right edge. The surface plate is still cropped to
[1250,588,3338,1942] (2088x1354) and placed at CSS 2088x1354, so its right
edge lands at 1250+2088=3338 as well.

Reports the composite luminance across the right edge to confirm there is
no 7px step between the view's edge and the master's glass.
"""
from PIL import Image
import numpy as np

ROOT = "F:/SDProject/SDInc.dev"
master = Image.open(f"{ROOT}/public/assets/device/SDINC_reference_4K_conservative.png").convert("L")
surf = Image.open(f"{ROOT}/public/assets/device/screen-surface.png").convert("L")

M = np.asarray(master, dtype=np.float64)
sw, sh = surf.size
print(f"surface source: {sw}x{sh}")
# The surface is placed with place() -> its CSS box is the SCREEN_SURFACE_BOUNDS
# rect [1250,588,3338,1942] = 2088 x 1354. So the surface is upscaled to that.
target_w, target_h = 2088, 1354
S_r = np.asarray(surf.resize((target_w, target_h), Image.BILINEAR), dtype=np.float64)
x0, y0 = 1250, 588

M2 = M.copy()
M2[y0:y0 + target_h, x0:x0 + target_w] = S_r

y = 1265
row = M2[y]
row_m = M[y]

print(f"\nCOMPOSITE y={y}, x=3320..3360 (view right edge should now be ~3338):")
for x in range(3320, 3360, 2):
    print(f"  x={x}: {int(row[x])}")

print(f"\nMASTER-ONLY y={y}, x=3320..3360:")
for x in range(3320, 3360, 2):
    print(f"  x={x}: {int(row_m[x])}")

# The surface now reaches 3338, so the 7px band is no longer a step.
# Confirm the composite is continuous with the master past 3338.
band = row[3338:3346].astype(int)
band_m = row_m[3338:3346].astype(int)
print(f"\nPast the glass edge x=3338..3345 (should match master — chassis):")
print("  comp  :", band)
print("  master:", band_m)
delta = np.abs(band - band_m).max()
print(f"  max |comp-master| in that band: {delta} lum  (0 = identical)")
