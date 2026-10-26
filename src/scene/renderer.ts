// Scene renderer — V7 strategy: the static body is ONE continuous master
// image (approved 4K reference). No static fragments are stacked on top.
// Only interactive layers mount: transparent hit-area controls, masked
// moving overlays (button faces, dial rotor) and the live HTML card.
// Highlights (hover/focus/active/selected) are shape-following transparent
// overlays drawn by CSS on the controls — never whole-fragment brightening.

import type { Bounds, SceneFile, SceneNode } from './types';
import { MASKED_FACES, MASTER_ASSET, ROTOR_MASKED, deviceAsset, resolveAsset } from './assets';
import { device } from './state';
import { DEFAULT_DIRECTION } from '../data/demo';
import { CONTACTS } from '../data/contacts';
import { PROJECTS } from '../data/projects';
import { parseScene } from './parse';
import sceneFile from './scene.json';

const REFERENCE_BOUNDS: Bounds = [0, 0, 3840, 2560];
const scene: SceneFile = parseScene(sceneFile);

const SECTION_KEYS = ['profile', 'projects', 'contact'] as const;
const DIRECTION_TREE_IDS = ['node-vision', 'node-llm', 'node-auto', 'node-system'] as const;

export interface SourceFragment {
  id: string;
  name: string;
  asset: string;
  bounds: Bounds;
}

function findNode(id: string): SceneNode | undefined {
  const stack: SceneNode[] = [scene.scene];
  while (stack.length > 0) {
    const current = stack.pop() as SceneNode;
    if (current.id === id) return current;
    stack.push(...current.children);
  }
  return undefined;
}

function place(el: HTMLElement, bounds: Bounds): void {
  const [x, y, x2, y2] = bounds;
  const [rx, ry, rx2, ry2] = REFERENCE_BOUNDS;
  el.style.left = `${((x - rx) / (rx2 - rx)) * 100}%`;
  el.style.top = `${((y - ry) / (ry2 - ry)) * 100}%`;
  el.style.width = `${((x2 - x) / (rx2 - rx)) * 100}%`;
  el.style.height = `${((y2 - y) / (ry2 - ry)) * 100}%`;
}

function createControl(node: SceneNode, className: string, label: string): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `control ${className}`;
  button.setAttribute('aria-label', label);
  button.dataset.action = node.action ?? '';
  place(button, node.bounds);
  return button;
}

/** Mounts the continuous static master — the whole device, no fragments. */
export function mountMaster(container: HTMLElement): void {
  const master = document.createElement('img');
  master.id = 'master';
  master.className = 'master';
  master.src = MASTER_ASSET;
  master.alt = 'SDINC: цельный литой корпус, портрет слева, зелёный дисплей с цифровым двойником справа';
  container.append(master);
}

/**
 * Screen interactivity: four direction nodes, bottom tabs, the open-projects
 * control and the live HTML card (shown for every direction except LLM,
 * whose card stays raster in the master).
 */
export function mountScreenControls(container: HTMLElement): void {
  for (const treeId of DIRECTION_TREE_IDS) {
    const node = findNode(treeId);
    if (!node) throw new Error(`Scene node not found: ${treeId}`);
    const key = treeId.replace('node-', '');
    const control = createControl(node, 'node-control', node.name);
    control.dataset.node = key;
    control.dataset.screen = 'profile';
    control.setAttribute('aria-pressed', String(key === DEFAULT_DIRECTION));
    control.addEventListener('click', () => device.handleAction(`node:${key}`));
    container.append(control);
    device.register(node, control);
  }

  for (const key of SECTION_KEYS) {
    const node = findNode(`tab-${key}`);
    if (!node) throw new Error(`Scene node not found: tab-${key}`);
    const control = createControl(node, 'tab-control', `Вкладка ${key}`);
    control.dataset.action = `section:${key}`;
    control.addEventListener('click', () => device.handleAction(`section:${key}`));
    container.append(control);
    device.register(node, control);
  }

  const openNode = findNode('card-open');
  if (!openNode) throw new Error('Scene node not found: card-open');
  const openControl = createControl(openNode, 'open-control', 'Открыть проекты');
  openControl.dataset.action = 'section:projects';
  openControl.dataset.screen = 'profile';
  openControl.addEventListener('click', () => device.handleAction('section:projects'));
  container.append(openControl);
  device.register(openNode, openControl);

  const cardNode = findNode('card');
  if (!cardNode) throw new Error('Scene node not found: card');
  const live = document.createElement('section');
  live.className = 'live-card';
  live.dataset.id = 'live-card';
  // NOTE: no dataset.screen here — live-card visibility is owned by
  // selectNode (depends on the active direction), not by the display mode.
  live.setAttribute('aria-label', 'Редактируемая карточка направления');
  place(live, cardNode.bounds);
  const title = document.createElement('h2');
  const description = document.createElement('p');
  const demo = document.createElement('small');
  demo.textContent = 'ДЕМОНСТРАЦИОННЫЕ ДАННЫЕ';
  const open = document.createElement('button');
  open.type = 'button';
  open.textContent = 'ПРОЕКТЫ →';
  open.addEventListener('click', () => device.handleAction('section:projects'));
  live.append(title, description, demo, open);
  live.hidden = true;
  container.append(live);
  device.bindLiveCard(live, title, description);
  device.register(cardNode, live);
}

