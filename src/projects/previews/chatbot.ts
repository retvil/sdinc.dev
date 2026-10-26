// Chatbot preview: a compact dialogue scene — two possible user requests
// change a short sample reply. The full dialogue tree stays in the
// demonstration; this is a two-branch sketch.

import { pick, selectOnly } from './index';
import { registerPreview } from './registry';
import type { ProjectPreview } from './types';

const BRANCHES = [
  {
    ask: 'Какие направления работ?',
    reply: 'Восемь направлений: от медиа-аналитики до реставрации видео. Открыть список — ниже.',
  },
  {
    ask: 'Как с вами связаться?',
    reply: 'Раздел «Связь» — контакты и способы написать напрямую.',
  },
] as const;

export const chatbotPreview: ProjectPreview = {
  id: 'chatbot',
  mount(root) {
    const layout = document.createElement('div');
    layout.className = 'pv-chat-layout';

    const asks = document.createElement('div');
    asks.className = 'pv-chat-asks';
    const bubble = document.createElement('p');
    bubble.className = 'pv-chat-bubble';
    bubble.textContent = 'Бот: выберите вариант запроса.';
    const buttons = BRANCHES.map((branch) => {
      const button = pick(branch.ask, `Запрос: ${branch.ask}`);
      button.addEventListener('click', () => {
        selectOnly(buttons, button);
        bubble.textContent = `Бот: ${branch.reply}`;
        bubble.classList.add('active');
      });
      return button;
    });
    asks.append(...buttons);

    layout.append(asks, bubble);
    root.append(layout);
  },
};

registerPreview(chatbotPreview);
