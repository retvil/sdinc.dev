// RAG preview: a question, three documents and a short answer. Picking a
// source highlights its marker inside the answer and shows the fragment
// link. The marked training example only — not a live retrieval system.

import { noteLine, originTag, pick, selectOnly } from './index';
import { registerPreview } from './registry';
import type { ProjectPreview } from './types';

const DOCS = [
  { name: 'Документ 1', marker: '1', fragment: 'Фрагмент 1: определение задачи поиска по материалам.' },
  { name: 'Документ 2', marker: '2', fragment: 'Фрагмент 2: правило ссылаться на источник ответа.' },
  { name: 'Документ 3', marker: '3', fragment: 'Фрагмент 3: отказ, если материала в базе нет.' },
] as const;

export const ragPreview: ProjectPreview = {
  id: 'rag',
  mount(root) {
    const layout = document.createElement('div');
    layout.className = 'pv-rag-layout';

    const question = document.createElement('p');
    question.className = 'pv-rag-question';
    question.textContent = 'Вопрос: как система отвечает по материалам?';

    const docs = document.createElement('div');
    docs.className = 'pv-rag-docs';
    const buttons = DOCS.map((doc) => {
      const button = pick(doc.name, `${doc.name}: показать связь с ответом`);
      button.addEventListener('click', () => {
        selectOnly(buttons, button);
        for (const marker of markers) {
          marker.classList.toggle('lit', marker.dataset.marker === doc.marker);
        }
        answer.classList.add('active');
        note.textContent = doc.fragment;
      });
      return button;
    });
    docs.append(...buttons);

    const answer = document.createElement('p');
    answer.className = 'pv-rag-answer';
    answer.append(
      'Ответ опирается на отмеченные фрагменты ',
      ...DOCS.map((doc) => {
        const marker = document.createElement('span');
        marker.className = 'pv-rag-marker';
        marker.dataset.marker = doc.marker;
        marker.textContent = `[${doc.marker}]`;
        return marker;
      }),
      ' — каждое утверждение можно проверить по источнику.',
    );
    const markers = [...answer.querySelectorAll<HTMLElement>('.pv-rag-marker')];

    const note = noteLine();
    note.textContent = 'Выберите источник слева.';
    layout.append(question, docs, answer, note, originTag('УЧЕБНЫЙ ПРИМЕР'));
    root.append(layout);
  },
};

registerPreview(ragPreview);