/**
 * Hardware section buttons: transparent hit-areas over the master; the masked
 * face overlay appears only while pressed (pointer), matching the V7 approach.
 */
export function mountSectionControls(container: HTMLElement): void {
  for (const key of SECTION_KEYS) {
    const node = findNode(`button-${key}`);
    if (!node) throw new Error(`Scene node not found: button-${key}`);
    const face = node.children.find((child) => child.kind === 'face');
    if (!face) throw new Error(`Scene node has no face child: button-${key}`);

    const control = createControl(node, 'section-control', node.name);
    control.dataset.action = `section:${key}`;
    control.addEventListener('click', () => device.handleAction(`section:${key}`));
    container.append(control);
    device.register(node, control);

    const moving = document.createElement('div');
    moving.className = 'moving-face';
    moving.dataset.id = `face-${key}`;
    place(moving, face.bounds);
    const img = document.createElement('img');
    img.src = MASKED_FACES[key];
    img.alt = '';
    moving.append(img);
    moving.hidden = true;
    container.append(moving);
    device.register(face, moving);

    control.addEventListener('pointerdown', () => {
      moving.hidden = false;
      moving.classList.add('pressed');
    });
    for (const event of ['pointerup', 'pointerleave', 'pointercancel'] as const) {
      control.addEventListener(event, () => {
        moving.hidden = true;
        moving.classList.remove('pressed');
      });
    }
    control.addEventListener('blur', () => {
      moving.hidden = true;
      moving.classList.remove('pressed');
    });
  }
}

/** Dial: hit-area with keyboard/wheel stepping; masked rotor appears after rotation. */
export function mountDial(container: HTMLElement): void {
  const node = findNode('dial');
  if (!node) throw new Error('Scene node not found: dial');
  const rotorNode = node.children.find((child) => child.kind === 'rotor');
  if (!rotorNode) throw new Error('Scene node has no rotor child: dial');

  const control = createControl(node, 'dial-control', 'Регулятор: щелчок — следующий узел; стрелки — выбор; Enter — подтверждение.');
  control.dataset.action = 'dial';
  control.addEventListener('click', () => device.handleAction('dial'));
  control.addEventListener('keydown', (event) => {
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
      event.preventDefault();
      device.step(['ArrowRight', 'ArrowDown'].includes(event.key) ? 1 : -1);
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      device.confirm();
    }
  });
  let last = 0;
  control.addEventListener(
    'wheel',
    (event) => {
      event.preventDefault();
      if (event.deltaY && performance.now() - last > 150) {
        device.step(event.deltaY > 0 ? 1 : -1);
        last = performance.now();
      }
    },
    { passive: false },
  );
  container.append(control);
  device.register(node, control);

  const rotor = document.createElement('div');
  rotor.className = 'rotor-art';
  rotor.dataset.id = 'dial-rotor';
  place(rotor, rotorNode.bounds);
  const img = document.createElement('img');
  img.src = ROTOR_MASKED;
  img.alt = '';
  rotor.append(img);
  container.append(rotor);
  device.bindRotor(rotor);
  device.register(rotorNode, rotor);
}

/** Reference asset path (master) — for the editor preview. */
export function masterAsset(): string {
  return MASTER_ASSET;
}

// The shared clean display surface: derived from the approved reference
// (mode-specific start content removed, header/tab row/glass kept baked).
// Covers the EXACT screen region so its edges are the same pixels as the
// master underneath — seam-free by construction.
const SCREEN_SURFACE_BOUNDS: Bounds = [1250, 588, 3338, 1942];
// Mode content lives BETWEEN the common baked header and the common baked
// tab row, so it never clips or overlaps them.
const SCREEN_CONTENT_BOUNDS: Bounds = [1250, 588, 3338, 1744];
const SCHEMA_CIRCLES: Array<{ cx: number; cy: number; r: number }> = [
  { cx: 22, cy: 44, r: 16 },
  { cx: 50, cy: 44, r: 18 },
  { cx: 78, cy: 44, r: 16 },
];

