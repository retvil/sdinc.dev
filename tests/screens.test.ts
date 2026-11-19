// L9: smoke coverage for the eight direction screens. Each screen must mount
// into the shared host without throwing, activate/deactivate cleanly, and
// respond to rotor step/confirm. This closes the "8 screens, zero test
// coverage" gap (they were only exercised via the state machine).
import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
// Import the registry side-effect module so all 8 factories register.
import '../src/projects/screens/index';
import {
  setScreenHost,
  deactivateScreens,
  activateScreen,
  stepActiveScreen,
  confirmActiveScreen,
  isActiveScreen,
} from '../src/projects/registry';
import type { ProjectScreenId } from '../src/projects/types';

const SCREEN_IDS: ProjectScreenId[] = [
  'media-analytics', 'game', 'open-source', 'rag',
  'chatbot', 'call-analytics', 'short-video', 'restoration',
];

let host: HTMLElement;

// The registry is a deliberate module singleton (one shared DOM host, as in
// production). Tests must therefore share ONE host for the whole file —
// re-setting the host per test would orphan cached instances on the old host.
// We only deactivate between cases to reset activeId, never the host.
beforeAll(() => {
  host = document.createElement('div');
  host.id = 'project-screen-host';
  document.body.append(host);
  setScreenHost(host);
});

function resetActive(): void {
  deactivateScreens();
}

beforeEach(() => {
  resetActive();
});

describe('direction screens smoke', () => {
  it.each(SCREEN_IDS)('mounts and activates "%s" without throwing', (id) => {
    expect(() => activateScreen(id)).not.toThrow();
    expect(isActiveScreen(id)).toBe(true);
    // The screen must have built a root element in the host.
    const root = host.querySelector(`[data-screen-id="${id}"]`) as HTMLElement | null;
    expect(root, `screen ${id} did not create a host root`).toBeTruthy();
    expect(root!.hidden).toBe(false);
  });

  it.each(SCREEN_IDS)('step/confirm on "%s" are safe (no throw)', (id) => {
    activateScreen(id);
    expect(() => stepActiveScreen(1)).not.toThrow();
    expect(() => confirmActiveScreen()).not.toThrow();
    expect(() => stepActiveScreen(-1)).not.toThrow();
  });

  it('switching screens hides the previous one (single host session)', () => {
    // The registry is a module singleton; drive both screens from one host so
    // their instances share the same host element.
    activateScreen('game');
    const gameRoot = host.querySelector('[data-screen-id="game"]') as HTMLElement;
    expect(gameRoot, 'game root not mounted').toBeTruthy();
    activateScreen('rag');
    const ragRoot = host.querySelector('[data-screen-id="rag"]') as HTMLElement;
    expect(ragRoot, 'rag root not mounted').toBeTruthy();
    expect(ragRoot.hidden).toBe(false);
    expect(gameRoot.hidden).toBe(true);
    expect(isActiveScreen('rag')).toBe(true);
    expect(isActiveScreen('game')).toBe(false);
  });

  it('deactivateScreens hides the active screen but keeps its state', () => {
    activateScreen('chatbot');
    const root = host.querySelector('[data-screen-id="chatbot"]') as HTMLElement;
    expect(root, 'chatbot root not mounted').toBeTruthy();
    expect(root.hidden).toBe(false);
    deactivateScreens();
    expect(root.hidden).toBe(true);
    // State kept: re-activating restores the same (non-hidden) screen element.
    activateScreen('chatbot');
    expect(root.hidden).toBe(false);
  });

  it('an unregistered screen id throws (L8 safety net)', () => {
    // Cast a bogus id: the registry must fail loudly, not render empty.
    expect(() => activateScreen('nonexistent' as ProjectScreenId)).toThrow(/no screen registered/);
  });
});
