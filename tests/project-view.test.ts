// Unit tests for the projectView state machine in DeviceState.
// Covers: detail→demo, demo→detail, rotor no-op on detail, demo sample guard.

import { describe, it, expect, beforeEach } from 'vitest';
import { DeviceState } from '../src/scene/state';
import { PROJECTS } from '../src/data/projects';

/**
 * Builds a minimal element registry so the state machine's DOM reads/writes
 * have targets without running the full renderer.
 */
function freshElements(): Map<string, HTMLElement> {
  const map = new Map<string, HTMLElement>();
  const ids = [
    'project-title',
    'project-kind-note',
    'project-schematic',
    'project-tabs',
    'project-tab-text',
    'component-info',
    'project-side',
    'project-detail',
    'project-demo-open',
    'project-demo-back',
    'project-screen-host',
    'project-preview-title',
    'project-preview-desc',
    'project-preview-kind',
  ];
  for (const id of ids) {
    const el = document.createElement('div');
    el.id = id;
    map.set(id, el);
  }
  // project-item-N for each project
  PROJECTS.forEach((_, i) => {
    const el = document.createElement('div');
    el.className = 'project-item';
    map.set(`project-item-${i}`, el);
  });
  // component-node-N for the demo project's components
  const demo = PROJECTS.find((p) => p.kind === 'demo')!;
  demo.components.forEach((_, i) => {
    const el = document.createElement('div');
    map.set(`component-node-${i}`, el);
  });
  // detail page sub-fields
  for (const id of [
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

describe('DeviceState projectView machine', () => {
  let state: DeviceState;

  beforeEach(() => {
    state = new DeviceState();
    for (const [id, el] of freshElements()) state.registerElement(id, el);
    state.bindPreviewSwitcher(() => {});
    state.bindStatus(document.createElement('p'));
  });

  function el(id: string): HTMLElement {
    return state.elements.get(id)!;
  }

  // Open a direction project on the detail page, then assert the detail DOM state.
  function openDirection(index: number): void {
    state.selectProject(index);
    state.openSelectedProject();
    state.setMode('project');
  }

  it('opens a direction on the detail page: detail visible, demo hidden', () => {
    openDirection(0); // media-analytics
    expect(el('project-detail').hidden).toBe(false);
    expect(el('project-screen-host').hidden).toBe(true);
    expect(el('project-demo-back').hidden).toBe(true);
    expect(el('project-schematic').hidden).toBe(true);
  });

  it('showProjectDemo switches to the demo: detail hidden, screen host visible', () => {
    openDirection(0);
    state.showProjectDemo();
    expect(el('project-detail').hidden).toBe(true);
    expect(el('project-screen-host').hidden).toBe(false);
    expect(el('project-demo-back').hidden).toBe(false);
    expect(el('project-schematic').hidden).toBe(true);
  });

  it('backToProjectDetail returns to the detail page: demo host hidden again', () => {
    openDirection(0);
    state.showProjectDemo();
    state.backToProjectDetail();
    expect(el('project-detail').hidden).toBe(false);
    expect(el('project-screen-host').hidden).toBe(true);
    expect(el('project-demo-back').hidden).toBe(true);
  });

  it('rotor step/confirm are no-ops while on the detail page', () => {
    openDirection(0);
    // step() on a direction project with projectView !== 'demo' must early-return
    state.step(1);
    state.step(-1);
    state.confirm();
    // detail must remain visible; the screen host must not have activated
    expect(el('project-detail').hidden).toBe(false);
    expect(el('project-screen-host').hidden).toBe(true);
  });

  it('showProjectDemo is a no-op for the demo sample project', () => {
    const demoIndex = PROJECTS.findIndex((p) => p.kind === 'demo');
    state.selectProject(demoIndex);
    state.openSelectedProject();
    state.setMode('project');
    state.showProjectDemo(); // kind !== 'direction' → early return
    expect(el('project-detail').hidden).toBe(true);
    expect(el('project-schematic').hidden).toBe(false);
    expect(el('project-screen-host').hidden).toBe(true);
  });
});
