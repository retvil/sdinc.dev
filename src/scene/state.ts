// Device state: display mode machine (profile / projects / project),
// direction selection, rotary dial, section actions, live card and layer
// overrides (DEV-only editor). The static body is a single master; state
// owns only interactive overlays. No global key interception: all keyboard
// handling lives on the focused controls.
// Ported from sdinc-fidelity-v7-desktop app.js, extended for stage D.

import type { LayerOverride, SceneNode } from './types';
import {
  DEFAULT_DIRECTION,
  DIRECTIONS,
  DIRECTION_KEYS,
  type DirectionInfo,
  type DirectionKey,
} from '../data/demo';
import { PROJECTS, type ProjectInfo } from '../data/projects';

type DirectionCopy = Record<DirectionKey, DirectionInfo>;
export type ScreenMode = 'profile' | 'projects' | 'project';
export type ProjectTab = 'task' | 'role' | 'result';

const PROJECT_TABS: ProjectTab[] = ['task', 'role', 'result'];

function cloneDirections(): DirectionCopy {
  return Object.fromEntries(
    DIRECTION_KEYS.map((key) => [key, { ...DIRECTIONS[key] }]),
  ) as DirectionCopy;
}

class DeviceState {
  /** Registered interactive layers (controls + overlays) for the editor. */
  readonly nodes = new Map<string, SceneNode>();
  readonly elements = new Map<string, HTMLElement>();

  /** Layer overrides applied by the editor (visibility/opacity/offset). */
  overrides: Record<string, LayerOverride> = {};

  private directions: DirectionCopy = cloneDirections();
  private active: DirectionKey = DEFAULT_DIRECTION;
  private angle = 0;
  private statusEl: HTMLElement | null = null;
  private rotorEl: HTMLElement | null = null;
  private liveCardEl: HTMLElement | null = null;
  private liveTitleEl: HTMLElement | null = null;
  private liveDescEl: HTMLElement | null = null;

  // --- stage D: display mode machine ---
  private mode: ScreenMode = 'profile';
  private selectedProject = 0;
  private selectedComponent = 0;
  private activeTab: ProjectTab = 'task';
  /** Layout hooks run when a hidden screen becomes visible (geometry needed). */
  private readonly layoutHooks: Array<() => void> = [];

  /** Renderer registers geometry-dependent layout for hidden screens. */
  addLayoutHook(fn: () => void): void {
    this.layoutHooks.push(fn);
  }

  bindStatus(el: HTMLElement | null): void {
    this.statusEl = el;
  }

  status(text: string): void {
    if (this.statusEl) this.statusEl.textContent = text;
  }

  register(node: SceneNode, el: HTMLElement): void {
    this.nodes.set(node.id, node);
    this.elements.set(node.id, el);
  }

  /** Registers an element not backed by a scene.json node (panels, items). */
  registerElement(id: string, el: HTMLElement): void {
    this.elements.set(id, el);
  }

  bindRotor(el: HTMLElement): void {
    this.rotorEl = el;
  }

  bindLiveCard(card: HTMLElement, title: HTMLElement, description: HTMLElement): void {
    this.liveCardEl = card;
    this.liveTitleEl = title;
    this.liveDescEl = description;
  }

  get activeDirection(): DirectionKey {
    return this.active;
  }

  get screenMode(): ScreenMode {
    return this.mode;
  }

  getDirections(): DirectionCopy {
    return this.directions;
  }

  setDirectionCopy(key: DirectionKey, title: string, description: string): void {
    this.directions[key] = { title: title.slice(0, 80), description: description.slice(0, 300) };
  }

  // --- selection: directions (profile screen) ---

  selectNode(key: string, mark = true): void {
    if (!Object.hasOwn(DIRECTIONS, key)) return;
    this.active = key as DirectionKey;
    for (const k of DIRECTION_KEYS) {
      const control = this.elements.get(`node-${k}`);
      if (!control) continue;
      control.classList.toggle('selected', mark && k === key);
      control.setAttribute('aria-pressed', String(k === key));
    }
    const info = this.directions[key as DirectionKey];
    if (this.liveTitleEl) this.liveTitleEl.textContent = info.title;
    if (this.liveDescEl) this.liveDescEl.textContent = info.description;
    if (this.liveCardEl) this.liveCardEl.hidden = key === 'llm';
    if (mark) {
      this.status(`Выбран ${info.title}. Данные демонстрационные.`);
    }
  }

  // --- stage D: projects ---

  selectProject(index: number): void {
    const count = PROJECTS.length;
    this.selectedProject = ((index % count) + count) % count;
    const project = PROJECTS[this.selectedProject];
    for (const [id, el] of this.elements) {
      if (!id.startsWith('project-item-')) continue;
      const itemIndex = Number(id.replace('project-item-', ''));
      el.classList.toggle('selected', itemIndex === this.selectedProject);
      el.setAttribute('aria-selected', String(itemIndex === this.selectedProject));
    }
    const previewTitle = this.elements.get('project-preview-title');
    const previewDesc = this.elements.get('project-preview-desc');
    if (previewTitle) previewTitle.textContent = project.title;
    if (previewDesc) previewDesc.textContent = project.shortDescription;
    this.status(`Проект выбран: ${project.title}. Демонстрационные данные.`);
  }

