// Postbuild: strip the DEV-only /editor route from dist/.
//
// The layer editor (src/pages/editor.astro) ships as a no-op empty shell in
// production (import.meta.env.DEV === false), but the emitted route + its
// JS/CSS bundle + any /editor/ CSP rule are dead public surface on GitHub
// Pages. This script removes only dist/editor/ after a production build so
// the deployable directory carries just / and the device assets. The dev
// server (npm run dev) is unaffected — it serves /editor for the tooling.
//
// Idempotent: safe to run even when dist/editor/ is absent.

import { rm } from 'node:fs/promises';
import { join } from 'node:path';

const target = join(process.cwd(), 'dist', 'editor');
await rm(target, { recursive: true, force: true });
console.log(`[strip-editor] removed ${join('dist', 'editor')} (if present)`);
