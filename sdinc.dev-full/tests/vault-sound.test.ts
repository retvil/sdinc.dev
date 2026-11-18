/* Unit tests for the vault-sound mute state persistence.
   The audio synthesis itself is a browser Web Audio API and cannot be
   exercised in jsdom; we test the public mute state (isMuted / setMuted /
   toggleMuted) and the localStorage persistence contract. */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  playVaultOpen,
  isMuted,
  setMuted,
  toggleMuted,
} from '../src/scene/sound';

const STORAGE_KEY = 'sdinc:muted';

// The module reads localStorage on init; install a minimal shim so the
// persistence contract can be exercised in jsdom.
function makeStorageShim(): Storage {
  const store = new Map<string, string>();
  return {
    get length() { return store.size; },
    key(i: number) { return [...store.keys()][i] ?? null; },
    getItem(k: string) { return store.has(k) ? store.get(k)! : null; },
    setItem(k: string, v: string) { store.set(k, String(v)); },
    removeItem(k: string) { store.delete(k); },
    clear() { store.clear(); },
  } as unknown as Storage;
}

describe('vault-sound mute state', () => {
  beforeEach(() => {
    // Re-create the shim so each test starts from a clean storage state
    // (the module's internal `muted` is re-initialized on import; we
    // normalize it explicitly below).
    Object.defineProperty(globalThis, 'localStorage', {
      value: makeStorageShim(),
      writable: true,
      configurable: true,
    });
    setMuted(false);
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('starts unmuted by default', () => {
    expect(isMuted()).toBe(false);
  });

  it('toggleMuted flips the state and persists to localStorage', () => {
    const a = toggleMuted(); // false → true
    expect(a).toBe(true);
    expect(localStorage.getItem(STORAGE_KEY)).toBe('1');

    const b = toggleMuted(); // true → false
    expect(b).toBe(false);
    expect(localStorage.getItem(STORAGE_KEY)).toBe('0');
  });

  it('setMuted persists and isMuted reflects it', () => {
    setMuted(true);
    expect(isMuted()).toBe(true);
    expect(localStorage.getItem(STORAGE_KEY)).toBe('1');

    setMuted(false);
    expect(isMuted()).toBe(false);
    expect(localStorage.getItem(STORAGE_KEY)).toBe('0');
  });

  it('playVaultOpen is a no-op when muted (no AudioContext error)', () => {
    setMuted(true);
    // In jsdom there is no AudioContext at all; when muted the guard
    // returns before attempting to construct one.
    expect(() => playVaultOpen()).not.toThrow();
  });

  it('playVaultOpen degrades gracefully without AudioContext support', () => {
    // jsdom does not ship AudioContext / webkitAudioContext; the helper
    // returns null and playVaultOpen silently no-ops.
    const w = window as unknown as { AudioContext?: unknown; webkitAudioContext?: unknown };
    expect(w.AudioContext).toBeUndefined();
    expect(w.webkitAudioContext).toBeUndefined();
    expect(() => playVaultOpen()).not.toThrow();
  });
});
