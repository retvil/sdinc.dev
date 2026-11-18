import { defineConfig } from 'astro/config';

// Deployment config.
//
// The site is built with absolute root URLs (`/assets/device/...`) —
// see src/scene/assets.ts. These work when the built output is served
// from the web root. Two deployment models work without code changes:
//
//   A. GitHub Pages on a sub-path (retvil.github.io/sdinc.dev/):
//      Set `base: '/sdinc.dev/'` and also update ASSET_BASE in
//      src/scene/assets.ts to match. Then enable Pages in the repo
//      settings (branch: main, /docs or a workflow that publishes
//      dist/ to gh-pages).
//
//   B. Custom domain at apex (sdinc.dev):
//      Keep `base: '/'` and point the CNAME record at Pages. No code
//      changes needed.
//
// For now we keep base: '/' so the local dev server and the built
// dist/ both serve from root — matching the hardcoded ASSET_BASE.
// Flip to option A when the Pages sub-path is actually being used.
//
// The DEV-only /editor route is stripped from dist/ by scripts/strip-editor.mjs
// (run after `astro build` in the `build` npm script). It is a no-op empty
// shell in production anyway, but the route + its JS/CSS bundle are dead
// public surface; the postbuild script removes only dist/editor/.
export default defineConfig({
  site: 'https://sdinc.dev',
  integrations: [],
  output: 'static',
});
