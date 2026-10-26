// Game projects preview: a compact map fragment (4×4) with three explorable
// objects. Picking an object explains its role. Full playthrough stays in
// the level-3 demonstration — this is a look, not a game.

import { noteLine, pick, selectOnly } from './index';
import { registerPreview } from './registry';
import type { ProjectPreview } from './types';

type Cell = { row: number; col: number };

const UNIT: Cell = { row: 3, col: 0 };
const OBSTACLES: Cell[] = [
  { row: 2, col: 1 },
  { row: 1, col: 2 },
];
const GOAL: Cell = { row: 0, col: 3 };
const SIZE = 4;

const ROLES = new Map<string, string>([
  ['unit', 'Юнит — фигура под управлением игрока: ходит по соседним клеткам.'],
  ['obstacle', 'Препятствие — клетка, через которую маршрут не проходит.'],
  ['goal', 'Цель — клетка, достижение которой завершает сценарий.'],
]);

export const gamePreview: ProjectPreview = {
  id: 'game',
  mount(root) {
    const layout = document.createElement('div');
    layout.className = 'pv-game-layout';

    const grid = document.createElement('div');
    grid.className = 'pv-game-grid';
    grid.setAttribute('role', 'group');
    grid.setAttribute('aria-label', 'Фрагмент игровой карты: выберите объект, чтобы увидеть его роль');
    const buttons: HTMLButtonElement[] = [];
    for (let row = SIZE - 1; row >= 0; row -= 1) {
      for (let col = 0; col < SIZE; col += 1) {
        const cell = document.createElement('button');
        cell.type = 'button';
        cell.className = 'pv-game-cell';
        const isUnit = row === UNIT.row && col === UNIT.col;
        const isGoal = row === GOAL.row && col === GOAL.col;
        const isObstacle = OBSTACLES.some((o) => o.row === row && o.col === col);
        if (isUnit) {
          cell.classList.add('is-unit');
          cell.textContent = '▲';
          cell.setAttribute('aria-label', 'Юнит');
          buttons.push(cell);
        } else if (isGoal) {
          cell.classList.add('is-goal');
          cell.textContent = '◎';
          cell.setAttribute('aria-label', 'Цель');
          buttons.push(cell);
        } else if (isObstacle) {
          cell.classList.add('is-obstacle');
          cell.textContent = '▨';
          cell.setAttribute('aria-label', 'Препятствие');
          buttons.push(cell);
        } else {
          cell.tabIndex = -1;
          cell.disabled = true;
          cell.setAttribute('aria-hidden', 'true');
        }
        cell.addEventListener('click', () => {
          selectOnly(buttons, cell);
          note.textContent = ROLES.get(isUnit ? 'unit' : isGoal ? 'goal' : 'obstacle') ?? '';
        });
        grid.append(cell);
      }
    }

    const side = document.createElement('div');
    side.className = 'pv-game-side';
    const note = noteLine();
    note.textContent = 'Выберите объект на карте.';
    const hint = pick('Полное прохождение — в демонстрации', 'Подсказка: полное прохождение доступно в демонстрации проекта');
    hint.disabled = true;
    hint.tabIndex = -1;
    side.append(note, hint);

    layout.append(grid, side);
    root.append(layout);
  },
};

registerPreview(gamePreview);
