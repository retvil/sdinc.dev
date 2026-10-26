// Level-1 preview scenes: one lightweight, unique visual scene per direction,
// shown in the projects-list preview area when the item is selected. Previews
// explain the topic and invite a small interaction — they never replace the
// full demonstration (level 3) and never launch real services.

/** Selection pill used by every preview scene (shared look & a11y). */
export function pick(label: string, aria: string): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'pv-pick';
  button.textContent = label;
  button.setAttribute('aria-pressed', 'false');
  button.setAttribute('aria-label', aria);
  return button;
}

/** Marks exactly one button in the group as selected. */
export function selectOnly(buttons: HTMLElement[], selected: HTMLElement | null): void {
  for (const button of buttons) {
    const on = button === selected;
    button.classList.toggle('selected', on);
    button.setAttribute('aria-pressed', String(on));
  }
}

/** One-line caption area of a preview scene. */
export function noteLine(): HTMLParagraphElement {
  const note = document.createElement('p');
  note.className = 'pv-note';
  return note;
}

/** Small origin marker for synthetic content (honesty requirement). */
export function originTag(text: string): HTMLElement {
  const tag = document.createElement('small');
  tag.className = 'pv-origin';
  tag.textContent = text;
  return tag;
}

import { mountPreviewScenes } from './registry';
import './media';
import './game';
import './open-source';
import './rag';
import './chatbot';
import './call-analytics';
import './short-video';
import './restoration';

export { mountPreviewScenes };
export type { PreviewId, ProjectPreview } from './types';
