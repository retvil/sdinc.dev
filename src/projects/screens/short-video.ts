// 07. Автоматизация коротких видео: шесть выбираемых стадий конвейера
// (двухрядная схема с однозначным порядком) и паспорт стадии.
// Концептуальная схема — обработка и публикация здесь не запускаются.

import type { ProjectScreen } from '../types';
import { el, originNote, selectButton, statusLine, markSelected } from '../ui';

interface Stage {
  id: string;
  title: string;
  purpose: string;
  input: string;
  output: string;
}

const STAGES: readonly Stage[] = [
  {
    id: 'source',
    title: 'Исходник',
    purpose: 'Подготовить исходный материал',
    input: 'Исходное видео',
    output: 'Материал для дальнейшей обработки',
  },
  {
    id: 'clips',
    title: 'Фрагменты',
    purpose: 'Выделить короткие части',
    input: 'Исходный материал',
    output: 'Набор выбранных фрагментов',
  },
  {
    id: 'edit',
    title: 'Монтаж',
    purpose: 'Собрать короткий ролик',
    input: 'Выбранные фрагменты',
    output: 'Смонтированный короткий ролик',
  },
  {
    id: 'translate',
    title: 'Перевод',
    purpose: 'Подготовить текст на целевом языке',
    input: 'Текст ролика',
    output: 'Переведённый текст',
  },
  {
    id: 'dubbing',
    title: 'Дубляж',
    purpose: 'Подготовить озвученную версию',
    input: 'Ролик и перевод',
    output: 'Локализованная версия',
  },
  {
    id: 'publish',
    title: 'Публикация',
    purpose: 'Передать результат в процесс размещения',
    input: 'Готовая версия',
    output: 'Материал для автопубликации',
  },
];

export function createShortVideoScreen(): ProjectScreen {
  let selectedId = STAGES[0].id;
  let stageButtons: HTMLButtonElement[] = [];
  let stageName: HTMLElement | null = null;
  let purpose: HTMLElement | null = null;
  let input: HTMLElement | null = null;
  let output: HTMLElement | null = null;
  let status: HTMLParagraphElement | null = null;

  const stage = (): Stage => STAGES.find((s) => s.id === selectedId) ?? STAGES[0];

  function sync(): void {
    const s = stage();
    const idx = STAGES.indexOf(s);
    markSelected(stageButtons, stageButtons[idx], 'aria-pressed');
    // Highlight related neighbor stages (input source / output destination).
    for (const [i, b] of stageButtons.entries()) {
      b.classList.toggle('related', Math.abs(i - idx) === 1);
    }
    if (stageName) stageName.textContent = s.title;
    if (purpose) purpose.textContent = s.purpose;
    if (input) input.textContent = s.input;
    if (output) output.textContent = s.output;
  }

  function pick(id: string, announce: string): void {
    selectedId = id;
    sync();
    if (status) status.textContent = announce;
  }

  function buildStageButton(s: Stage, index: number): HTMLButtonElement {
    const b = selectButton(s.title, `Стадия: ${s.title}`, () =>
      pick(s.id, `Стадия: ${s.title}. Вход: ${s.input}. Результат: ${s.output}.`),
    );
    b.dataset.stageIndex = String(index);
    return b;
  }

  return {
    id: 'short-video',
    mount(container) {
      const root = el('div', 'dir-screen dir-pipeline');
      root.dataset.screenId = 'short-video';

      const claim = el('p', 'dir-pipeline-claim', 'Заявленная возможность: перевод и дубляж на 10 языков.');

      // Two-row pipeline with an unambiguous order:
      // row 1: 0 → 1 → 2, then a turn down to row 2: 3 → 4 → 5.
      const row1 = el('div', 'dir-pipeline-row');
      const row2 = el('div', 'dir-pipeline-row');
      stageButtons = STAGES.map((s, i) => buildStageButton(s, i));
      for (let i = 0; i < 3; i += 1) {
        row1.append(stageButtons[i]);
        if (i < 2) row1.append(el('span', 'dir-pipeline-arrow', '→'));
      }
      for (let i = 3; i < 6; i += 1) {
        row2.append(stageButtons[i]);
        if (i < 5) row2.append(el('span', 'dir-pipeline-arrow', '→'));
      }
      const turn = el('div', 'dir-pipeline-turn', '↓');

      const passport = el('div', 'dir-pipeline-passport');
      const passportTitle = el('h4', 'dir-subtitle', 'Паспорт стадии');
      stageName = el('h5', 'dir-pipeline-stage', stage().title);
      const purposeRow = el('p', 'dir-pipeline-field');
      purpose = el('span');
      purposeRow.append(el('strong', undefined, 'Назначение: '), purpose);
      const inputRow = el('p', 'dir-pipeline-field');
      input = el('span');
      inputRow.append(el('strong', undefined, 'Вход: '), input);
      const outputRow = el('p', 'dir-pipeline-field');
      output = el('span');
      outputRow.append(el('strong', undefined, 'Результат: '), output);
      status = statusLine();
      passport.append(passportTitle, stageName, purposeRow, inputRow, outputRow, status);

      root.append(
        claim,
        row1,
        turn,
        row2,
        passport,
        originNote('Концептуальная схема направления. Обработка и публикация здесь не запускаются.'),
      );
      container.append(root);
      sync();
    },
    enter() {
      sync();
    },
    leave() {},
    step(delta) {
      const idx = STAGES.findIndex((s) => s.id === selectedId);
      const next = STAGES[(idx + delta + STAGES.length) % STAGES.length];
      pick(next.id, `Стадия: ${next.title}.`);
    },
    confirm() {
      const s = stage();
      stageButtons[STAGES.indexOf(s)]?.focus();
      if (status) status.textContent = `${s.title}: вход — ${s.input}; результат — ${s.output}.`;
    },
  };
}
