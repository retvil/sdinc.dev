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

/**
 * Toggle button with a selected state kept in one place.
 *
 * SFX contract: `clickSfx` is the SINGLE owner of the Pip-Boy click tick.
 * `selectButton` opts into playing it via `{ sfx: true }` (the default) for
 * buttons that don't have their own handler wrapping. If a caller instead
 * wraps `onClick` in `clickSfx`, pass `{ sfx: false }` to avoid a double tick.
 */
export function selectButton(
  label: string,
  ariaLabel: string,
  onClick: () => void,
  options?: { sfx?: boolean },
): HTMLButtonElement {
  const b = el('button', 'dir-select') as HTMLButtonElement;
  b.type = 'button';
  b.textContent = label;
  b.setAttribute('aria-label', ariaLabel);
  const playSfx = options?.sfx !== false;
  b.addEventListener('click', () => {
    if (playSfx) playScreenClick();
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
 * Wraps a handler so that a click sound plays before it fires.
 *
 * `clickSfx` is the single owner of the Pip-Boy click tick. Use it on raw
 * buttons, or pass `{ sfx: false }` to `selectButton` when you wrap its
 * `onClick` here — one strategy per click target, never both.
 */
export function clickSfx(handler: () => void): () => void {
  return () => {
    playScreenClick();
    handler();
  };
}
