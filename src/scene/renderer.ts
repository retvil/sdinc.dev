// Scene renderer — V7 strategy: the static body is ONE continuous master
// image (approved 4K reference). No static fragments are stacked on top.
// Only interactive layers mount: transparent hit-area controls, masked
// moving overlays (button faces, dial rotor) and the live HTML card.
// Highlights (hover/focus/active/selected) are shape-following transparent
// overlays drawn by CSS on the controls — never whole-fragment brightening.

import type { Bounds, SceneFile, SceneNode } from './types';
import { MASKED_FACES, MASTER_ASSET, ROTOR_MASKED, resolveAsset } from './assets';
import { device } from './state';
import { DEFAULT_DIRECTION } from '../data/demo';
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

// Panel covers the ENTIRE inner display area (full screen glass rect minus a
// 2px hair of the dark inner edge), stopping above the baked bottom tab row —
// the boundary passes through empty screen, never through start-content.
const PANEL_BOUNDS: Bounds = [1254, 592, 3334, 1744];
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
 * Stage D: opaque screen panel covering the baked start screen content
 * (profile twin/nodes/card) whenever the display shows the project list or
 * the project screen. Sits inside the screen glass area, above the baked
 * bottom tab row (tabs stay visible and clickable in every mode).
 */
export function mountScreenPanels(container: HTMLElement): void {
  const panel = document.createElement('section');
  panel.className = 'screen-panel';
  panel.dataset.id = 'screen-panel';
  panel.dataset.screen = 'panel';
  panel.hidden = true;
  panel.setAttribute('aria-label', 'Содержимое дисплея');
  place(panel, PANEL_BOUNDS);
  device.registerElement('panel', panel);

  // --- projects list + preview ---
  const projectsView = document.createElement('section');
  projectsView.className = 'projects-view';
  projectsView.dataset.screen = 'projects';
  projectsView.hidden = true;
  projectsView.setAttribute('aria-label', 'Список проектов');
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
  panel.append(projectsView);
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
  panel.append(projectView);
  device.registerElement('project-view', projectView);
  device.registerElement('project-title', title);
  device.registerElement('component-info', componentInfo);
  device.registerElement('project-tab-text', tabText);

  container.append(panel);
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
