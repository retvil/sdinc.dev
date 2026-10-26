// Preview registry lives in its own module: scene files import it and run
// registerPreview() during their side-effect import — a registry inside
// index.ts would hit a TDZ error (imports hoist above its body).

import type { ProjectScreenRef } from '../../data/projects';
import type { ProjectPreview, PreviewId } from './types';

const registry = new Map<PreviewId, ProjectPreview>();

export function registerPreview(preview: ProjectPreview): void {
  registry.set(preview.id, preview);
}

/**
 * Mounts every preview scene into its own hidden container inside `stage`.
 * Scenes are tiny; eager mounting keeps switching instant and deterministic.
 * Returns a switcher: shows the scene for the id, or hides all for 'demo'
 * (the demo item keeps its static schematic preview).
 */
export function mountPreviewScenes(
  stage: HTMLElement,
  schematic: HTMLElement,
): (id: ProjectScreenRef) => void {
  const containers = new Map<PreviewId, HTMLElement>();
  for (const preview of registry.values()) {
    const holder = document.createElement('div');
    holder.className = 'pv-scene';
    holder.hidden = true;
    preview.mount(holder);
    stage.append(holder);
    containers.set(preview.id, holder);
  }
  return (id: ProjectScreenRef) => {
    schematic.hidden = id !== 'demo';
    for (const [pid, holder] of containers) holder.hidden = pid !== id;
  };
}
