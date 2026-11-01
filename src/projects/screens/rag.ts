// 04. RAG-системы: локальная демонстрация связи «вопрос → фрагменты →
// ответ». Три синтетических документа, три вопроса (два подтверждаемых,
// один честно без основания). Модель не вызывается, индексации нет.

import type { ProjectScreen } from '../types';
import { el, originNote, selectButton, statusLine, markSelected } from '../ui';

interface Doc {
  id: string;
  title: string;
  text: string;
}

interface Fragment {
  id: string;
  docId: string;
  quote: string;
}

interface Question {
  id: string;
  text: string;
  fragmentIds: readonly string[];
  /** Answer with [n] refs mapped to fragmentIds; null = honest gap. */
  answer: ReadonlyArray<string> | null;
}

const DOCS: readonly Doc[] = [
  {
    id: 'doc-format',
    title: 'Формат хранения',
    text: 'Документы демонстрационного архива хранятся карточками: заголовок, тема, дата помещения. У каждой карточки есть идентификатор.',
  },
  {
    id: 'doc-search',
    title: 'Порядок поиска',
    text: 'Поиск выполняется по теме карточки: сначала точное совпадение темы, затем совпадение по ключевым словам заголовка.',
  },
  {
    id: 'doc-service',
    title: 'Обслуживание',
    text: 'Карточки с пометкой «устарела» исключаются из выдачи, но остаются в архиве до плановой чистки.',
  },
];

const FRAGMENTS: readonly Fragment[] = [
  { id: 'frag-1', docId: 'doc-format', quote: '«...хранятся карточками: заголовок, тема, дата помещения...»' },
  { id: 'frag-2', docId: 'doc-search', quote: '«...сначала точное совпадение темы, затем по ключевым словам заголовка...»' },
  { id: 'frag-3', docId: 'doc-service', quote: '«...исключаются из выдачи, но остаются в архиве до плановой чистки...»' },
];

const QUESTIONS: readonly Question[] = [
  {
    id: 'q-format',
    text: 'Как устроено хранение документов?',
    fragmentIds: ['frag-1'],
    answer: ['Документы хранятся карточками: заголовок, тема, дата помещения, идентификатор [1].'],
  },
  {
    id: 'q-search',
    text: 'Как работает поиск по архиву?',
    fragmentIds: ['frag-2'],
    answer: ['Поиск идёт по теме карточки: сначала точное совпадение, затем ключевые слова заголовка [1].'],
  },
  {
    id: 'q-delete',
    text: 'Когда удаляются устаревшие карточки?',
    fragmentIds: ['frag-3'],
    answer: null,
  },
];

const GAP_TEXT = 'В демонстрационных материалах нет достаточной информации.';

