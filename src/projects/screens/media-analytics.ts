// 01. Видео- и аудиоаналитика: две связанные дорожки на общей шкале,
// выбор события, переключатель акцента. Синтетический фиксированный
// пример — никаких случайных сигналов, метрик и доступа к устройствам.

import type { ProjectScreen } from '../types';
import { el, originNote, selectButton, statusLine, markSelected } from '../ui';

interface MediaEvent {
  id: string;
  time: string;
  /** Position on the shared timeline, percent of the clip length. */
  pos: number;
  type: string;
  video: boolean;
  audio: boolean;
  description: string;
}

const EVENTS: readonly MediaEvent[] = [
  {
    id: 'ev-appear',
    time: '00:00.4',
    pos: 8,
    type: 'Появление объекта',
    video: true,
    audio: false,
    description:
      'В кадре появляется первый объект условной сцены. Аудиодорожка на этой отметке тихая: отмечено только видео.',
  },
  {
    id: 'ev-move',
    time: '00:02.1',
    pos: 34,
    type: 'Перемещение',
    video: true,
    audio: false,
    description:
      'Объект смещается по сцене во вторую позицию. Звуковых отметок нет — событие чисто визуальное.',
  },
  {
    id: 'ev-impulse',
    time: '00:03.6',
    pos: 58,
    type: 'Звуковой импульс',
    video: false,
    audio: true,
    description:
      'Короткий звуковой импульс. Видеодорожка событий здесь не отмечает: сцена не меняется.',
  },
  {
    id: 'ev-joint',
    time: '00:05.2',
    pos: 84,
    type: 'Совместный момент',
    video: true,
    audio: true,
    description:
      'Объект движется одновременно со звуковым сигналом: отметка стоит на обеих дорожках.',
  },
];

type Emphasis = 'video' | 'audio' | 'both';
const EMPHASIS_LABELS: ReadonlyArray<{ id: Emphasis; label: string }> = [
  { id: 'video', label: 'Видео' },
  { id: 'audio', label: 'Аудио' },
  { id: 'both', label: 'Вместе' },
];

