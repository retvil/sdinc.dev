// Small DOM helpers shared by the direction screens. Deliberately tiny:
// no universal widget engine — each screen owns its own composition.

import { playScreenClick } from '../scene/sound';

type Tag = keyof HTMLElementTagNameMap;

export function el<K extends Tag>(tag: K, className?: string, text?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

/** Permanent origin note for synthetic demo material (visibility contract). */
export function originNote(text: string): HTMLElement {
  return el('p', 'dir-origin', text);
}

/** Local status line: polite, never steals focus. */
export function statusLine(): HTMLParagraphElement {
  const p = el('p', 'dir-status') as HTMLParagraphElement;
  p.setAttribute('role', 'status');
  p.setAttribute('aria-live', 'polite');
  return p;
}

/** Toggle button with a selected state kept in one place; plays the Pip-Boy tick on press. */
export function selectButton(
  label: string,
  ariaLabel: string,
  onClick: () => void,
): HTMLButtonElement {
  const b = el('button', 'dir-select') as HTMLButtonElement;
  b.type = 'button';
  b.textContent = label;
  b.setAttribute('aria-label', ariaLabel);
  b.addEventListener('click', () => {
    playScreenClick();
    onClick();
  });
  return b;
}

export function markSelected(
  buttons: readonly HTMLElement[],
  selected: HTMLElement | null,
  attribute: 'aria-pressed' | 'aria-selected' = 'aria-pressed',
): void {
  for (const b of buttons) {
    const isSel = b === selected;
    b.classList.toggle('selected', isSel);
    b.setAttribute(attribute, String(isSel));
  }
}

/**
 * Wraps a click handler so every button press plays the Pip-Boy tick.
 * Use this for all in-screen buttons created with el('button', ...) —
 * chat options, reference buttons, game reset, contact selects, etc.
 */
export function clickSfx(handler: () => void): () => void {
  return () => {
    playScreenClick();
    handler();
  };
}
