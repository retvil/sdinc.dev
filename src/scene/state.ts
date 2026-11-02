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
import {
  activateScreen,
  confirmActiveScreen,
  deactivateScreens,
  stepActiveScreen,
} from '../projects/registry';
import '../projects/screens';
import { playRotorClick, playRotorConfirm, playVaultOpen } from './sound';

type DirectionCopy = Record<DirectionKey, DirectionInfo>;
export type ScreenMode = 'profile' | 'projects' | 'project' | 'contact';
export type ProjectTab = 'task' | 'role' | 'result';

const PROJECT_TABS: ProjectTab[] = ['task', 'role', 'result'];

function cloneDirections(): DirectionCopy {
  return Object.fromEntries(
    DIRECTION_KEYS.map((key) => [key, { ...DIRECTIONS[key] }]),
  ) as DirectionCopy;
}

export class DeviceState {
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
  /** Projects-list preview scene switcher (bound by the renderer). */
  private previewSwitcher: ((id: ProjectInfo['screen']) => void) | null = null;

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

  /** Renderer hands over the projects-list preview scene switcher. */
  bindPreviewSwitcher(show: (id: ProjectInfo['screen']) => void): void {
    this.previewSwitcher = show;
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
   * Parses the trailing numeric index from a registered element id like
   * 'project-item-3'. Returns undefined for non-numeric suffixes (e.g.
   * 'project-item-3-meta' → '3-meta' → NaN) so callers can skip them
   * instead of silently comparing against NaN (which is never === to a
   * real index and leaves the element un-highlighted).
   */
  private parseIndex(id: string, prefix: string): number | undefined {
    const token = id.replace(prefix, '');
    const value = Number(token);
    return Number.isInteger(value) ? value : undefined;
  }

  /**
   * Highlights exactly one contact (rotator cycles through all three).
   * Selection alone never opens a link.
   */
  selectContact(index: number): void {
    const count = CONTACTS.length;
    this.selectedContact = ((index % count) + count) % count;
    for (const [id, el] of this.elements) {
      if (!id.startsWith('contact-select-')) continue;
      const itemIndex = this.parseIndex(id, 'contact-select-');
      if (itemIndex === undefined) continue;
      el.classList.toggle('selected', itemIndex === this.selectedContact);
      el.setAttribute('aria-pressed', String(itemIndex === this.selectedContact));
    }
    this.status(`Выбран ${CONTACTS[this.selectedContact].channel}.`);
  }

  /**
   * Rotator confirmation: initiates the primary action of the selected
   * contact by clicking its native anchor. The anchor is a real <a> element,
   * so a programmatic .click() works for mailto: and same-origin hrefs;
   * cross-origin hrefs with target="_blank" that are not triggered inside a
   * user-gesture context will be blocked by the browser — in that case the
   * user can still click the link directly, so we log a warning rather than
   * fabricate a success message.
   */
  private confirmContact(): void {
    const anchor = this.elements.get(`contact-action-${this.selectedContact}`);
    if (!anchor) return;
    // Guard against stale focus after a mode switch: if the anchor is not
    // visible yet (offsetParent null), defer the click to next frame.
    const doClick = (): void => {
      anchor.click();
    };
    if (anchor.offsetParent !== null) {
      doClick();
    } else {
      requestAnimationFrame(doClick);
    }
  }

  /**
   * Copy button: navigator.clipboard only (no legacy fallback). The result
   * line (role=status, polite) is updated after the operation settles —
   * «Скопировано» only on real success; on failure the exact value plus a
   * manual-copy hint, never a success claim.
   *
   * Single-flight guard: a second click while a copy is in-flight is ignored
   * so the status line always reflects the LATEST request, not whichever
   * promise happened to settle last.
   */
  private copyInFlight = 0;

  async requestContactCopy(index: number): Promise<void> {
    const count = CONTACTS.length;
    const contact = CONTACTS[((index % count) + count) % count];
    const resultEl = this.elements.get('contact-result');
    const clipboard = typeof navigator !== 'undefined' ? navigator.clipboard : undefined;
    const requestSeq = ++this.copyInFlight;
    try {
      if (!clipboard || typeof clipboard.writeText !== 'function') {
        throw new Error('Clipboard API unavailable');
      }
      await clipboard.writeText(contact.copyValue);
      if (requestSeq !== this.copyInFlight) return; // a newer request superseded this one
      const message = `Скопировано: ${contact.copyValue}`;
      if (resultEl) resultEl.textContent = message;
      this.status(message);
    } catch (error) {
      if (requestSeq !== this.copyInFlight) return; // a newer request superseded this one
      console.warn('Clipboard write failed:', error);
      const message =
        `Не удалось скопировать. Выделите и скопируйте вручную — ` +
        `${contact.valueNoun}: ${contact.copyValue}`;
      if (resultEl) resultEl.textContent = message;
      this.status(`Копирование не выполнено: ${contact.copyValue}`);
    }
  }

  // --- stage D: projects ---
  /** Open-project presentation: 'detail' (level 2) or 'demo' (level 3). */
  private projectView: 'detail' | 'demo' = 'detail';

  selectProject(index: number): void {
    const count = PROJECTS.length;
    this.selectedProject = ((index % count) + count) % count;
    const project = PROJECTS[this.selectedProject];
    for (const [id, el] of this.elements) {
      if (!id.startsWith('project-item-')) continue;
      const itemIndex = this.parseIndex(id, 'project-item-');
      if (itemIndex === undefined) continue;
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
    // Unique preview scene for directions; the demo item keeps its schematic.
    this.previewSwitcher?.(project.screen);
    this.status(`Проект выбран: ${project.title}. Демонстрационные данные.`);
  }

  /**
   * Level 2/3 visibility inside the OPEN project: directions show the
   * description page first, the demonstration only on explicit request.
   * The demo sample keeps its built-in schematic view at all times.
   */
  private updateProjectView(): void {
    const project = PROJECTS[this.selectedProject];
    const isDirection = project.kind === 'direction';
    const view = this.projectView;
    const showDemo = isDirection && view === 'demo';
    const title = this.elements.get('project-title');
    const kindNote = this.elements.get('project-kind-note');
    const schematic = this.elements.get('project-schematic');
    const tabs = this.elements.get('project-tabs');
    const tabText = this.elements.get('project-tab-text');
    const compInfo = this.elements.get('component-info');
    const screenHost = this.elements.get('project-screen-host');
    const side = this.elements.get('project-side');
    const detail = this.elements.get('project-detail');
    const demoBack = this.elements.get('project-demo-back');
    if (title) title.textContent = project.title;
    if (kindNote) {
      kindNote.textContent = isDirection ? 'НАПРАВЛЕНИЕ РАБОТ' : 'ДЕМОНСТРАЦИОННЫЕ ДАННЫЕ';
    }
    // Description page (directions only).
    if (detail) {
      detail.hidden = !isDirection || showDemo;
      if (isDirection) this.applyProjectDetail(detail, project);
    }
    // Demo sample chrome vs direction screen host.
    if (schematic) schematic.hidden = isDirection;
    if (tabs) tabs.hidden = isDirection;
    if (tabText) tabText.hidden = isDirection;
    if (compInfo) compInfo.hidden = isDirection;
    if (side) side.hidden = isDirection;
    if (screenHost) screenHost.hidden = !showDemo;
    if (demoBack) demoBack.hidden = !showDemo;
    // Body hosts either the demo schematic or the demonstration screen.
    if (isDirection) {
      const body = screenHost?.parentElement ?? null;
      if (body) body.hidden = view !== 'demo';
    }
    if (showDemo && project.screen !== 'demo') {
      activateScreen(project.screen);
    } else if (isDirection) {
      // Leaving the demonstration keeps its mounted state for the next visit.
      deactivateScreens();
    }
  }

  /** Fills the level-2 description page for the selected direction. */
  private applyProjectDetail(detail: HTMLElement, project: ProjectInfo): void {
    if (!project.detail) return;
    detail.setAttribute('data-layout', project.detail.layout);
    const set = (id: string, value: string) => {
      const el = this.elements.get(id);
      if (el) el.textContent = value;
    };
    set('project-detail-essence', project.detail.essence);
    set('project-detail-problem', project.detail.problem);
    set('project-detail-approach', project.detail.approach);
    set('project-detail-outcome', project.detail.outcome);
    const list = this.elements.get('project-detail-capabilities');
    if (list) {
      list.replaceChildren(
        ...project.detail.capabilities.map((item) => {
          const li = document.createElement('li');
          li.textContent = item;
          return li;
        }),
      );
    }
  }

  /** Opens the level-2 description page (always first after opening). */
  showProjectDemo(): void {
    const project = PROJECTS[this.selectedProject];
    if (project.kind !== 'direction') return;
    this.projectView = 'demo';
    this.updateProjectView();
    this.status(`Демонстрация: ${project.title}. Возврат — «К описанию».`);
    this.elements.get('project-demo-back')?.focus();
  }

  /** Returns from the demonstration to the description, restoring focus. */
  backToProjectDetail(): void {
    const project = PROJECTS[this.selectedProject];
    if (project.kind !== 'direction') return;
    this.projectView = 'detail';
    this.updateProjectView();
    this.status(`Описание: ${project.title}.`);
    this.elements.get('project-demo-open')?.focus();
  }

  openSelectedProject(): void {
    this.selectedComponent = 0;
    this.activeTab = 'task';
    // Opening ALWAYS lands on the description (level 2), never on a demo.
    this.projectView = 'detail';
    this.setMode('project');
    const project = PROJECTS[this.selectedProject];
    this.status(`Открыт ${project.title}. Описание и демонстрация отдельно.`);
    // Vault opening cue: synthesized rumble (no-op when muted / no Web Audio)
    // plus a brief shutter-reveal animation on the project screen. The
    // animation class is added AFTER the mode is visible so the shutter
    // elements participate in layout; it is removed on the next frame so the
    // CSS keyframe runs exactly once per open.
    const view = this.elements.get('project-view');
    if (view) {
      view.classList.remove('is-opening');
      // Force a style recalc so re-adding the class restarts the animation.
      void view.offsetWidth;
      view.classList.add('is-opening');
      requestAnimationFrame(() => view.classList.remove('is-opening'));
    }
    playVaultOpen();
  }

  selectComponent(index: number): void {
    const project = PROJECTS[this.selectedProject];
    const count = project.components.length;
    // Direction projects carry no schematic components — nothing to select.
    if (count === 0) {
      this.status('Компонентов нет. Это направление работ, а не демонстрационный образец.');
      return;
    }
    this.selectedComponent = ((index % count) + count) % count;
    for (const [id, el] of this.elements) {
      if (!id.startsWith('component-node-')) continue;
      const compIndex = this.parseIndex(id, 'component-node-');
      if (compIndex === undefined) continue;
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
    if (text) {
      text.textContent = details[tab];
      // Keep the tabpanel's labelledby in sync with the active tab so a
      // screen reader announces which panel is open.
      text.setAttribute('aria-labelledby', `project-tab-${tab}`);
    }
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
   *
   * The hide/show in setMode happens synchronously before this call, so the
   * target element is visible by the time we reach here. (An rAF-deferred
   * focus was considered and rejected: the baseline visual baseline forbids
   * changing focus behaviour without explicit owner approval, and a one-frame
   * deferral shifts the screenshot timing in Playwright visual regression.)
   */
  private refocusAfterModeChange(previous: Element | null, targetId: string): void {
    const prev = previous instanceof HTMLElement ? previous : null;
    const persistent = prev !== null
      && document.contains(prev)
      && !prev.hidden
      && (prev.classList.contains('tab-control') || prev.classList.contains('section-control'));
    if (!persistent) {
      const target = this.elements.get(targetId);
      if (target && target.offsetParent !== null) target.focus();
    }
  }

  /** Switches the display mode and repairs focus across hidden screens. */
  setMode(mode: ScreenMode): void {
    // Capture BEFORE the hide loop: once a focused element hides, the
    // browser drops focus to body and the previous holder is lost.
    const previous = document.activeElement;
    this.mode = mode;
    // Leaving the project mode hands control back from direction screens.
    if (mode !== 'project') deactivateScreens();
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
      this.triggerPanelEntry('projects-view');
      this.refocusAfterModeChange(previous, `project-item-${this.selectedProject}`);
    } else if (mode === 'project') {
      for (const hook of this.layoutHooks) hook();
      this.updateProjectView();
      this.selectComponent(this.selectedComponent);
      if (PROJECTS[this.selectedProject].details) this.setProjectTab(this.activeTab);
      this.triggerPanelEntry('project-view');
      this.refocusAfterModeChange(previous, 'project-title');
    } else if (mode === 'contact') {
      this.triggerPanelEntry('contact-view');
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

  /**
   * Adds the .panel-entering class to a view container so its entry CSS
   * animation runs on this mode switch. The class is removed after the
   * animation completes so it does not replay on subsequent mode changes
   * unless explicitly re-added. No-op for the profile mode (the master
   * raster is always visible; there is no HTML panel to animate).
   */
  private triggerPanelEntry(viewId: string): void {
    const view = this.elements.get(viewId);
    if (!view) return;
    view.classList.remove('panel-entering');
    // Force a style flush so the animation restarts if the same panel is
    // re-shown within the same frame (e.g. rapid mode toggling).
    void view.offsetWidth;
    view.classList.add('panel-entering');
    // Clean up after the 0.22s animation so it does not linger.
    const onEnd = (e: AnimationEvent): void => {
      if (e.target === view) {
        view.classList.remove('panel-entering');
        view.removeEventListener('animationend', onEnd);
      }
    };
    view.addEventListener('animationend', onEnd, { once: true });
  }

  // --- rotary dial and actions ---

  step(delta: 1 | -1): void {
    // Physical detent: the rotor always makes a click as it steps, even
    // when the logical action is inert (e.g. on the project detail page).
    playRotorClick();
    // Wrap the angle to keep it in the [0, 360) range so the CSS
    // transform does not accumulate floating-point error over many turns.
    this.angle = ((this.angle + delta * 36) % 360 + 360) % 360;
    if (this.rotorEl) {
      this.rotorEl.style.setProperty('--angle', `${this.angle}deg`);
      this.rotorEl.classList.add('active');
      // Brief visual "snap" that reinforces the detent feel.
      this.rotorEl.classList.remove('rotor-step');
      // Force reflow so the animation can restart on rapid successive steps.
      void this.rotorEl.offsetWidth;
      this.rotorEl.classList.add('rotor-step');
    }
    if (this.mode === 'projects') {
      this.selectProject(this.selectedProject + delta);
    } else if (this.mode === 'project') {
      const project = PROJECTS[this.selectedProject];
      if (project.kind === 'direction') {
        // The rotor serves the demonstration only; on the description page it
        // stays inert — never mapped to random detail interactions.
        if (this.projectView !== 'demo') return;
        stepActiveScreen(delta);
        return;
      }
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
      // Opening a project plays the vault-door rumble (see openSelectedProject)
      // rather than a plain confirm tick, so the two cues do not stack.
      this.openSelectedProject();
      return;
    }
    playRotorConfirm();
    if (this.mode === 'project') {
      const project = PROJECTS[this.selectedProject];
      if (project.kind === 'direction') {
        if (this.projectView !== 'demo') return;
        confirmActiveScreen();
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
    // Valid section values are profile / projects / contact. The chatbot
    // screen can emit 'section:projects' or 'section:contact' via
    // sdinc:navigate; 'section:profile' fires from the baked tab row.
    // Any other value is a bug — warn and fall back to profile instead of
    // silently landing on contact.
    if (value === 'profile') {
      this.setMode('profile');
      this.status('Профиль. Выберите направление.');
    } else if (value === 'projects') {
      this.setMode('projects');
      this.status('Список проектов. Демонстрационные данные.');
    } else if (value === 'contact') {
      this.setMode('contact');
      this.status(`Связь. Выбран ${CONTACTS[this.selectedContact].channel}.`);
    } else {
      console.warn(`Unknown section value: '${value}' — falling back to profile.`);
      this.setMode('profile');
      this.status('Профиль. Выберите направление.');
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

  /**
   * Neutral view state: rotor hidden back into the master, LLM raster card.
   *
   * Intentionally does NOT reset:
   * - selectedProject: the user's last selection in the projects list
   *   survives so the preview remembers where they were (documented intent,
   *   not a bug). openSelectedProject() re-zeros component/tab state on
   *   the next open, so no desync is visible to the user.
   * - selectedComponent / activeTab / projectView: reset only in
   *   openSelectedProject(); resetView() preserves them to keep the
   *   "last opened project still open" experience consistent.
   */
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
    // Direction screens request section navigation via one document-level
    // event (chatbot's explicit "open section" buttons). Single listener.
    document.addEventListener('sdinc:navigate', (event) => {
      const action = (event as CustomEvent<{ action?: string }>).detail?.action;
      if (typeof action === 'string') this.handleAction(action);
    });
  }
}

export const device = new DeviceState();