function schematicSvg(width: number, height: number, dim: boolean): SVGSVGElement {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 100 62');
  svg.setAttribute('aria-hidden', 'true');
  svg.classList.add('schematic');
  const opacity = dim ? '0.55' : '1';
  let inner = '';
  for (let i = 0; i < SCHEMA_CIRCLES.length - 1; i += 1) {
    const a = SCHEMA_CIRCLES[i];
    const b = SCHEMA_CIRCLES[i + 1];
    inner += `<line x1="${a.cx + a.r}" y1="${a.cy}" x2="${b.cx - b.r}" y2="${b.cy}" stroke="#3f7a52" stroke-width="0.8" stroke-dasharray="2 1.6" opacity="${opacity}"/>`;
  }
  SCHEMA_CIRCLES.forEach((c, i) => {
    inner += `<circle cx="${c.cx}" cy="${c.cy}" r="${c.r}" fill="none" stroke="#4f8f63" stroke-width="1" opacity="${opacity}"/>`;
    inner += `<circle cx="${c.cx}" cy="${c.cy}" r="${c.r - 4.5}" fill="none" stroke="#355f42" stroke-width="0.5" stroke-dasharray="1.6 1.4" opacity="${opacity}"/>`;
    inner += `<text x="${c.cx}" y="${c.cy + 1.6}" text-anchor="middle" font-size="4.4" fill="#83bd99" opacity="${opacity}" font-family="monospace">${i + 1}</text>`;
  });
  svg.innerHTML = inner;
  svg.style.width = `${width}%`;
  svg.style.height = `${height}%`;
  return svg;
}

/**
 * Stage D: the shared clean display surface (screen-surface.png, derived
 * from the approved reference) plus the transparent mode contents
 * (project list / project screen) laid over it. The surface covers the
 * exact screen region — same pixels as the master at its edges — while the
 * baked bottom tab row stays visible and clickable in every mode.
 */
