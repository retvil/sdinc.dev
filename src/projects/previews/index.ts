// Level-1 previews: one quiet static SVG illustration per direction, shown in
// the projects-list preview area when the item is selected. The illustration
// explains the topic visually and invites opening the page — it never offers
// a mini demonstration. Full interactive demonstrations live at level 3.

/**
 * Renders a static, decorative SVG illustration into the preview root.
 * No focusable nodes, no click handlers; `pointer-events` is disabled via CSS
 * so the graphics can never intercept the "open project" action.
 */
export function illustration(root: HTMLElement, svgMarkup: string, originText?: string): void {
  const box = document.createElement('div');
  box.className = 'pv-illustration';
  box.setAttribute('aria-hidden', 'true');
  box.innerHTML = svgMarkup;
  root.append(box);
  if (originText) root.append(originTag(originText));
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
