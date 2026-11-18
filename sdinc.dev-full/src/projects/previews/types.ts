// Shared preview contracts (kept separate from index.ts to avoid
// import-cycle TDZ issues between the registry and scene modules).

import type { ProjectScreenRef } from '../../data/projects';

export type PreviewId = Exclude<ProjectScreenRef, 'demo'>;

export interface ProjectPreview {
  id: PreviewId;
  /** Builds the scene once inside the given root container. */
  mount(root: HTMLElement): void;
}
