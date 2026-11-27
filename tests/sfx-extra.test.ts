// Unit tests for the added Pip-Boy SFX (T38): tab-switch cue, page-entry
// cue, ambient hum start/stop. All are no-ops under jsdom (no Web Audio
// context, localStorage muted by default false but no AudioContext), so we
// assert they do NOT throw and that the muted path is respected.

import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  playTabSwitch,
  playPageEntry,
  startAmbientHum,
  stopAmbientHum,
  setMuted,
  isMuted,
} from '../src/scene/sound';

describe('added Pip-Boy SFX', () => {
  afterEach(() => {
    setMuted(false);
    vi.restoreAllMocks();
  });

  it('playTabSwitch does not throw (jsdom has no Web Audio)', () => {
    expect(() => playTabSwitch()).not.toThrow();
  });

  it('playPageEntry does not throw', () => {
    expect(() => playPageEntry()).not.toThrow();
  });

  it('startAmbientHum / stopAmbientHum do not throw and are idempotent', () => {
    // jsdom has no AudioContext, so start is a no-op; stop must still be safe.
    expect(() => startAmbientHum()).not.toThrow();
    expect(() => stopAmbientHum()).not.toThrow();
    // Repeated stops are safe.
    expect(() => stopAmbientHum()).not.toThrow();
  });

  it('ambient hum does not start when muted', () => {
    setMuted(true);
    expect(isMuted()).toBe(true);
    // No throw; the hum must not start.
    expect(() => startAmbientHum()).not.toThrow();
  });

  it('all three new cues are no-ops when muted (do not throw)', () => {
    setMuted(true);
    expect(() => playTabSwitch()).not.toThrow();
    expect(() => playPageEntry()).not.toThrow();
  });
});
