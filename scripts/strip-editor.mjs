// Postbuild: strip the DEV-only /editor route AND the editor-only source
// library from dist/, so the deployable directory carries only what the
// public site renders.
//
// Two things are removed (both are no-ops when already absent):
//   1. dist/editor/ — the layer-editor route. It ships as an empty shell in
//      production (import.meta.env.DEV === false); the route + its JS/CSS
//      bundle is dead public surface.
//   2. The editor-only device source PNGs in dist/assets/device/. The public
//      site renders from ONE continuous master raster plus a few live
//      overlays (see the RUNTIME_ASSETS allowlist below); the other ~74
//      fragment PNGs in /assets/device/ exist only for the DEV layer editor's
//      "graphical source library" (preview/download). They are ~24 MB and are
//      never fetched in production, so they are dropped from dist/.
//
// The dev server (npm run dev) is unaffected: it still serves public/ in
// full, so the editor reads every fragment. Only the built deployable dir
// is trimmed. This is why the trim is a postbuild step, not a move out of
// public/ (moving them would break the dev editor's asset fetches).
//
// Idempotent + allowlist-based: any file NOT explicitly listed as a runtime
// asset is removed from dist/assets/device/. Adding a new runtime asset
// requires adding it to RUNTIME_ASSETS (the build fails loud otherwise? No —
// it just keeps it; the list is a safety net, see the warning below).

import { rm, access } from 'node:fs/promises';
import { join } from 'node:path';

// The exact set of /assets/device/ files the public site loads at runtime.
// Everything else in that directory is editor-only and gets dropped.
// Keep this in sync with src/scene/assets.ts + renderer.ts surface mount.
const RUNTIME_ASSETS = new Set([
  // Continuous static master (LCP). PNG is primary; AVIF/WebP are lighter
  // alternatives referenced by the same <img srcset>/fallback.
  'SDINC_reference_4K_conservative.png',
  'SDINC_reference_4K_conservative.avif',
  'SDINC_reference_4K_conservative.webp',
  // Data-tab masters: same device with an empty display (profile artwork
  // replaced by the reference's own glass tone). Lazy per-tab swap.
  'SDINC_reference_4K_conservative_projects.png',
  'SDINC_reference_4K_conservative_contact.png',
  // Mode-specific face overlays (shown during interaction).
  'profile-face-masked.png',
  'projects-face-masked.png',
  'contact-face-masked.png',
  // Rotor overlay.
  'dial-rotor-masked.png',
  // Clean display surface (transparent-cutout plate, see C2).
  'screen-surface.png',
]);

const root = process.cwd();

// 1) dist/editor route.
const editorDir = join(root, 'dist', 'editor');
await rm(editorDir, { recursive: true, force: true });
console.log(`[strip-editor] removed ${join('dist', 'editor')} (if present)`);

// 2) editor-only device source library.
const deviceDir = join(root, 'dist', 'assets', 'device');
let removed = 0;
try {
  const { readdir } = await import('node:fs/promises');
  const files = await readdir(deviceDir);
  for (const file of files) {
    if (!RUNTIME_ASSETS.has(file)) {
      await rm(join(deviceDir, file), { force: true });
      removed += 1;
    }
  }
  console.log(`[strip-editor] removed ${removed} editor-only file(s) from ${join('dist', 'assets', 'device')}`);
} catch (error) {
  // No device dir in dist (e.g. assets not copied) — not a failure.
  if (error?.code === 'ENOENT') {
    console.log(`[strip-editor] no ${join('dist', 'assets', 'device')} in dist; nothing to trim`);
  } else {
    throw error;
  }
}

// Safety net: warn if a RUNTIME_ASSETS entry is missing from dist — that
// means the allowlist and the actual build diverged and the public site
// would 404 on a real asset.
try {
  await access(join(deviceDir, 'SDINC_reference_4K_conservative.png'));
  const { readdir } = await import('node:fs/promises');
  const present = new Set(await readdir(deviceDir));
  const missing = [...RUNTIME_ASSETS].filter((f) => !present.has(f));
  if (missing.length > 0) {
    console.warn(`[strip-editor] WARNING: runtime asset(s) missing from dist/assets/device: ${missing.join(', ')}`);
    console.warn('[strip-editor]   The public site would 404 these. Update RUNTIME_ASSETS or the source build.');
  }
} catch (error) {
  if (error?.code !== 'ENOENT') throw error;
}
