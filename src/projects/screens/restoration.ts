// 08. Реставрация видео: сравнение до/после на собственной SVG-сцене.
// Разделитель управляется нативным range и кнопками предустановок;
// синтетический материал честно помечен — это не результат реставрации.

import type { ProjectScreen } from '../types';
import { el, originNote, selectButton, statusLine, markSelected } from '../ui';

interface Area {
  id: string;
  label: string;
  explanation: string;
}

const AREAS: readonly Area[] = [
  {
    id: 'overview',
    label: 'Общий вид',
    explanation: 'Общий вид: левая часть — версия «до» (шум, царапины, пониженный контраст), правая — чистая сцена «после».',
  },
  {
    id: 'edges',
    label: 'Контуры',
    explanation: 'Контуры: у версии «до» границы объектов теряют чёткость; версия «после» сохраняет ровные края фигур.',
  },
  {
    id: 'surface',
    label: 'Поверхность',
    explanation: 'Поверхность: крупный участок внутри круга — в версии «до» он зашумлён, в «после» — ровная заливка.',
  },
];

const SVG_NS = 'http://www.w3.org/2000/svg';

function sceneSvg(dirty: boolean, seed: number): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 200 125');
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  svg.classList.add('dir-rest-svg');
  const bg = document.createElementNS(SVG_NS, 'rect');
  bg.setAttribute('x', '0');
  bg.setAttribute('y', '0');
  bg.setAttribute('width', '200');
  bg.setAttribute('height', '125');
  bg.setAttribute('fill', dirty ? '#22392b' : '#1c3125');
  svg.append(bg);
  // Deterministic "damage" overlay for the before-version only.
  if (dirty) {
    const grain = document.createElementNS(SVG_NS, 'filter');
    grain.setAttribute('id', `dir-rest-noise-${seed}`);
    const turb = document.createElementNS(SVG_NS, 'feTurbulence');
    turb.setAttribute('type', 'fractalNoise');
    turb.setAttribute('baseFrequency', '0.9');
    turb.setAttribute('numOctaves', '2');
    turb.setAttribute('seed', String(seed));
    turb.setAttribute('result', 'n');
    const mix = document.createElementNS(SVG_NS, 'feColorMatrix');
    mix.setAttribute('in', 'n');
    mix.setAttribute('type', 'matrix');
    mix.setAttribute('values', '0 0 0 0 0.62 0 0 0 0 0.72 0 0 0 0 0.66 0 0 0 0.28 0');
    grain.append(turb, mix);
    svg.append(grain);
    const scratches = document.createElementNS(SVG_NS, 'g');
    scratches.setAttribute('stroke', '#8fae97');
    scratches.setAttribute('stroke-width', '0.5');
    scratches.setAttribute('opacity', '0.7');
    for (const [x1, y1, x2, y2] of [
      [24, 0, 18, 125],
      [70, 0, 78, 125],
      [130, 0, 138, 125],
    ] as const) {
      const line = document.createElementNS(SVG_NS, 'line');
      line.setAttribute('x1', String(x1));
      line.setAttribute('y1', String(y1));
      line.setAttribute('x2', String(x2));
      line.setAttribute('y2', String(y2));
      scratches.append(line);
    }
    const haze = document.createElementNS(SVG_NS, 'rect');
    haze.setAttribute('x', '0');
    haze.setAttribute('y', '0');
    haze.setAttribute('width', '200');
    haze.setAttribute('height', '125');
    haze.setAttribute('fill', '#6d8577');
    haze.setAttribute('opacity', '0.18');
    svg.append(grain, scratches, haze);
  }
  // Same geometry in both versions.
  const ground = document.createElementNS(SVG_NS, 'line');
  ground.setAttribute('x1', '10');
  ground.setAttribute('y1', '104');
  ground.setAttribute('x2', '190');
  ground.setAttribute('y2', '104');
  ground.setAttribute('stroke', '#2c4f38');
  ground.setAttribute('stroke-width', '1.4');
  const circle = document.createElementNS(SVG_NS, 'circle');
  circle.setAttribute('cx', '58');
  circle.setAttribute('cy', '72');
  circle.setAttribute('r', '22');
  circle.setAttribute('fill', dirty ? '#31543f' : '#3f7a52');
  circle.setAttribute('stroke', dirty ? '#5c8a6c' : '#a4d7aa');
  circle.setAttribute('stroke-width', '1.6');
  const house = document.createElementNS(SVG_NS, 'path');
  house.setAttribute('d', 'M 120 104 v -30 l 22 -16 l 22 16 v 30 z');
  house.setAttribute('fill', dirty ? '#2a4a37' : '#355f42');
  house.setAttribute('stroke', dirty ? '#5c8a6c' : '#a4d7aa');
  house.setAttribute('stroke-width', '1.6');
  const sun = document.createElementNS(SVG_NS, 'circle');
  sun.setAttribute('cx', '168');
  sun.setAttribute('cy', '26');
  sun.setAttribute('r', '12');
  sun.setAttribute('fill', 'none');
  sun.setAttribute('stroke', '#d3dda5');
  sun.setAttribute('stroke-width', '1.6');
  svg.append(ground, circle, house, sun);
  return svg;
}

