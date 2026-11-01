// 02. Игровые проекты: маленький тактический прототип 5×5 на существующем
// дисплее. Один Tab-вход, стрелки двигают ВЫБОР соседа, Enter/Space — ход.
// Детерминированная карта, локальная демонстрация, без сети и таймеров.

import type { ProjectScreen } from '../types';
import { el, originNote, statusLine } from '../ui';

const SIZE = 5;
/** Deterministic obstacles (x, y) — target is reachable around them. */
const OBSTACLES: ReadonlyArray<readonly [number, number]> = [
  [1, 1],
  [2, 1],
  [3, 3],
  [1, 3],
];
const START: readonly [number, number] = [0, 4];
const GOAL: readonly [number, number] = [4, 0];

const DIRS: ReadonlyArray<{ dx: number; dy: number; label: string }> = [
  { dx: 0, dy: -1, label: 'вверх' },
  { dx: 1, dy: 0, label: 'вправо' },
  { dx: 0, dy: 1, label: 'вниз' },
  { dx: -1, dy: 0, label: 'влево' },
];

function isObstacle(x: number, y: number): boolean {
  return OBSTACLES.some(([ox, oy]) => ox === x && oy === y);
}

function inside(x: number, y: number): boolean {
  return x >= 0 && x < SIZE && y >= 0 && y < SIZE;
}

function free(x: number, y: number): boolean {
  return inside(x, y) && !isObstacle(x, y);
}