export function createRagScreen(): ProjectScreen {
  let questionId = QUESTIONS[0].id;
  let selectedFragmentId: string | null = null;
  let openDocId: string | null = null;
  let questionButtons: HTMLButtonElement[] = [];
  let fragmentButtons: HTMLButtonElement[] = [];
  let docCards: HTMLElement[] = [];
  let answerBox: HTMLElement | null = null;
  let sourcePanel: HTMLElement | null = null;
  let status: HTMLParagraphElement | null = null;

  const question = (): Question => QUESTIONS.find((q) => q.id === questionId) ?? QUESTIONS[0];

  function syncFragments(): void {
    const q = question();
    for (const b of fragmentButtons) {
      const belongs = q.fragmentIds.includes(b.dataset.fragmentId ?? '');
      b.hidden = !belongs;
      b.classList.toggle('active', b.dataset.fragmentId === selectedFragmentId);
    }
    for (const card of docCards) {
      card.classList.toggle('active', card.dataset.docId === openDocId);
    }
    if (sourcePanel) {
      const doc = DOCS.find((d) => d.id === openDocId);
      sourcePanel.textContent = doc ? `${doc.title}: ${doc.text}` : 'Источник не выбран — выберите фрагмент.';
    }
  }

  function syncAnswer(): void {
    if (!answerBox) return;
    const q = question();
    answerBox.textContent = '';
    if (!q.answer) {
      answerBox.append(el('p', 'dir-rag-gap', GAP_TEXT));
      return;
    }
    for (const line of q.answer) {
      const p = el('p', 'dir-rag-answer-line');
      // Split "[1]" reference markers into buttons pointing at fragments.
      const parts = line.split(/(\[\d\])/);
      for (const part of parts) {
        const refMatch = part.match(/^\[(\d)\]$/);
        if (refMatch) {
          const fragId = q.fragmentIds[Number(refMatch[1]) - 1];
          const ref = el('button', 'dir-rag-ref') as HTMLButtonElement;
          ref.type = 'button';
          ref.textContent = `[${refMatch[1]}]`;
          ref.setAttribute('aria-label', `Показать фрагмент-основание ${refMatch[1]}`);
          ref.addEventListener('click', () => {
            selectedFragmentId = fragId;
            const frag = FRAGMENTS.find((f) => f.id === fragId);
            openDocId = frag?.docId ?? null;
            syncFragments();
            if (status) status.textContent = 'Показан фрагмент-основание и документ-источник.';
          });
          p.append(ref);
        } else if (part) {
          p.append(el('span', undefined, part));
        }
      }
      answerBox.append(p);
    }
  }

  function sync(): void {
    const q = question();
    markSelected(questionButtons, questionButtons[QUESTIONS.indexOf(q)], 'aria-pressed');
    syncFragments();
    syncAnswer();
  }

  function pickQuestion(id: string, announce: string): void {
    questionId = id;
    // A stale fragment selection must not survive the question change.
    selectedFragmentId = null;
    openDocId = null;
    sync();
    if (status) status.textContent = announce;
  }

  return {
    id: 'rag',
    mount(container) {
      const root = el('div', 'dir-screen dir-rag');
      root.dataset.screenId = 'rag';

      const steps = el('p', 'dir-rag-steps', 'Вопрос → Фрагменты → Ответ');
      const layout = el('div', 'dir-rag-layout');

      // Left: questions + materials.
      const left = el('div', 'dir-rag-left');
      const qTitle = el('h4', 'dir-subtitle', 'Вопросы');
      const qList = el('div', 'dir-rag-questions');
      qList.setAttribute('role', 'group');
      qList.setAttribute('aria-label', 'Демонстрационные вопросы');
      questionButtons = QUESTIONS.map((q) =>
        selectButton(q.text, `Вопрос: ${q.text}`, () => pickQuestion(q.id, `Вопрос: ${q.text}`)),
      );
      qList.append(...questionButtons);
      const docsTitle = el('h4', 'dir-subtitle', 'Материалы (синтетические)');
      const docs = el('div', 'dir-rag-docs');
      docCards = DOCS.map((d) => {
        const card = el('article', 'dir-rag-doc');
        card.dataset.docId = d.id;
        card.append(el('h5', 'dir-rag-doc-title', d.title), el('p', 'dir-rag-doc-text', d.text));
        return card;
      });
      docs.append(...docCards);
      left.append(qTitle, qList, docsTitle, docs);

      // Right: found fragments + answer + source panel.
      const right = el('div', 'dir-rag-right');
      const fTitle = el('h4', 'dir-subtitle', 'Найденные фрагменты');
      const fragList = el('div', 'dir-rag-fragments');
      fragmentButtons = FRAGMENTS.map((f) => {
        const b = selectButton(f.quote, `Фрагмент из «${DOCS.find((d) => d.id === f.docId)?.title}»`, () => {
          selectedFragmentId = f.id;
          openDocId = f.docId;
          syncFragments();
          if (status) status.textContent = 'Фрагмент выделен, документ-источник показан.';
        });
        b.dataset.fragmentId = f.id;
        return b;
      });
      fragList.append(...fragmentButtons);
      const aTitle = el('h4', 'dir-subtitle', 'Ответ');
      answerBox = el('div', 'dir-rag-answer');
      sourcePanel = el('p', 'dir-rag-source');
      // Each screen owns its layout; the single live region is this screen's
      // own status line (role=status, aria-live=polite). No duplicates.
      status = statusLine();
      right.append(fTitle, fragList, aTitle, answerBox, sourcePanel);

      layout.append(left, right);
      root.append(steps, layout, status, originNote(
        'Локальная демонстрация связи ответа с источниками. Модель не подключена.',
      ));
      container.append(root);
      sync();
    },
    enter() {
      sync();
    },
    leave() {},
    step(delta) {
      const idx = QUESTIONS.findIndex((q) => q.id === questionId);
      const next = QUESTIONS[(idx + delta + QUESTIONS.length) % QUESTIONS.length];
      pickQuestion(next.id, `Вопрос: ${next.text}`);
    },
    confirm() {
      // Reveal the linked materials; keep focus in a logical place.
      const q = question();
      if (!q.answer) {
        if (status) status.textContent = GAP_TEXT;
        return;
      }
      const first = q.fragmentIds[0];
      selectedFragmentId = first;
      const frag = FRAGMENTS.find((f) => f.id === first);
      openDocId = frag?.docId ?? null;
      syncFragments();
      fragmentButtons.find((b) => b.dataset.fragmentId === first)?.focus();
      if (status) status.textContent = 'Раскрыты связанные фрагменты и источник.';
    },
  };
}