  openSelectedProject(): void {
    this.selectedComponent = 0;
    this.activeTab = 'task';
    this.setMode('project');
    const project = PROJECTS[this.selectedProject];
    this.status(`Открыт ${project.title}. Демонстрационные данные.`);
  }

  selectComponent(index: number): void {
    const project = PROJECTS[this.selectedProject];
    const count = project.components.length;
    this.selectedComponent = ((index % count) + count) % count;
    for (const [id, el] of this.elements) {
      if (!id.startsWith('component-node-')) continue;
      const compIndex = Number(id.replace('component-node-', ''));
      el.classList.toggle('selected', compIndex === this.selectedComponent);
      el.setAttribute('aria-pressed', String(compIndex === this.selectedComponent));
    }
    const info = this.elements.get('component-info');
    if (info) info.textContent = project.components[this.selectedComponent].description;
  }

  setProjectTab(tab: ProjectTab): void {
    this.activeTab = tab;
    const project = PROJECTS[this.selectedProject];
    for (const t of PROJECT_TABS) {
      const button = this.elements.get(`project-tab-${t}`);
      if (!button) continue;
      button.setAttribute('aria-selected', String(t === tab));
      button.classList.toggle('active-tab', t === tab);
    }
    const text = this.elements.get('project-tab-text');
    if (text) text.textContent = project.details[tab];
    // Switching tabs must not reset the selected component — separate state.
  }

  /** Switches the display mode. Hidden screens lose focus automatically. */
  setMode(mode: ScreenMode): void {
    this.mode = mode;
    for (const el of this.elements.values()) {
      const screen = el.dataset.screen;
      if (!screen) continue;
      if (screen === 'profile') el.hidden = mode !== 'profile';
      else if (screen === 'panel') el.hidden = mode === 'profile';
      else if (screen === 'projects') el.hidden = mode !== 'projects';
      else if (screen === 'project') el.hidden = mode !== 'project';
    }
    if (mode === 'projects') {
      this.selectProject(this.selectedProject);
      this.elements.get(`project-item-${this.selectedProject}`)?.focus();
    } else if (mode === 'project') {
      for (const hook of this.layoutHooks) hook();
      this.selectComponent(this.selectedComponent);
      this.setProjectTab(this.activeTab);
      this.elements.get('project-title')?.focus();
    } else {
      // profile: no stray focus inside now-hidden screens; restore the
      // direction-owned visuals (live card follows the active direction)
      const active = document.activeElement;
      if (active instanceof HTMLElement && active.dataset.screen) active.blur();
      this.selectNode(this.active, false);
    }
  }

  // --- rotary dial and actions ---

  step(delta: 1 | -1): void {
    this.angle += delta * 36;
    if (this.rotorEl) {
      this.rotorEl.style.setProperty('--angle', `${this.angle}deg`);
      this.rotorEl.classList.add('active');
    }
    if (this.mode === 'projects') {
      this.selectProject(this.selectedProject + delta);
    } else if (this.mode === 'project') {
      this.selectComponent(this.selectedComponent + delta);
    } else {
      const index = DIRECTION_KEYS.indexOf(this.active);
      const next = DIRECTION_KEYS[(index + delta + DIRECTION_KEYS.length) % DIRECTION_KEYS.length];
      this.selectNode(next);
    }
  }

  /** Dial confirmation: context-dependent, never an empty selection. */
  confirm(): void {
    if (this.mode === 'projects') {
      this.openSelectedProject();
    } else if (this.mode === 'project') {
      const project = PROJECTS[this.selectedProject];
      const component = project.components[this.selectedComponent];
      this.status(`Компонент ${component.label}. ${component.description}`);
    } else {
      this.selectNode(this.active);
    }
  }

  handleAction(action: string): void {
    if (action === 'dial') {
      this.step(1);
      return;
    }
    const [type, value] = action.split(':');
    if (type === 'node') {
      this.selectNode(value);
      return;
    }
    if (type !== 'section') return;
    if (value === 'profile') {
      this.setMode('profile');
      this.status('Профиль. Выберите направление.');
    } else if (value === 'projects') {
      this.setMode('projects');
      this.status('Список проектов. Демонстрационные данные.');
    } else {
      this.status('Раздел «Связь» пока не реализован.');
    }
  }

  applyOverride(id: string): void {
    const node = this.nodes.get(id);
    const el = this.elements.get(id);
    if (!node || !el) return;
    const override = this.overrides[id] ?? { visible: true, opacity: 1, x: 0, y: 0 };
    el.hidden = override.visible === false;
    el.style.opacity = String(override.opacity ?? 1);
    const [x1, y1, x2, y2] = node.bounds;
    el.style.transform = `translate(${((override.x || 0) / (x2 - x1)) * 100}%, ${((override.y || 0) / (y2 - y1)) * 100}%)`;
  }

  resetEdits(): void {
    this.overrides = {};
    this.directions = cloneDirections();
    for (const id of this.nodes.keys()) this.applyOverride(id);
  }

  /** Neutral view state: rotor hidden back into the master, LLM raster card. */
  resetView(): void {
    this.angle = 0;
    if (this.rotorEl) {
      this.rotorEl.classList.remove('active');
      this.rotorEl.style.setProperty('--angle', '0deg');
    }
    this.setMode('profile');
    this.selectNode(DEFAULT_DIRECTION, false);
  }

  /** Initial state once all interactive layers are mounted. */
  init(): void {
    this.selectNode(DEFAULT_DIRECTION, false);
  }
}

export const device = new DeviceState();
