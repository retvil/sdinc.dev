// Device state: display mode machine (profile / projects / project / contact),
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
import { CONTACTS } from '../data/contacts';

type DirectionCopy = Record<DirectionKey, DirectionInfo>;
export type ScreenMode = 'profile' | 'projects' | 'project' | 'contact';
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
  /**
   * True only after an EXPLICIT user selection (node click, rotor step,
   * dial confirm). First open and programmatic restores stay neutral:
   * the selected ring returns to the profile only when the user actually
   * chose a direction. Cleared by init/resetView.
   */
  private userSelected = false;
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
  /** «Связь» screen: selected contact, survives mode switches (start: Email). */
  private selectedContact = 0;
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

  /**
   * Sets the active direction. `mark` distinguishes explicit user selection
   * (true: ring + status + userSelected flag) from programmatic sync
   * (false: title/card content only, graphics stay neutral). aria-pressed
   * always follows the active direction.
   */
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
    this.syncLiveCard();
    if (mark) {
      this.userSelected = true;
      this.status(`Выбран ${info.title}. Данные демонстрационные.`);
    }
  }

  // --- stage D: contacts («Связь») ---

  /**
   * Highlights exactly one contact (rotator cycles through all three).
   * Selection alone never opens a link.
   */
  selectContact(index: number): void {
    const count = CONTACTS.length;
    this.selectedContact = ((index % count) + count) % count;
    for (const [id, el] of this.elements) {
      if (!id.startsWith('contact-select-')) continue;
      const itemIndex = Number(id.replace('contact-select-', ''));
      el.classList.toggle('selected', itemIndex === this.selectedContact);
      el.setAttribute('aria-pressed', String(itemIndex === this.selectedContact));
    }
    this.status(`Выбран ${CONTACTS[this.selectedContact].channel}.`);
  }

  /**
   * Rotator confirmation: initiates the primary action of the selected
   * contact by clicking its native anchor inside the user-gesture context
   * (dial click / Enter). The browser and the OS decide how to handle the
   * protocol — the site does not claim any delivery or external-app result.
   */
  private confirmContact(): void {
    this.elements.get(`contact-action-${this.selectedContact}`)?.click();
  }

  /**
   * Copy button: navigator.clipboard only (no legacy fallback). The result
   * line (role=status, polite) is updated after the operation settles —
   «Скопировано» only on real success; on failure the exact value plus a
   * manual-copy hint, never a success claim.
   */
  async requestContactCopy(index: number): Promise<void> {
    const count = CONTACTS.length;
    const contact = CONTACTS[((index % count) + count) % count];
    const resultEl = this.elements.get('contact-result');
    const clipboard = typeof navigator !== 'undefined' ? navigator.clipboard : undefined;
    try {
      if (!clipboard || typeof clipboard.writeText !== 'function') {
        throw new Error('Clipboard API unavailable');
      }
      await clipboard.writeText(contact.copyValue);
      const message = `Скопировано: ${contact.copyValue}`;
      if (resultEl) resultEl.textContent = message;
      this.status(message);
    } catch (error) {
      console.warn('Clipboard write failed:', error);
      const message =
        `Не удалось скопировать. Выделите и скопируйте вручную — ` +
        `${contact.valueNoun}: ${contact.copyValue}`;
      if (resultEl) resultEl.textContent = message;
      this.status(`Копирование не выполнено: ${contact.copyValue}`);
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
    const previewKind = this.elements.get('project-preview-kind');
    if (previewTitle) previewTitle.textContent = project.title;
    if (previewDesc) previewDesc.textContent = project.shortDescription;
    if (previewKind) {
      previewKind.textContent = project.kind === 'direction' ? 'НАПРАВЛЕНИЕ РАБОТ' : 'ДЕМОНСТРАЦИОННЫЕ ДАННЫЕ';
    }
    this.status(`Проект выбран: ${project.title}. Демонстрационные данные.`);
  }

  /**
   * Fills the OPEN project screen for the selected item. Direction projects
   * show their description and an honesty marker; schematic components and
   * task/role/result tabs exist only for the demonstrational sample.
   */
  private updateProjectScreen(): void {
    const project = PROJECTS[this.selectedProject];
    const isDirection = project.kind === 'direction';
    const title = this.elements.get('project-title');
    const desc = this.elements.get('project-desc');
    const kindNote = this.elements.get('project-kind-note');
    const schematic = this.elements.get('project-schematic');
    const tabs = this.elements.get('project-tabs');
    const tabText = this.elements.get('project-tab-text');
    const compInfo = this.elements.get('component-info');
    if (title) title.textContent = project.title;
    if (desc) {
      desc.textContent = project.shortDescription;
      desc.hidden = !isDirection;
    }
    if (kindNote) {
      kindNote.textContent = isDirection ? 'НАПРАВЛЕНИЕ РАБОТ' : 'ДЕМОНСТРАЦИОННЫЕ ДАННЫЕ';
    }
    if (schematic) schematic.hidden = isDirection;
    if (tabs) tabs.hidden = isDirection;
    if (tabText) tabText.hidden = isDirection;
    if (compInfo) compInfo.hidden = isDirection;
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
    // Direction projects carry no schematic components — nothing to select.
    if (count === 0) return;
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
    const project = PROJECTS[this.selectedProject];
    // Only the demo sample carries task/role/result materials.
    const details = project.details;
    if (!details) return;
    this.activeTab = tab;
    for (const t of PROJECT_TABS) {
      const button = this.elements.get(`project-tab-${t}`);
      if (!button) continue;
      button.setAttribute('aria-selected', String(t === tab));
      button.classList.toggle('active-tab', t === tab);
    }
    const text = this.elements.get('project-tab-text');
    if (text) text.textContent = details[tab];
    // Switching tabs must not reset the selected component — separate state.
  }

  /**
   * SINGLE visibility rule for the direction live card: it belongs to the
   * profile mode only, and follows the raster/live rule (hidden for LLM,
   * whose card is baked in the master). No other code path may show/hide it.
   */
  private syncLiveCard(): void {
    if (this.liveCardEl) this.liveCardEl.hidden = !(this.mode === 'profile' && this.active !== 'llm');
  }

  /**
   * Focus after a mode switch. If the trigger control is persistent chrome
   * (baked tab row / physical section buttons — visible in every mode),
   * focus stays on it. Otherwise the trigger hid together with its screen,
   * so focus moves to a suitable element of the new screen — never left on
   * body, so keyboard navigation has a clear next step.
   */
  private refocusAfterModeChange(previous: Element | null, targetId: string): void {
    const prev = previous instanceof HTMLElement ? previous : null;
    const persistent = prev !== null
      && document.contains(prev)
      && !prev.hidden
      && (prev.classList.contains('tab-control') || prev.classList.contains('section-control'));
    if (!persistent) this.elements.get(targetId)?.focus();
  }

  /** Switches the display mode and repairs focus across hidden screens. */
  setMode(mode: ScreenMode): void {
    // Capture BEFORE the hide loop: once a focused element hides, the
    // browser drops focus to body and the previous holder is lost.
    const previous = document.activeElement;
    this.mode = mode;
    for (const el of this.elements.values()) {
      const screen = el.dataset.screen;
      if (!screen) continue;
      if (screen === 'profile') el.hidden = mode !== 'profile';
      else if (screen === 'panel') el.hidden = mode === 'profile';
      else if (screen === 'projects') el.hidden = mode !== 'projects';
      else if (screen === 'project') el.hidden = mode !== 'project';
      else if (screen === 'contact') el.hidden = mode !== 'contact';
    }
    if (mode === 'projects') {
      this.selectProject(this.selectedProject);
      this.refocusAfterModeChange(previous, `project-item-${this.selectedProject}`);
    } else if (mode === 'project') {
      for (const hook of this.layoutHooks) hook();
      this.updateProjectScreen();
      this.selectComponent(this.selectedComponent);
      if (PROJECTS[this.selectedProject].details) this.setProjectTab(this.activeTab);
      this.refocusAfterModeChange(previous, 'project-title');
    } else if (mode === 'contact') {
      this.refocusAfterModeChange(previous, `contact-select-${this.selectedContact}`);
    } else {
      // profile: direction-owned visuals return with the ring ONLY if the
      // user explicitly selected a node (first open stays neutral). Focus:
      // a persistent trigger keeps it; anything else lands on the selected
      // node control — a clear keyboard continuation, never body.
      this.selectNode(this.active, this.userSelected);
      this.refocusAfterModeChange(previous, `node-${this.active}`);
    }
    this.syncLiveCard();
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
    } else if (this.mode === 'contact') {
      this.selectContact(this.selectedContact + delta);
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
      if (project.components.length === 0) {
        this.status(`Направление работ: ${project.title}.`);
        return;
      }
      const component = project.components[this.selectedComponent];
      this.status(`Компонент ${component.label}. ${component.description}`);
    } else if (this.mode === 'contact') {
      this.confirmContact();
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
      this.setMode('contact');
      this.status(`Связь. Выбран ${CONTACTS[this.selectedContact].channel}.`);
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
    // Back to the neutral first-open state: the user-selection flag clears
    // BEFORE setMode so the profile returns without the selected ring.
    this.userSelected = false;
    this.selectedContact = 0;
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
    this.userSelected = false;
    this.selectNode(DEFAULT_DIRECTION, false);
  }
}

export const device = new DeviceState();
