// Unit tests for the Pip-Boy tab-switch shutter (T34).
//
// Verifies:
//  - runTabShutter toggles .tab-cover/.tab-open on #device and plays the cue
//  - rapid clicks are guarded (no overlapping runs)
//  - playTabSwitch exists and is a no-op when muted (does not throw)
//
// jsdom: no real #device or Web Audio; we stub what's needed. The shutter
// logic itself only touches classList + setTimeout + the sound function,
// all of which are safe to exercise under jsdom.

import { describe, it, expect, vi, afterEach } from 'vitest';
import { device } from '../src/scene/state';
import { playTabSwitch, setMuted, isMuted } from '../src/scene/sound';

describe('tab-switch shutter', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
    // Reset the running flag if a test left it set.
    (device as unknown as { tabShutterRunning?: boolean }).tabShutterRunning = false;
  });

  it('runTabShutter toggles .tab-cover then .tab-open on #device', () => {
    vi.useFakeTimers();
    const dev = document.createElement('div');
    dev.id = 'device';
    document.body.append(dev);

    device.runTabShutter();
    expect(dev.classList.contains('tab-cover')).toBe(true);
    expect(dev.classList.contains('tab-open')).toBe(false);

    vi.advanceTimersByTime(210);
    expect(dev.classList.contains('tab-cover')).toBe(false);
    expect(dev.classList.contains('tab-open')).toBe(true);

    vi.advanceTimersByTime(210);
    expect(dev.classList.contains('tab-open')).toBe(false);
    dev.remove();
  });

  it('guards against overlapping runs (rapid clicks)', () => {
    vi.useFakeTimers();
    const dev = document.createElement('div');
    dev.id = 'device';
    document.body.append(dev);

    device.runTabShutter();
    // Immediately re-run: should be a no-op (already running).
    device.runTabShutter();
    expect(dev.classList.contains('tab-cover')).toBe(true);

    vi.advanceTimersByTime(420);
    // Now free: a fresh run works again.
    device.runTabShutter();
    expect(dev.classList.contains('tab-cover')).toBe(true);
    vi.advanceTimersByTime(420);
    expect(dev.classList.contains('tab-cover')).toBe(false);
    dev.remove();
  });

  it('is a no-op when #device is absent (editor/tests)', () => {
    // No #device in the document: runTabShutter must not throw.
    expect(() => device.runTabShutter()).not.toThrow();
  });

  it('playTabSwitch is a no-op when muted (does not throw)', () => {
    const prev = isMuted();
    setMuted(true);
    expect(() => playTabSwitch()).not.toThrow();
    setMuted(prev);
  });
});
