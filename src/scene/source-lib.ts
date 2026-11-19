// Dev-only source library used by LayerEditor. Kept OUT of renderer.ts so the
// public page (which transitively bundles renderer via Display.astro) does not
// carry the editor's scene-tree walk + asset resolver. The dev editor is the
// only importer of this module; it is gated behind import.meta.env.DEV and the
// /editor route is stripped from production builds by scripts/strip-editor.mjs.

import type { SceneNode, SourceFragment } from './types';
import type { SceneFile } from './types';
import { parseScene } from './parse';
import { resolveAsset } from './assets';
import sceneFile from './scene.json';

const scene: SceneFile = parseScene(sceneFile);

/** Every tree fragment that owns a raster asset (reverse document order). */
export function sourceFragments(): SourceFragment[] {
  const result: SourceFragment[] = [];
  const stack: SceneNode[] = [scene.scene];
  while (stack.length > 0) {
    const current = stack.pop() as SceneNode;
    if (current.asset) {
      result.push({ id: current.id, name: current.name, asset: current.asset, bounds: current.bounds });
    }
    stack.push(...current.children);
  }
  return result.reverse();
}

/** Resolved public URL for a source-library fragment. */
export function sourceUrl(fragment: SourceFragment): string {
  return resolveAsset(fragment.asset);
}
