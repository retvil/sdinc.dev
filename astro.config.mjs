import { defineConfig } from 'astro/config';

// GitHub Pages deployment target. The baseline doc states publishing is not
// yet configured and changes to hosting settings require explicit owner
// approval (docs/accepted-visual-baseline.md §"Правила дальнейших изменений").
//
// When deploying to https://retvil.github.io/sdinc.dev/:
//   1. Set `base: '/sdinc.dev/'` here.
//   2. The hardcoded ASSET_BASE in src/scene/assets.ts ('/assets/device/')
//      must become relative or use Astro's import.meta.env.BASE_URL so
//      runtime-mounted <img> tags resolve under the sub-path.
//   3. Push to `main` and enable Pages in the repo settings.
//
// Until then the config stays minimal and local dev continues to work with
// absolute root paths.
export default defineConfig({
  integrations: [],
});