export function createGameScreen(): ProjectScreen {
  let pos: [number, number] = [...START];
  /** Selected move direction among the four neighbors (rotor/keys pick it). */
  let selectedDir = 0;
  let won = false;
  let status: HTMLParagraphElement | null = null;
  let info: HTMLElement | null = null;
  let fieldSvg: SVGSVGElement | null = null;
  let marker: SVGCircleElement | null = null;
  let ghost: SVGRectElement | null = null;
  let buttons: HTMLButtonElement[] = [];

  const CELL = 34;
  const PAD = 3;

  function neighbor(): { x: number; y: number } | null {
    const d = DIRS[selectedDir];
    const x = pos[0] + d.dx;
    const y = pos[1] + d.dy;
    return { x, y };
  }

  function syncField(): void {
    if (!fieldSvg) return;
    const n = neighbor();
    if (ghost && n) {
      const ok = free(n.x, n.y) && !won;
      ghost.setAttribute('x', String(PAD + n.x * CELL + 8));
      ghost.setAttribute('y', String(PAD + n.y * CELL + 8));
      ghost.setAttribute('width', '18');
      ghost.setAttribute('height', '18');
      ghost.setAttribute('fill', ok ? 'none' : 'rgba(180, 90, 90, 0.25)');
      ghost.setAttribute('stroke', ok ? '#d3dda5' : '#b45a5a');
      ghost.setAttribute('stroke-dasharray', '3 2');
      ghost.style.opacity = inside(n.x, n.y) ? '1' : '0';
    }
    if (marker) {
      marker.setAttribute('cx', String(PAD + pos[0] * CELL + CELL / 2));
      marker.setAttribute('cy', String(PAD + pos[1] * CELL + CELL / 2));
      marker.setAttribute('fill', won ? '#d3dda5' : '#a4d7aa');
    }
    for (const b of buttons) {
      const [x, y] = (b.dataset.cell ?? '0:0').split(':').map(Number);
      b.classList.toggle('selected', n !== null && n.x === x && n.y === y);
    }
  }

  function syncInfo(): void {
    if (!info) return;
    const n = neighbor();
    const d = DIRS[selectedDir];
    if (won) {
      info.textContent = `Цель достигнута. Позиция: ${pos[0]}, ${pos[1]}. Сброс вернёт прототип к старту.`;
      return;
    }
    if (!n || !inside(n.x, n.y)) {
      info.textContent = `Выбрано направление: ${d.label} — за границей поля. Выберите соседнюю клетку внутри поля.`;
      return;
    }
    const blocked = isObstacle(n.x, n.y);
    info.textContent =
      `Выбрана клетка ${n.x}, ${n.y} (${d.label} от маркера): ` +
      (blocked ? 'заблокирована препятствием.' : 'свободна — подтверждение выполнит ход.');
  }

  function sync(): void {
    syncField();
    syncInfo();
  }

  function announce(text: string): void {
    if (status) status.textContent = text;
  }

  function tryMove(): void {
    if (won) {
      announce('Цель уже достигнута. Нажмите «Начать заново», чтобы пройти маршрут снова.');
      return;
    }
    const n = neighbor();
    const d = DIRS[selectedDir];
    if (!n || !inside(n.x, n.y)) {
      announce(`Ход невозможен: направление «${d.label}» ведёт за границу поля. Маркер не двигался.`);
      sync();
      return;
    }
    if (isObstacle(n.x, n.y)) {
      announce(`Ход невозможен: клетка ${n.x}, ${n.y} занята препятствием. Маркер не двигался.`);
      sync();
      return;
    }
    pos = [n.x, n.y];
    if (pos[0] === GOAL[0] && pos[1] === GOAL[1]) {
      won = true;
      announce('Цель достигнута! Маршрут завершён. «Начать заново» вернёт прототип к старту.');
    } else {
      announce(`Маркер передвинут на клетку ${pos[0]}, ${pos[1]}.`);
    }
    sync();
  }

  function pickCell(x: number, y: number): void {
    if (won) {
      announce('Маршрут завершён. «Начать заново» вернёт прототип к старту.');
      return;
    }
    const dx = x - pos[0];
    const dy = y - pos[1];
    const dirIdx = DIRS.findIndex((d) => d.dx === dx && d.dy === dy);
    if (dirIdx >= 0) {
      // Neighbor: select it; a second activation on the selected cell moves.
      if (selectedDir === dirIdx) {
        tryMove();
        return;
      }
      selectedDir = dirIdx;
      sync();
      announce(`Выбрана клетка ${x}, ${y}: ${free(x, y) ? 'свободна' : 'заблокирована'}. Повторное подтверждение — ход.`);
      return;
    }
    announce(`Клетка ${x}, ${y}: ${inside(x, y) ? (isObstacle(x, y) ? 'препятствие' : 'свободна') : 'вне поля'}. Ход возможен только на соседнюю по стороне свободную клетку.`);
    sync();
  }

  return {
    id: 'game',
    mount(container) {
      const root = el('div', 'dir-screen dir-game');
      root.dataset.screenId = 'game';
      const layout = el('div', 'dir-game-layout');

      // Field: single Tab-entry button; arrows pick the neighbor, Enter moves.
      const left = el('div', 'dir-game-left');
      const fieldButton = el('button', 'dir-game-field') as HTMLButtonElement;
      fieldButton.type = 'button';
      fieldButton.setAttribute('aria-label', 'Тактическая сетка 5 на 5. Стрелки — выбор соседней клетки, Enter — ход.');
      fieldSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      fieldSvg.setAttribute('viewBox', `0 0 ${SIZE * CELL + PAD * 2} ${SIZE * CELL + PAD * 2}`);
      fieldSvg.classList.add('dir-game-svg');
      for (let y = 0; y < SIZE; y += 1) {
        for (let x = 0; x < SIZE; x += 1) {
          const cell = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
          cell.setAttribute('x', String(PAD + x * CELL));
          cell.setAttribute('y', String(PAD + y * CELL));
          cell.setAttribute('width', String(CELL - 2));
          cell.setAttribute('height', String(CELL - 2));
          cell.setAttribute('rx', '3');
          cell.setAttribute('fill', isObstacle(x, y) ? '#2c4f38' : 'rgba(53, 95, 66, 0.14)');
          cell.setAttribute('stroke', '#355f42');
          fieldSvg.append(cell);
        }
      }
      // Goal marker
      const goal = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      goal.setAttribute('x', String(PAD + GOAL[0] * CELL + 8));
      goal.setAttribute('y', String(PAD + GOAL[1] * CELL + 8));
      goal.setAttribute('width', '18');
      goal.setAttribute('height', '18');
      goal.setAttribute('rx', '3');
      goal.setAttribute('fill', 'none');
      goal.setAttribute('stroke', '#d3dda5');
      goal.setAttribute('stroke-dasharray', '4 2');
      fieldSvg.append(goal);
      ghost = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      fieldSvg.append(ghost);
      marker = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      marker.setAttribute('r', '8');
      fieldSvg.append(marker);
      fieldButton.append(fieldSvg);
      // Arrows pick a neighbor; Enter/Space confirm the move. Keys are bound
      // to the focused field button only — no global interception.
      fieldButton.addEventListener('keydown', (event) => {
        const arrows: Record<string, number> = {
          ArrowUp: 0,
          ArrowRight: 1,
          ArrowDown: 2,
          ArrowLeft: 3,
        };
        if (event.key in arrows) {
          event.preventDefault();
          selectedDir = arrows[event.key];
          sync();
          announce(`Направление: ${DIRS[selectedDir].label}. ${info?.textContent ?? ''}`);
        } else if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          tryMove();
        }
      });
      // Clicking a cell: select it, second click on the selected one moves.
      fieldSvg.addEventListener('click', (event) => {
        const svg = fieldSvg;
        if (!svg) return;
        const rect = svg.getBoundingClientRect();
        const px = ((event.clientX - rect.left) / rect.width) * (SIZE * CELL + PAD * 2);
        const py = ((event.clientY - rect.top) / rect.height) * (SIZE * CELL + PAD * 2);
        const x = Math.floor((px - PAD) / CELL);
        const y = Math.floor((py - PAD) / CELL);
        if (inside(x, y)) pickCell(x, y);
      });
      left.append(fieldButton);

      const reset = el('button', 'panel-button dir-game-reset') as HTMLButtonElement;
      reset.type = 'button';
      reset.textContent = 'Начать заново';
      reset.setAttribute('aria-label', 'Начать заново: сброс локальной демонстрации маршрута');
      reset.addEventListener('click', () => {
        pos = [...START];
        won = false;
        selectedDir = 0;
        sync();
        announce('Прототип сброшен к старту. Маркер на исходной позиции.');
      });
      left.append(reset);

      // Right column: legend, rules, selection info, status.
      const right = el('div', 'dir-game-right');
      const legendTitle = el('h4', 'dir-subtitle', 'Легенда');
      const legend = el('ul', 'dir-game-legend');
      for (const item of [
        'Штрих-пунктир — цель маршрута.',
        'Тёмные клетки — препятствия.',
        'Круг — маркер, пунктирный квадрат — выбранная соседняя клетка.',
      ]) {
        legend.append(el('li', undefined, item));
      }
      const rules = el('p', 'dir-game-rules', 'Перемещайтесь по соседним свободным клеткам и достигните цели.');
      info = el('p', 'dir-game-info');
      status = statusLine();
      right.append(legendTitle, legend, rules, info, status, originNote('Локальный интерактивный прототип для портфолио.'));

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
      // Rotor steps cycle the four neighbor directions, blocked ones included
      // (they get an explicit explanation in the info line).
      selectedDir = (selectedDir + delta + DIRS.length) % DIRS.length;
      sync();
      announce(`Направление: ${DIRS[selectedDir].label}.`);
    },
    confirm() {
      tryMove();
    },
  };
}