export function mountScreenPanels(container: HTMLElement): void {
  // Shared surface: one display, one glass — only the information changes.
  const surface = document.createElement('img');
  surface.className = 'screen-surface';
  surface.dataset.id = 'screen-surface';
  surface.dataset.screen = 'panel';
  surface.src = deviceAsset('screen-surface.png');
  surface.alt = '';
  surface.draggable = false;
  surface.hidden = true;
  place(surface, SCREEN_SURFACE_BOUNDS);
  container.append(surface);
  device.registerElement('screen-surface', surface);

  // --- projects list + preview (transparent content over the surface) ---
  const projectsView = document.createElement('section');
  projectsView.className = 'projects-view';
  projectsView.dataset.screen = 'projects';
  projectsView.hidden = true;
  projectsView.setAttribute('aria-label', 'Список проектов');
  place(projectsView, SCREEN_CONTENT_BOUNDS);
  const listTitle = document.createElement('h2');
  listTitle.textContent = 'ПРОЕКТЫ';
  const body = document.createElement('div');
  body.className = 'projects-body';
  const list = document.createElement('ul');
  list.className = 'project-list';
  list.setAttribute('role', 'listbox');
  list.setAttribute('aria-label', 'Проекты');
  PROJECTS.forEach((project, index) => {
    const li = document.createElement('li');
    const item = document.createElement('button');
    item.type = 'button';
    item.className = 'project-item';
    item.id = `project-item-${index}`;
    item.dataset.screen = 'projects';
    item.setAttribute('role', 'option');
    item.setAttribute('aria-selected', String(index === 0));
    item.textContent = project.title;
    item.addEventListener('click', () => device.selectProject(index));
    li.append(item);
    list.append(li);
    device.registerElement(`project-item-${index}`, item);
  });
  const preview = document.createElement('div');
  preview.className = 'project-preview';
  preview.append(schematicSvg(100, 42, true));
  const previewTitle = document.createElement('h3');
  previewTitle.id = 'project-preview-title';
  const previewDesc = document.createElement('p');
  previewDesc.id = 'project-preview-desc';
  const openButton = document.createElement('button');
  openButton.type = 'button';
  openButton.className = 'panel-button';
  openButton.id = 'project-open';
  openButton.textContent = 'Открыть →';
  openButton.addEventListener('click', () => device.openSelectedProject());
  preview.append(previewTitle, previewDesc, openButton);
  body.append(list, preview);
  device.registerElement('project-preview-title', previewTitle);
  device.registerElement('project-preview-desc', previewDesc);
  const demoNote = document.createElement('small');
  demoNote.textContent = 'ДЕМОНСТРАЦИОННЫЕ ДАННЫЕ';
  projectsView.append(listTitle, body, demoNote);
  container.append(projectsView);
  device.registerElement('projects-view', projectsView);

  // --- single project screen ---
  const projectView = document.createElement('section');
  projectView.className = 'project-view';
  projectView.dataset.screen = 'project';
  projectView.hidden = true;
  projectView.setAttribute('aria-label', 'Экран проекта');
  const head = document.createElement('header');
  head.className = 'project-head';
  const title = document.createElement('h2');
  title.id = 'project-title';
  title.tabIndex = -1;
  title.textContent = PROJECTS[0].title;
  title.dataset.screen = 'project';
  const backButton = document.createElement('button');
  backButton.type = 'button';
  backButton.className = 'panel-button';
  backButton.id = 'project-back';
  backButton.textContent = '← К списку';
  backButton.addEventListener('click', () => device.handleAction('section:projects'));
  head.append(title, backButton);
  const projectBody = document.createElement('div');
  projectBody.className = 'project-body';
  const schematic = document.createElement('div');
  schematic.className = 'project-schematic';
  schematic.append(schematicSvg(100, 100, false));
  const componentButtons: Array<{ button: HTMLButtonElement; circle: (typeof SCHEMA_CIRCLES)[number] }> = [];
  PROJECTS[0].components.forEach((component, index) => {
    const nodeButton = document.createElement('button');
    nodeButton.type = 'button';
    nodeButton.className = 'control component-control';
    nodeButton.dataset.screen = 'project';
    nodeButton.id = `component-node-${index}`;
    nodeButton.setAttribute('aria-label', `${component.label}: условный компонент системы`);
    nodeButton.setAttribute('aria-pressed', String(index === 0));
    nodeButton.addEventListener('click', () => device.selectComponent(index));
    schematic.append(nodeButton);
    device.registerElement(`component-node-${index}`, nodeButton);
    componentButtons.push({ button: nodeButton, circle: SCHEMA_CIRCLES[index % SCHEMA_CIRCLES.length] });
  });
  // The SVG letterboxes its 100x62 viewBox inside the container (meet), so
  // node buttons must align with the DRAWN area. Geometry is only measurable
  // while the screen is visible — positioning runs via a layout hook.
  const layoutComponentNodes = (): void => {
    const rect = schematic.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    const scale = Math.min(rect.width / 100, rect.height / 62);
    const offsetX = (rect.width - 100 * scale) / 2;
    const offsetY = (rect.height - 62 * scale) / 2;
    for (const { button, circle } of componentButtons) {
      button.style.left = `${((offsetX + (circle.cx - circle.r) * scale) / rect.width) * 100}%`;
      button.style.top = `${((offsetY + (circle.cy - circle.r) * scale) / rect.height) * 100}%`;
      button.style.width = `${((circle.r * 2 * scale) / rect.width) * 100}%`;
      button.style.height = `${((circle.r * 2 * scale) / rect.height) * 100}%`;
    }
  };
  device.addLayoutHook(layoutComponentNodes);
  const side = document.createElement('div');
  side.className = 'project-side';
  const componentInfo = document.createElement('p');
  componentInfo.id = 'component-info';
  componentInfo.className = 'component-info';
  const tabs = document.createElement('div');
  tabs.className = 'project-tabs';
  tabs.setAttribute('role', 'tablist');
  tabs.setAttribute('aria-label', 'Сведения о проекте');
  const tabLabels: Record<string, string> = { task: 'Задача', role: 'Моя роль', result: 'Результат' };
  for (const [key, label] of Object.entries(tabLabels)) {
    const tab = document.createElement('button');
    tab.type = 'button';
    tab.className = 'project-tab';
    tab.id = `project-tab-${key}`;
    tab.dataset.screen = 'project';
    tab.setAttribute('role', 'tab');
    tab.setAttribute('aria-selected', String(key === 'task'));
    tab.textContent = label;
    tab.addEventListener('click', () => device.setProjectTab(key as 'task' | 'role' | 'result'));
    tabs.append(tab);
    device.registerElement(`project-tab-${key}`, tab);
  }
  const tabText = document.createElement('p');
  tabText.id = 'project-tab-text';
  tabText.className = 'project-tab-text';
  tabText.dataset.screen = 'project';
  side.append(componentInfo, tabs, tabText);
  projectBody.append(schematic, side);
  const projectNote = document.createElement('small');
  projectNote.textContent = 'ДЕМОНСТРАЦИОННЫЕ ДАННЫЕ';
  projectView.append(head, projectBody, projectNote);
  place(projectView, SCREEN_CONTENT_BOUNDS);
  container.append(projectView);
  device.registerElement('project-view', projectView);
  device.registerElement('project-title', title);
  device.registerElement('component-info', componentInfo);
  device.registerElement('project-tab-text', tabText);

  // --- contact: real, user-confirmed contacts on the shared surface ---
  // Plain ul/li semantics: a native select button per contact (aria-pressed,
  // exactly one selected), a separate native action link and a separate copy
  // button — no interactive nesting, no listbox roles over mixed content.
  const contactView = document.createElement('section');
  contactView.className = 'contact-view';
  contactView.dataset.screen = 'contact';
  contactView.hidden = true;
  contactView.setAttribute('aria-label', 'Раздел «Связь»');
  const contactTitle = document.createElement('h2');
  contactTitle.id = 'contact-title';
  contactTitle.tabIndex = -1;
  contactTitle.dataset.screen = 'contact';
  contactTitle.textContent = 'СВЯЗЬ';
  const contactList = document.createElement('ul');
  contactList.className = 'contact-list';
  contactList.dataset.screen = 'contact';
  CONTACTS.forEach((contact, index) => {
    const li = document.createElement('li');
    li.className = 'contact-item';
    li.dataset.screen = 'contact';

    const select = document.createElement('button');
    select.type = 'button';
    select.className = 'contact-select';
    select.id = `contact-select-${index}`;
    select.dataset.screen = 'contact';
    select.setAttribute('aria-pressed', String(index === 0));
    select.classList.toggle('selected', index === 0);
    select.setAttribute('aria-label', `Выбрать ${contact.channel}`);
    const channel = document.createElement('span');
    channel.className = 'contact-channel';
    channel.textContent = contact.channel;
    const value = document.createElement('span');
    value.className = 'contact-value';
    value.textContent = contact.display;
    select.append(channel, value);
    select.addEventListener('click', () => device.selectContact(index));

    const actions = document.createElement('div');
    actions.className = 'contact-actions';
    actions.dataset.screen = 'contact';
    const action = document.createElement('a');
    action.className = 'contact-action';
    action.id = `contact-action-${index}`;
    action.dataset.screen = 'contact';
    action.href = contact.href;
    if (contact.external) {
      action.target = '_blank';
      action.rel = 'noopener noreferrer';
    }
    action.setAttribute('aria-label', contact.actionAria);
    action.textContent = contact.actionLabel;
    const copy = document.createElement('button');
    copy.type = 'button';
    copy.className = 'contact-copy';
    copy.id = `contact-copy-${index}`;
    copy.dataset.screen = 'contact';
    copy.setAttribute('aria-label', contact.copyAria);
    copy.textContent = contact.copyLabel;
    copy.addEventListener('click', () => device.requestContactCopy(index));
    actions.append(action, copy);

    li.append(select, actions);
    contactList.append(li);
    device.registerElement(`contact-select-${index}`, select);
    device.registerElement(`contact-action-${index}`, action);
    device.registerElement(`contact-copy-${index}`, copy);
  });
  // Result line: polite live region — announces copy results without moving
  // focus. Empty until the first copy attempt.
  const contactResult = document.createElement('p');
  contactResult.id = 'contact-result';
  contactResult.className = 'contact-result';
  contactResult.dataset.screen = 'contact';
  contactResult.setAttribute('role', 'status');
  contactResult.setAttribute('aria-live', 'polite');
  contactView.append(contactTitle, contactList, contactResult);
  place(contactView, SCREEN_CONTENT_BOUNDS);
  container.append(contactView);
  device.registerElement('contact-view', contactView);
  device.registerElement('contact-title', contactTitle);
  device.registerElement('contact-result', contactResult);
}

/** Editable source library: every tree fragment that owns a raster asset. */
export function sourceFragments(): SourceFragment[] {
  const result: SourceFragment[] = [];
  const stack: SceneNode[] = [scene.scene];
  while (stack.length > 0) {
    const current = stack.pop() as SceneNode;
    if (current.asset) {
      result.push({ id: current.id, name: current.name, asset: current.asset, bounds: current.bounds });
    }
    stack.push(...current.children);
  }
  return result.reverse();
}

/** Resolved public URL for a source-library fragment. */
export function sourceUrl(fragment: SourceFragment): string {
  return resolveAsset(fragment.asset);
}
