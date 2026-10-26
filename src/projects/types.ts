// Project screens: shared contract for the eight direction presentations.
// Each direction mounts ONCE into the shared project-screen host; enter/leave
// only show/hide and sync. Local state lives in module closures and survives
// re-opening within the session (fresh load returns defined start values).

export type ProjectScreenId =
  | 'media-analytics'
  | 'game'
  | 'open-source'
  | 'rag'
  | 'chatbot'
  | 'call-analytics'
  | 'short-video'
  | 'restoration';

export interface ProjectScreen {
  /** Stable id — must match ProjectInfo.screen; never array position. */
  readonly id: ProjectScreenId;
  /** Build DOM once. Handlers and SVG ids are namespaced and never re-added. */
  mount(host: HTMLElement): void;
  /** Screen becomes visible; sync local DOM without stealing site focus. */
  enter(): void;
  /** Screen hidden; local state is kept (session persistence). */
  leave(): void;
  /** Existing rotor step: acts on the screen's main object set. */
  step(delta: 1 | -1): void;
  /** Existing rotor confirm: reveals/explains, never dangerous actions. */
  confirm(): void;
}