export function createRestorationScreen(): ProjectScreen {
  let splitPos = 50;
  let areaId = AREAS[0].id;
  let beforeWrap: HTMLElement | null = null;
  let divider: HTMLElement | null = null;
  let range: HTMLInputElement | null = null;
  let presetButtons: HTMLButtonElement[] = [];
  let areaButtons: HTMLButtonElement[] = [];
  let explanation: HTMLElement | null = null;
  let status: HTMLParagraphElement | null = null;

  const area = (): Area => AREAS.find((a) => a.id === areaId) ?? AREAS[0];

  function sync(): void {
    if (beforeWrap) beforeWrap.style.width = `${splitPos}%`;
    if (divider) divider.style.left = `${splitPos}%`;
    if (range) range.value = String(splitPos);
    markSelected(areaButtons, areaButtons[AREAS.findIndex((a) => a.id === areaId)], 'aria-pressed');
    if (explanation) explanation.textContent = area().explanation;
  }

  function setSplit(value: number, announce: string): void {
    splitPos = Math.max(0, Math.min(100, value));
    sync();
    if (status) status.textContent = announce;
  }

  return {
    id: 'restoration',
    mount(container) {
      const root = el('div', 'dir-screen dir-rest');
      root.dataset.screenId = 'restoration';

      const compare = el('div', 'dir-rest-compare');
      const before = el('div', 'dir-rest-layer dir-rest-before');
      before.append(sceneSvg(true, 7));
      const labelBefore = el('span', 'dir-rest-label', 'До');
      before.append(labelBefore);
      beforeWrap = before;
      const after = el('div', 'dir-rest-layer dir-rest-after');
      after.append(sceneSvg(false, 0));
      after.append(el('span', 'dir-rest-label dir-rest-label-after', 'После'));
      divider = el('div', 'dir-rest-divider');
      compare.append(after, before, divider);
      compare.setAttribute('aria-label', 'Сравнение версий кадра');

      const rangeRow = el('div', 'dir-rest-controls');
      range = el('input', 'dir-rest-range') as HTMLInputElement;
      range.type = 'range';
      range.min = '0';
      range.max = '100';
      range.step = '1';
      range.value = String(splitPos);
      range.setAttribute('aria-label', 'Положение разделителя до/после, проценты');
      range.addEventListener('input', () =>
        setSplit(Number(range?.value ?? 50), `Разделитель: ${splitPos}%.`),
      );
      presetButtons = [
        { v: 0, label: 'До' },
        { v: 50, label: '50/50' },
        { v: 100, label: 'После' },
      ].map((p) =>
        selectButton(p.label, `Разделитель: ${p.label}`, () =>
          setSplit(p.v, `Разделитель установлен: ${p.label} (${p.v}%).`),
        ),
      );
      rangeRow.append(range, ...presetButtons);

      const areaRow = el('div', 'dir-rest-areas');
      areaRow.setAttribute('role', 'group');
      areaRow.setAttribute('aria-label', 'Участок сравнения');
      areaButtons = AREAS.map((a) =>
        selectButton(a.label, `Участок: ${a.label}`, () => {
          areaId = a.id;
          sync();
          if (status) status.textContent = `Участок: ${a.label}. ${a.explanation}`;
        }),
      );
      areaRow.append(...areaButtons);

      explanation = el('p', 'dir-rest-explanation');
      status = statusLine();
      root.append(
        compare,
        rangeRow,
        areaRow,
        explanation,
        status,
        originNote('Синтетическое сравнение интерфейса. Не результат реставрации реального видео.'),
      );
      container.append(root);
      sync();
    },
    enter() {
      sync();
    },
    leave() {},
    step(delta) {
      const idx = AREAS.findIndex((a) => a.id === areaId);
      areaId = AREAS[(idx + delta + AREAS.length) % AREAS.length].id;
      sync();
      if (status) status.textContent = `Участок: ${area().label}.`;
    },
    confirm() {
      areaButtons[AREAS.findIndex((a) => a.id === areaId)]?.focus();
      if (status) status.textContent = area().explanation;
    },
  };
}
