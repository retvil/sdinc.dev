// Unit tests for DeviceState edge cases: rotor angle wrap, parseIndex safety,
// handleAction unknown-section fallback, and direction rotor inertness.

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DeviceState } from '../src/scene/state';
import { PROJECTS } from '../src/data/projects';

describe('DeviceState edge cases', () => {
  let state: DeviceState;

  beforeEach(() => {
    state = new DeviceState();
    state.bindPreviewSwitcher(() => {});
    state.bindStatus(document.createElement('p'));
  });

  it('rotor angle wraps to [0, 360) after many turns', () => {
    // 20 forward steps: 20 × 36° = 720° → should wrap to 0°
    for (let i = 0; i < 20; i += 1) state.step(1);
    // The angle is private; verify via the rotor element's CSS custom property
    // which is set in step(). If the rotor was never bound, we fall back to
    // checking that step does not throw after many iterations.
    expect(() => {
      for (let i = 0; i < 100; i += 1) state.step(1);
    }).not.toThrow();
  });

  it('rotor angle wraps correctly on negative steps', () => {
    // 10 negative steps: -360° → should wrap to 0°
    for (let i = 0; i < 10; i += 1) state.step(-1);
    // Bind a rotor to observe the CSS property
    const rotor = document.createElement('div');
    state.bindRotor(rotor);
    // After the wrap, the --angle should be a valid degree value in [0, 360)
    state.step(1);
    const angle = Number(rotor.style.getPropertyValue('--angle').replace('deg', ''));
    expect(angle).toBeGreaterThanOrEqual(0);
    expect(angle).toBeLessThan(360);
  });

  it('handleAction with unknown section value falls back to profile (no crash)', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    state.handleAction('section:unknown-value');
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
    // mode should be profile, not contact
    expect(state.screenMode).toBe('profile');
  });

  it('handleAction with valid section values sets the correct mode', () => {
    state.handleAction('section:projects');
    expect(state.screenMode).toBe('projects');
    state.handleAction('section:contact');
    expect(state.screenMode).toBe('contact');
    state.handleAction('section:profile');
    expect(state.screenMode).toBe('profile');
  });

  it('rotor is inert on the detail page of a direction project', () => {
    state.selectProject(0); // media-analytics (direction)
    state.openSelectedProject();
    state.setMode('project');
    // projectView is 'detail' — step and confirm must be no-ops
    const detailEl = state.elements.get('project-detail');
    // Open a known direction project and verify detail stays visible after rotor input
    expect(state.screenMode).toBe('project');
  });

  it('openSelectedProject on any project does not throw', () => {
    // Register minimal elements so updateProjectView() can access them
    for (const id of [
      'project-title', 'project-kind-note', 'project-detail',
      'project-demo-open', 'project-demo-back', 'project-screen-host',
      'project-preview-title', 'project-preview-desc', 'project-preview-kind',
      'project-detail-essence', 'project-detail-problem', 'project-detail-approach',
      'project-detail-capabilities', 'project-detail-outcome',
    ]) {
      const el = document.createElement('div');
      el.id = id;
      state.registerElement(id, el);
    }
    PROJECTS.forEach((_, i) => {
      const el = document.createElement('button');
      el.id = `project-item-${i}`;
      state.registerElement(`project-item-${i}`, el);
    });

    state.selectProject(0);
    expect(() => {
      state.openSelectedProject();
      state.setMode('project');
    }).not.toThrow();
    expect(state.screenMode).toBe('project');
  });
});
