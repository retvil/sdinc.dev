// Single mapping point for scene assets. The static body renders from ONE
// continuous master (the approved 4K reference) — individual fragments stay
// in /assets/device/ as an editable source library, never stacked at runtime.
// Replacing a graphic later means editing one entry here, not touching markup.
//
// ASSET_BASE is a root-absolute path. This matches:
//   - astro.config.mjs (no `base` set) → dev server and built dist/ both
//     serve from the web root, so `/assets/device/...` resolves correctly.
//   - GitHub Pages with a sub-path (`retvil.github.io/sdinc.dev/`) →
//     set `base: '/sdinc.dev/'` in astro.config.mjs AND change ASSET_BASE
//     here to `${base}assets/device/` (or use import.meta.env.BASE_URL
//     once the Vite client types are wired up).
//
// Until the sub-path deploy is active, keep ASSET_BASE at the root.
const ASSET_BASE = '/assets/device/';
const PACKAGE_PREFIX = 'assets/';

/** Continuous static master: approved 4K reference, whole device. */
export const MASTER_ASSET = deviceAsset('SDINC_reference_4K_conservative.png');

/** Masked moving overlays (V7): shown only during interaction. */
export const MASKED_FACES: Record<'profile' | 'projects' | 'contact', string> = {
  profile: deviceAsset('profile-face-masked.png'),
  projects: deviceAsset('projects-face-masked.png'),
  contact: deviceAsset('contact-face-masked.png'),
};

export const ROTOR_MASKED = deviceAsset('dial-rotor-masked.png');

export function deviceAsset(file: string): string {
  return ASSET_BASE + file;
}

/** Resolves package-style scene.json paths ("assets/…") for the source library. */
export function resolveAsset(path: string): string {
  return path.startsWith(PACKAGE_PREFIX) ? ASSET_BASE + path.slice(PACKAGE_PREFIX.length) : path;
}
