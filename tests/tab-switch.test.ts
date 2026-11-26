// Unit tests for the Pip-Boy tab-switch shutter (T34).
//
// Verifies:
//  - runTabShutter toggles .tab-cover/.tab-open on #device
//  - rapid clicks are guarded (no overlapping runs)
//  - playTabSwitch exists and is a no-op when muted (does not throw)
//
// jsdom: no real #device or Web Audio; the shutter logic only touches
// classList + setTimeout + the sound function, all safe under jsdom.

import { describe, it, expect, vi, afterEach } from 'vitest';
import { device } from '../src/scene/state';
import { playTabSwitch, setMuted, isMuted } from '../src/scene/sound';

describe('tab-switch shutter', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
    (device as unknown as { tabShutterRunning?: boolean }).tabShutterRunning = false;
    document.getElementById('device')?.remove();
  });

  it('runTabShutter toggles .tab-cover then .tab-open on #device', () => {
    vi.useFakeTimers();
    const dev = document.createElement('div');
    dev.id = 'device';
    document.body.append(dev);

    device.runTabShutter();
    expect(dev.classList.contains('tab-cover')).toBe(true);
    expect(dev.classList.contains('tab-open')).toBe(false);

    // Phase 1 (cover, 220ms) → phase 2 (open).
    vi.advanceTimersByTime(220);
    expect(dev.classList.contains('tab-cover')).toBe(false);
    expect(dev.classList.contains('tab-open')).toBe(true);

    // Settled (440ms total): both cleared.
    vi.advanceTimersByTime(220);
    expect(dev.classList.contains('tab-open')).toBe(false);
  });

  it('guards against overlapping runs (rapid clicks)', () => {
    vi.useFakeTimers();
    const dev = document.createElement('div');
    dev.id = 'device';
    document.body.append(dev);

    device.runTabShutter();
    // Immediately re-run: no-op (already running).
    device.runTabShutter();
    expect(dev.classList.contains('tab-cover')).toBe(true);

    vi.advanceTimersByTime(440);
    // Now free: a fresh run works again.
    device.runTabShutter();
    expect(dev.classList.contains('tab-cover')).toBe(true);
    vi.advanceTimersByTime(440);
    expect(dev.classList.contains('tab-cover')).toBe(false);
  });

  it('is a no-op when #device is absent (editor/tests)', () => {
    expect(() => device.runTabShutter()).not.toThrow();
  });

  it('playTabSwitch is a no-op when muted (does not throw)', () => {
    const prev = isMuted();
    setMuted(true);
    expect(() => playTabSwitch()).not.toThrow();
    setMuted(prev);
  });
});
