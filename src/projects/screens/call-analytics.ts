// 06. Транскрибация и аналитика звонков: две дорожки участников,
// стенограмма, итоги с основаниями. Синтетический нейтральный разговор
// без персональных данных, баллов качества и ложного воспроизведения.

import type { ProjectScreen } from '../types';
import { el, originNote, selectButton, statusLine, markSelected, clickSfx } from '../ui';

type Speaker = 'operator' | 'client';

interface Line {
  id: string;
  speaker: Speaker;
  /** Relative demo time (clip coordinates, not real call timings). */
  time: string;
  start: number;
  duration: number;
  text: string;
  /** Manually placed highlight, explained in the card. */
  mark?: string;
}

const LINES: readonly Line[] = [
  { id: 'l1', speaker: 'operator', time: '0:00', start: 0, duration: 14, text: 'Здравствуйте! Уточняю ваш запрос по обращению.' },
  { id: 'l2', speaker: 'client', time: '0:06', start: 14, duration: 18, text: 'Да, я хотел узнать статус моего вопроса.', mark: 'Уточнение запроса' },
  { id: 'l3', speaker: 'operator', time: '0:14', start: 32, duration: 20, text: 'Проверяю: обращение зарегистрировано и находится в работе.' },
  { id: 'l4', speaker: 'operator', time: '0:22', start: 52, duration: 18, text: 'Могу предложить сообщить вам результат дополнительно.', mark: 'Предложенное действие' },
  { id: 'l5', speaker: 'client', time: '0:30', start: 70, duration: 12, text: 'Да, давайте так и сделаем.' },
  { id: 'l6', speaker: 'operator', time: '0:36', start: 82, duration: 10, text: 'Хорошо, подтвердите, что договорились.' },
  { id: 'l7', speaker: 'client', time: '0:41', start: 92, duration: 8, text: 'Подтверждаю, спасибо.', mark: 'Подтверждение' },
];

const TOTAL = 100;
const SPEAKER_LABEL: Record<Speaker, string> = { operator: 'Оператор', client: 'Клиент' };

interface SummaryRow {
  label: string;
  value: string;
  basisLineId?: string;
}

const SUMMARY: readonly SummaryRow[] = [
  { label: 'Тема', value: 'Уточнение статуса условного обращения' },
  { label: 'Запрос клиента', value: 'Узнать статус вопроса', basisLineId: 'l2' },
  { label: 'Согласованное действие', value: 'Сообщить результат дополнительно', basisLineId: 'l4' },
  { label: 'Подтверждение', value: 'Клиент подтвердил договорённость', basisLineId: 'l7' },
  { label: 'Открытый вопрос', value: 'В тексте разговора нет' },
];

