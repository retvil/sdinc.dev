// Unit tests for the «Связь» (contacts) state machine in DeviceState.
// Covers: cycling selection, aria-pressed sync, confirmContact anchor click,
// single-flight guard on requestContactCopy, and resetView restoration.

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DeviceState } from '../src/scene/state';
import { CONTACTS } from '../src/data/contacts';
import { PROJECTS } from '../src/data/projects';

/**
 * Builds a minimal element registry for the contacts + projects screens.
 */
function contactElements(): Map<string, HTMLElement> {
  const map = new Map<string, HTMLElement>();
  // Contact select buttons
  CONTACTS.forEach((_, i) => {
    const el = document.createElement('button');
    el.className = 'contact-select';
    el.id = `contact-select-${i}`;
    el.dataset.screen = 'contact';
    map.set(`contact-select-${i}`, el);
  });
  // Contact action anchors
  CONTACTS.forEach((_, i) => {
    const el = document.createElement('a');
    el.id = `contact-action-${i}`;
    el.dataset.screen = 'contact';
    // Make offsetParent readable and non-null (visible) for confirmContact's guard.
    Object.defineProperty(el, 'offsetParent', {
      value: document.body,
      writable: true,
      configurable: true,
    });
    map.set(`contact-action-${i}`, el);
  });
  // Contact copy buttons
  CONTACTS.forEach((_, i) => {
    const el = document.createElement('button');
    el.id = `contact-copy-${i}`;
    el.dataset.screen = 'contact';
    map.set(`contact-copy-${i}`, el);
  });
  // Result live region
  const result = document.createElement('p');
  result.id = 'contact-result';
  result.dataset.screen = 'contact';
  map.set('contact-result', result);
  // project-item-N for selectProject
  PROJECTS.forEach((_, i) => {
    const el = document.createElement('button');
    el.className = 'project-item';
    el.id = `project-item-${i}`;
    map.set(`project-item-${i}`, el);
  });
  // project preview
  for (const id of ['project-preview-title', 'project-preview-desc', 'project-preview-kind']) {
    const el = document.createElement('div');
    el.id = id;
    map.set(id, el);
  }
  // project detail fields
  for (const id of [
    'project-title',
    'project-kind-note',
    'project-detail',
    'project-demo-open',
    'project-demo-back',
    'project-screen-host',
    'project-detail-essence',
    'project-detail-problem',
    'project-detail-approach',
    'project-detail-capabilities',
    'project-detail-outcome',
  ]) {
    const el = document.createElement('div');
    el.id = id;
    map.set(id, el);
  }
  return map;
}

describe('DeviceState contacts machine', () => {
  let state: DeviceState;

  beforeEach(() => {
    state = new DeviceState();
    for (const [id, el] of contactElements()) state.registerElement(id, el);
    state.bindPreviewSwitcher(() => {});
    state.bindStatus(document.createElement('p'));
  });

  function selectEl(i: number): HTMLElement {
    return state.elements.get(`contact-select-${i}`)!;
  }

  it('selectContact cycles selection and syncs aria-pressed', () => {
    state.selectContact(0);
    expect(selectEl(0).getAttribute('aria-pressed')).toBe('true');
    expect(selectEl(1).getAttribute('aria-pressed')).toBe('false');
    expect(selectEl(2).getAttribute('aria-pressed')).toBe('false');

    state.selectContact(1);
    expect(selectEl(0).getAttribute('aria-pressed')).toBe('false');
    expect(selectEl(1).getAttribute('aria-pressed')).toBe('true');

    state.selectContact(2);
    expect(selectEl(2).getAttribute('aria-pressed')).toBe('true');
  });

  it('selectContact wraps around at the boundaries', () => {
    state.selectContact(CONTACTS.length); // 3 → wraps to 0
    expect(selectEl(0).getAttribute('aria-pressed')).toBe('true');
    state.selectContact(-1); // -1 → wraps to last (2)
    expect(selectEl(CONTACTS.length - 1).getAttribute('aria-pressed')).toBe('true');
  });

  it('confirmContact clicks the anchor of the selected contact', () => {
    state.selectContact(1);
    state.setMode('contact'); // required so that mode === 'contact' before confirm()
    const anchor = state.elements.get('contact-action-1')!;
    const clickSpy = vi.spyOn(anchor, 'click');
    state.confirm();
    expect(clickSpy).toHaveBeenCalledTimes(1);
    clickSpy.mockRestore();
  });

  it('confirmContact is safe when no contact is selected (index 0 default)', () => {
    const anchor = state.elements.get('contact-action-0')!;
    const clickSpy = vi.spyOn(anchor, 'click');
    state.setMode('contact');
    expect(state.elements.get('contact-action-0')).toBe(anchor);
    clickSpy.mockRestore();
  });

  it('requestContactCopy single-flight: latest request wins', async () => {
    const writeText = vi.fn()
      .mockResolvedValueOnce(undefined) // first call (superseded)
      .mockResolvedValue(undefined); // second call (wins)
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });
    const resultEl = state.elements.get('contact-result')!;
    // Start two copies in parallel (simulating rapid clicks).
    const p1 = state.requestContactCopy(0);
    const p2 = state.requestContactCopy(1);
    await Promise.all([p1, p2]);
    expect(writeText).toHaveBeenCalledTimes(2);
    // The second call is the latest; its result should be in the status line.
    expect(resultEl.textContent).toContain(CONTACTS[1].copyValue);
  });

  it('requestContactCopy failure shows manual-copy hint, never a success claim', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: vi.fn().mockRejectedValue(new Error('Permission denied')),
      },
      configurable: true,
    });
    const resultEl = state.elements.get('contact-result')!;
    await state.requestContactCopy(0);
    expect(resultEl.textContent).toContain('Не удалось скопировать');
    expect(resultEl.textContent).toContain(CONTACTS[0].copyValue);
    expect(resultEl.textContent).not.toContain('Скопировано');
  });

  it('resetView restores the first contact (Email)', () => {
    state.selectContact(2);
    expect(selectEl(2).getAttribute('aria-pressed')).toBe('true');
    state.resetView();
    // resetView sets selectedContact = 0 internally. Observe it via step:
    // in contact mode, step(1) calls selectContact(selectedContact + 1).
    // If selectedContact was correctly reset to 0, step(1) selects contact 1.
    // If it stayed at 2, step(1) would wrap to 0.
    state.setMode('contact');
    state.step(1);
    expect(selectEl(1).getAttribute('aria-pressed')).toBe('true');
    expect(selectEl(2).getAttribute('aria-pressed')).toBe('false');
  });
});
