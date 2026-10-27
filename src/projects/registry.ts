// Registry of direction project screens: one lazy instance per screen id,
// a single shared DOM host inside the project view, and rotor delegation.
// activateScreen shows the requested screen and leaves the previously
// active one (state kept, DOM handlers never duplicated).

import type { ProjectScreen, ProjectScreenId } from './types';

let host: HTMLElement | null = null;
let activeId: ProjectScreenId | null = null;
const factories = new Map<ProjectScreenId, () => ProjectScreen>();
const instances = new Map<ProjectScreenId, ProjectScreen>();

/** Called by the renderer once when the project view is mounted. */
export function setScreenHost(element: HTMLElement): void {
  host = element;
}

/** Side-effect registration from screen modules. */
export function registerScreen(id: ProjectScreenId, factory: () => ProjectScreen): void {
  factories.set(id, factory);
}

function instance(id: ProjectScreenId): ProjectScreen | null {
  const known = instances.get(id);
  if (known) return known;
  const factory = factories.get(id);
  if (!factory || !host) return null;
  const created = factory();
  created.mount(host);
  instances.set(id, created);
  return created;
}

/** Shows the requested screen; leaves the previous one. Demo must not call this. */
export function activateScreen(id: ProjectScreenId): void {
  if (!host) return;
  if (activeId === id) return;
  if (activeId) instances.get(activeId)?.leave();
  const next = instance(id);
  if (!next) return;
  for (const [key, screen] of instances) {
    const el = screenElement(screen);
    if (el) el.hidden = key !== id;
  }
  next.enter();
  activeId = id;
}

/** Hides any active screen when the project mode is left. State is kept. */
export function deactivateScreens(): void {
  if (!activeId) return;
  const active = instances.get(activeId);
  if (active) active.leave();
  const el = active ? screenElement(active) : null;
  if (el) el.hidden = true;
  activeId = null;
}

function screenElement(screen: ProjectScreen): HTMLElement | null {
  return host ? (host.querySelector(`[data-screen-id="${screen.id}"]`) as HTMLElement | null) : null;
}

/** Rotor delegation: the active screen handles step/confirm, demo does not call this. */
export function stepActiveScreen(delta: 1 | -1): void {
  if (activeId) instances.get(activeId)?.step(delta);
}

export function confirmActiveScreen(): void {
  if (activeId) instances.get(activeId)?.confirm();
}

export function isActiveScreen(id: ProjectScreenId): boolean {
  return activeId === id;
}