export function createCallAnalyticsScreen(): ProjectScreen {
  let selectedLineId = LINES[0].id;
  let view: 'talk' | 'summary' = 'talk';
  let trackButtons: HTMLButtonElement[] = [];
  let transcriptRows: HTMLButtonElement[] = [];
  let card: HTMLElement | null = null;
  let talkPane: HTMLElement | null = null;
  let summaryPane: HTMLElement | null = null;
  let status: HTMLParagraphElement | null = null;

  const line = (): Line => LINES.find((l) => l.id === selectedLineId) ?? LINES[0];

  function syncCard(): void {
    if (!card) return;
    const l = line();
    card.textContent = '';
    card.append(
      el('h5', 'dir-call-card-title', `${SPEAKER_LABEL[l.speaker]} · ${l.time}`),
      el('p', 'dir-call-card-text', l.text),
    );
    if (l.mark) {
      card.append(el('p', 'dir-call-card-mark', `Значимый момент: ${l.mark} — отмечено вручную в примере.`));
    }
  }

  function syncTracks(): void {
    const l = line();
    markSelected(trackButtons, trackButtons[LINES.indexOf(l)], 'aria-pressed');
    markSelected(transcriptRows, transcriptRows[LINES.indexOf(l)], 'aria-pressed');
  }

  function syncView(): void {
    if (talkPane) talkPane.hidden = view !== 'talk';
    if (summaryPane) summaryPane.hidden = view !== 'summary';
  }

  function sync(): void {
    syncCard();
    syncTracks();
    syncView();
  }

  function pickLine(id: string, announce: string): void {
    selectedLineId = id;
    sync();
    if (status) status.textContent = announce;
  }

  function buildTracks(): HTMLElement {
    const tracks = el('div', 'dir-call-tracks');
    for (const speaker of ['operator', 'client'] as const) {
      const row = el('div', `dir-call-track dir-call-track-${speaker}`);
      const name = el('span', 'dir-call-track-label', SPEAKER_LABEL[speaker]);
      const line = el('div', 'dir-call-track-line');
      for (const [index, l] of LINES.entries()) {
        if (l.speaker !== speaker) continue;
        const seg = el('button', 'dir-call-seg') as HTMLButtonElement;
        seg.type = 'button';
        seg.style.left = `${(l.start / TOTAL) * 100}%`;
        seg.style.width = `${(l.duration / TOTAL) * 100}%`;
        seg.dataset.lineIndex = String(index);
        seg.setAttribute('aria-label', `${SPEAKER_LABEL[speaker]}, ${l.time}: ${l.text}`);
        seg.addEventListener('click', clickSfx(() => pickLine(l.id, `Реплика ${SPEAKER_LABEL[l.speaker]} (${l.time}).`)));
        line.append(seg);
        trackButtons.push(seg);
      }
      row.append(name, line);
      tracks.append(row);
    }
    return tracks;
  }

  function buildTranscript(): HTMLElement {
    const list = el('div', 'dir-call-transcript');
    list.setAttribute('role', 'group');
    list.setAttribute('aria-label', 'Стенограмма разговора');
    transcriptRows = LINES.map((l) => {
      const row = selectButton(
        `${l.time} · ${SPEAKER_LABEL[l.speaker]}: ${l.text}`,
        `Реплика ${SPEAKER_LABEL[l.speaker]}, время ${l.time}`,
        () => pickLine(l.id, `Реплика ${SPEAKER_LABEL[l.speaker]} (${l.time}).`),
      );
      row.classList.add('dir-call-row', `dir-call-row-${l.speaker}`);
      return row;
    });
    list.append(...transcriptRows);
    return list;
  }

  function buildSummary(): HTMLElement {
    const box = el('div', 'dir-call-summary');
    box.append(el('h4', 'dir-subtitle', 'Итог разговора'));
    for (const row of SUMMARY) {
      const p = el('p', 'dir-call-summary-row');
      p.append(el('strong', undefined, `${row.label}: `), el('span', undefined, row.value));
      if (row.basisLineId) {
        const l = LINES.find((x) => x.id === row.basisLineId);
        const basis = el('button', 'dir-rag-ref') as HTMLButtonElement;
        basis.type = 'button';
        basis.textContent = 'основание ↩';
        basis.setAttribute('aria-label', `Перейти к реплике-основанию: ${l?.text}`);
        basis.addEventListener('click', clickSfx(() => {
          view = 'talk';
          syncView();
          pickLine(row.basisLineId as string, `Основание: реплика ${SPEAKER_LABEL[l?.speaker ?? 'operator']} (${l?.time}).`);
        }));
        p.append(' ', basis);
      }
      box.append(p);
    }
    return box;
  }

  return {
    id: 'call-analytics',
    mount(container) {
      const root = el('div', 'dir-screen dir-call');
      root.dataset.screenId = 'call-analytics';

      const viewRow = el('div', 'dir-call-views');
      viewRow.setAttribute('role', 'group');
      viewRow.setAttribute('aria-label', 'Режим просмотра');
      const viewButtons = ['talk', 'summary'].map((v) =>
        selectButton(v === 'talk' ? 'Разговор' : 'Итог', v === 'talk' ? 'Режим: разговор' : 'Режим: итог', () => {
          view = v as 'talk' | 'summary';
          syncView();
          if (status) status.textContent = `Режим: ${v === 'talk' ? 'разговор' : 'итог'}. Выбранная реплика сохранена.`;
        }),
      );
      viewRow.append(...viewButtons);

      talkPane = el('div', 'dir-call-talk');
      talkPane.append(buildTracks(), buildTranscript());
      card = el('div', 'dir-call-card');
      talkPane.append(card);

      summaryPane = el('div', 'dir-call-summary-pane');
      summaryPane.append(buildSummary());

      status = statusLine();
      root.append(
        viewRow,
        talkPane,
        summaryPane,
        status,
        originNote('Синтетический разговор для демонстрации интерфейса.'),
      );
      container.append(root);
      sync();
    },
    enter() {
      sync();
    },
    leave() {},
    step(delta) {
      const idx = LINES.findIndex((l) => l.id === selectedLineId);
      pickLine(
        LINES[(idx + delta + LINES.length) % LINES.length].id,
        'Выбрана соседняя реплика разговорной последовательности.',
      );
    },
    confirm() {
      const l = line();
      transcriptRows[LINES.indexOf(l)]?.focus();
      if (status) status.textContent = `Контекст реплики (${l.time}): ${l.text}${l.mark ? `. Момент: ${l.mark}.` : '.'}`;
    },
  };
}
