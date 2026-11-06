// 05. Собственный чат-бот: локальный ветвящийся сценарий помощника сайта.
// Никакой сети, отправки сообщений и persistence; контакты не дублируются —
// переход в раздел «Связь» только отдельной явной кнопкой.

import type { ProjectScreen } from '../types';
import { el, originNote, statusLine, markSelected, clickSfx } from '../ui';

interface Option {
  label: string;
  next?: string;
  /** Explicit separate navigation action — never a side effect of a topic. */
  goto?: 'section:projects' | 'section:contact';
  reset?: boolean;
}

interface Node {
  id: string;
  branch: string;
  bot: string;
  options: readonly Option[];
}

const SCRIPT: Readonly<Record<string, Node>> = {
  start: {
    id: 'start',
    branch: 'Главная ветка',
    bot: 'Здравствуйте! Это локальная демонстрация помощника сайта. О чём расскажем?',
    options: [
      { label: 'О направлениях работ', next: 'directions' },
      { label: 'О способах связи', next: 'contacts' },
    ],
  },
  directions: {
    id: 'directions',
    branch: 'Направления работ',
    bot: 'В разделе «Проекты» восемь направлений — от медиааналитики до реставрации видео. Открыть список?',
    options: [
      { label: 'Какие бывают направления?', next: 'directions-list' },
      { label: 'Открыть раздел «Проекты»', goto: 'section:projects' },
      { label: 'Вернуться в начало', next: 'start' },
    ],
  },
  'directions-list': {
    id: 'directions-list',
    branch: 'Направления работ',
    bot: 'Кратко: анализ медиа и звонков, игровые прототипы, open-source, RAG, чат-бот, автоматизация коротких видео и реставрация. У каждого направления свой экран.',
    options: [
      { label: 'Открыть раздел «Проекты»', goto: 'section:projects' },
      { label: 'Вернуться в начало', next: 'start' },
    ],
  },
  contacts: {
    id: 'contacts',
    branch: 'Способы связи',
    bot: 'Способы связи собраны в разделе «Связь»: Email, Telegram, GitHub.',
    options: [
      { label: 'Где именно смотреть контакты?', next: 'contacts-detail' },
      { label: 'Открыть раздел «Связь»', goto: 'section:contact' },
      { label: 'Вернуться в начало', next: 'start' },
    ],
  },
  'contacts-detail': {
    id: 'contacts-detail',
    branch: 'Способы связи',
    bot: 'Контакты не дублируются в диалоге — они живут в разделе «Связь» и обновляются там.',
    options: [
      { label: 'Открыть раздел «Связь»', goto: 'section:contact' },
      { label: 'Вернуться в начало', next: 'start' },
    ],
  },
};

interface HistoryItem {
  who: 'bot' | 'user';
  text: string;
}

export function createChatbotScreen(): ProjectScreen {
  let nodeId = 'start';
  let selectedOption = 0;
  let history: HistoryItem[] = [{ who: 'bot', text: SCRIPT.start.bot }];
  let log: HTMLElement | null = null;
  let optionsRow: HTMLElement | null = null;
  let optionButtons: HTMLButtonElement[] = [];
  let branchInfo: HTMLElement | null = null;
  let status: HTMLParagraphElement | null = null;

  const node = (): Node => SCRIPT[nodeId];

  function renderLog(): void {
    if (!log) return;
    log.textContent = '';
    for (const item of history) {
      log.append(el('div', `dir-chat-msg ${item.who}`, item.text));
    }
    // Bounded reading area: keep the latest message in view without
    // pushing elements outside the display.
    log.scrollTop = log.scrollHeight;
  }

  function renderOptions(): void {
    if (!optionsRow) return;
    optionsRow.textContent = '';
    const n = node();
    optionButtons = n.options.map((o) => {
      const b = el('button', 'dir-chat-option') as HTMLButtonElement;
      b.type = 'button';
      b.textContent = o.label;
      b.addEventListener('click', clickSfx(() => activateOption(o)));
      optionsRow?.append(b);
      return b;
    });
    // After an answer the selection moves to the first valid option of the
    // new node — no dangling reference to removed buttons.
    selectedOption = 0;
    markSelected(optionButtons, optionButtons[0], 'aria-pressed');
  }

  function renderPanel(): void {
    if (branchInfo) {
      branchInfo.textContent = `Ветка: ${node().branch}. Действие: выбор одного из вариантов ответа.`;
    }
  }

  function sync(): void {
    markSelected(optionButtons, optionButtons[selectedOption], 'aria-pressed');
    renderPanel();
  }

  function activateOption(o: Option): void {
    if (o.reset) {
      reset();
      return;
    }
    if (o.goto) {
      // Explicit, separate navigation action (a real site section).
      document.dispatchEvent(new CustomEvent('sdinc:navigate', { detail: { action: o.goto } }));
      if (status) status.textContent = 'Переход в раздел сайта выполнен отдельной кнопкой.';
      return;
    }
    history.push({ who: 'user', text: o.label });
    const next = o.next ? SCRIPT[o.next] : null;
    if (next) {
      history.push({ who: 'bot', text: next.bot });
      nodeId = next.id;
    }
    renderLog();
    renderOptions();
    sync();
    if (status) status.textContent = `Ответ выбран: «${o.label}».`;
  }

  function reset(): void {
    nodeId = 'start';
    history = [{ who: 'bot', text: SCRIPT.start.bot }];
    renderLog();
    renderOptions();
    sync();
    if (status) status.textContent = 'Диалог начат заново.';
  }

  return {
    id: 'chatbot',
    mount(container) {
      const root = el('div', 'dir-screen dir-chat');
      root.dataset.screenId = 'chatbot';
      const layout = el('div', 'dir-chat-layout');

      const left = el('div', 'dir-chat-left');
      log = el('div', 'dir-chat-log');
      log.setAttribute('aria-label', 'История диалога');
      optionsRow = el('div', 'dir-chat-options');
      optionsRow.setAttribute('role', 'group');
      optionsRow.setAttribute('aria-label', 'Варианты ответа');
      const resetBtn = el('button', 'panel-button') as HTMLButtonElement;
      resetBtn.type = 'button';
      resetBtn.textContent = 'Начать диалог заново';
      resetBtn.setAttribute('aria-label', 'Начать диалог заново: сброс только диалога');
      resetBtn.addEventListener('click', clickSfx(reset));
      status = statusLine();
      left.append(log, optionsRow, resetBtn, status, originNote(
        'Локальный сценарий. Сообщения никуда не отправляются.',
      ));

      const right = el('div', 'dir-chat-right');
      const panelTitle = el('h4', 'dir-subtitle', 'Что происходит');
      branchInfo = el('p', 'dir-chat-branch');
      right.append(panelTitle, branchInfo);

      layout.append(left, right);
      root.append(layout);
      container.append(root);
      renderLog();
      renderOptions();
      sync();
    },
    enter() {
      sync();
    },
    leave() {},
    step(delta) {
      const count = optionButtons.length;
      if (count === 0) return;
      selectedOption = (selectedOption + delta + count) % count;
      markSelected(optionButtons, optionButtons[selectedOption], 'aria-pressed');
      if (status) status.textContent = `Вариант: «${node().options[selectedOption]?.label}».`;
    },
    confirm() {
      const o = node().options[selectedOption];
      if (o) activateOption(o);
    },
  };
}