export function createMediaAnalyticsScreen(): ProjectScreen {
  let selectedEventId = EVENTS[0].id;
  let emphasis: Emphasis = 'both';
  let host: HTMLElement | null = null;
  let sceneObjects: SVGGElement | null = null;
  let audioWaves: SVGGElement | null = null;
  let eventButtons: HTMLButtonElement[] = [];
  let videoMarkers: HTMLButtonElement[] = [];
  let audioMarkers: HTMLButtonElement[] = [];
  let descTitle: HTMLElement | null = null;
  let descText: HTMLElement | null = null;
  let status: HTMLParagraphElement | null = null;
  let emphasisButtons: HTMLButtonElement[] = [];

  const event = (): MediaEvent => EVENTS.find((e) => e.id === selectedEventId) ?? EVENTS[0];

  function syncScene(): void {
    if (!sceneObjects || !audioWaves) return;
    const ev = event();
    const idx = EVENTS.indexOf(ev);
    // Deterministic scene reaction: object highlighted for appear/move,
    // sound arcs for the impulse, both highlighted for the joint moment.
    sceneObjects.style.opacity = ev.video ? '1' : '0.45';
    sceneObjects.style.transform = idx === 1 ? 'translateX(26px)' : 'translateX(0)';
    sceneObjects.style.transition = 'opacity 0.2s, transform 0.2s';
    audioWaves.style.opacity = ev.audio ? '1' : '0.35';
  }

  function syncMarkers(): void {
    const ev = event();
    for (const m of videoMarkers) {
      const e = EVENTS[Number(m.dataset.eventIndex)];
      m.style.opacity = emphasis === 'both' ? (e.video ? '1' : '0.3') : e.video ? '1' : '0.18';
      m.classList.toggle('active', e.id === ev.id && e.video);
    }
    for (const m of audioMarkers) {
      const e = EVENTS[Number(m.dataset.eventIndex)];
      m.style.opacity = emphasis === 'both' ? (e.audio ? '1' : '0.3') : e.audio ? '1' : '0.18';
      m.classList.toggle('active', e.id === ev.id && e.audio);
    }
  }

  function syncDescription(): void {
    const ev = event();
    if (descTitle) descTitle.textContent = `${ev.type} · ${ev.time}`;
    if (descText) descText.textContent = ev.description;
  }

  function sync(): void {
    const ev = event();
    markSelected(eventButtons, eventButtons[EVENTS.indexOf(ev)], 'aria-pressed');
    markSelected(
      emphasisButtons,
      emphasisButtons[EMPHASIS_LABELS.findIndex((x) => x.id === emphasis)],
      'aria-pressed',
    );
    syncScene();
    syncMarkers();
    syncDescription();
  }

  function selectEvent(id: string, announce: string): void {
    selectedEventId = id;
    sync();
    if (status) status.textContent = announce;
  }

  return {
    id: 'media-analytics',
    mount(container) {
      host = container;
      const root = el('div', 'dir-screen dir-media');
      root.dataset.screenId = 'media-analytics';
      const layout = el('div', 'dir-media-layout');

      // Left column: synthetic scene, tracks, emphasis switcher.
      const left = el('div', 'dir-media-left');

      const scene = el('div', 'dir-media-scene');
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('viewBox', '0 0 200 90');
      svg.setAttribute('aria-hidden', 'true');
      svg.classList.add('dir-media-svg');
      const frame = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      frame.setAttribute('x', '2');
      frame.setAttribute('y', '2');
      frame.setAttribute('width', '196');
      frame.setAttribute('height', '86');
      frame.setAttribute('fill', 'none');
      frame.setAttribute('stroke', '#355f42');
      sceneObjects = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      const ground = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      ground.setAttribute('x1', '10');
      ground.setAttribute('y1', '76');
      ground.setAttribute('x2', '190');
      ground.setAttribute('y2', '76');
      ground.setAttribute('stroke', '#2c4f38');
      const square = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      square.setAttribute('x', '30');
      square.setAttribute('y', '52');
      square.setAttribute('width', '18');
      square.setAttribute('height', '24');
      square.setAttribute('fill', '#3f7a52');
      square.setAttribute('stroke', '#a4d7aa');
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx', '150');
      circle.setAttribute('cy', '64');
      circle.setAttribute('r', '10');
      circle.setAttribute('fill', 'none');
      circle.setAttribute('stroke', '#83bd99');
      sceneObjects.append(ground, square, circle);
      audioWaves = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      for (let i = 0; i < 3; i += 1) {
        const arc = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        const r = 8 + i * 7;
        arc.setAttribute('d', `M 118 64 q ${r} -12 ${r * 2} 0`);
        arc.setAttribute('fill', 'none');
        arc.setAttribute('stroke', '#d3dda5');
        arc.setAttribute('stroke-width', '1.2');
        audioWaves.append(arc);
      }
      svg.append(frame, sceneObjects, audioWaves);
      scene.append(svg);

      const tracks = el('div', 'dir-media-tracks');
      const buildTrack = (
        label: string,
        cls: string,
        key: 'video' | 'audio',
        store: HTMLButtonElement[],
      ): HTMLElement => {
        const row = el('div', `dir-media-track ${cls}`);
        const name = el('span', 'dir-media-track-label', label);
        const line = el('div', 'dir-media-track-line');
        EVENTS.forEach((e, index) => {
          if (!e[key]) return;
          const marker = el('button', 'dir-media-marker') as HTMLButtonElement;
          marker.type = 'button';
          marker.style.left = `${e.pos}%`;
          marker.dataset.eventIndex = String(index);
          marker.setAttribute('aria-label', `${label}: ${e.type}, ${e.time}`);
          marker.addEventListener('click', () => selectEvent(e.id, `Выбрано событие: ${e.type} (${e.time}).`));
          line.append(marker);
          store.push(marker);
        });
        row.append(name, line);
        return row;
      };
      tracks.append(buildTrack('Видео', 'dir-media-track-video', 'video', videoMarkers));
      tracks.append(buildTrack('Аудио', 'dir-media-track-audio', 'audio', audioMarkers));

      const emphasisRow = el('div', 'dir-media-emphasis');
      emphasisRow.setAttribute('role', 'group');
      emphasisRow.setAttribute('aria-label', 'Акцент дорожек');
      emphasisButtons = EMPHASIS_LABELS.map((x) =>
        selectButton(x.label, `Акцент: ${x.label}`, () => {
          emphasis = x.id;
          sync();
          if (status) status.textContent = `Акцент дорожек: ${x.label}. Выбранное событие сохранено.`;
        }),
      );
      emphasisRow.append(...emphasisButtons);

      status = statusLine();
      left.append(
        scene,
        tracks,
        emphasisRow,
        status,
        originNote('Синтетический пример разметки. Автоматический анализ здесь не выполняется.'),
      );

      // Right column: event list (keyboard/rotor path) and description.
      const right = el('div', 'dir-media-right');
      const listTitle = el('h4', 'dir-subtitle', 'События фрагмента');
      const list = el('div', 'dir-media-events');
      list.setAttribute('role', 'group');
      list.setAttribute('aria-label', 'События фрагмента');
      eventButtons = EVENTS.map((e) =>
        selectButton(`${e.time} — ${e.type}`, `Событие ${e.type}, время ${e.time}`, () =>
          selectEvent(e.id, `Выбрано событие: ${e.type} (${e.time}).`),
        ),
      );
      list.append(...eventButtons);
      const desc = el('div', 'dir-media-desc');
      descTitle = el('h4', 'dir-media-desc-title');
      descText = el('p', 'dir-media-desc-text');
      desc.append(descTitle, descText);
      right.append(listTitle, list, desc);

      layout.append(left, right);
      root.append(layout);
      container.append(root);
      sync();
    },
    enter() {
      sync();
    },
    leave() {},
    step(delta) {
      const idx = EVENTS.findIndex((e) => e.id === selectedEventId);
      selectEvent(
        EVENTS[(idx + delta + EVENTS.length) % EVENTS.length].id,
        `Событие: ${event().type} (${event().time}).`,
      );
    },
    confirm() {
      // Reveal/focus the explanation — no playback, no mode change.
      eventButtons[EVENTS.indexOf(event())]?.focus();
      if (status) status.textContent = `Пояснение: ${event().description}`;
    },
  };
}
