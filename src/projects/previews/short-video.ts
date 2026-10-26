// Short-video preview: a condensed source-to-published chain. Picking a
// stage changes the mini illustration and caption. Deliberately shorter
// than the full six-stage pipeline in the demonstration.

import { pick, selectOnly } from './index';
import { registerPreview } from './registry';
import type { ProjectPreview } from './types';

const STAGES = [
  { name: 'Исходник', caption: 'Одна длинная запись — материал для коротких версий.', art: 'single' },
  { name: 'Фрагменты', caption: 'Запись разбирается на фрагменты для монтажа.', art: 'split' },
  { name: 'Перевод и дубляж', caption: 'Версии переводятся и озвучаются на 10 языков.', art: 'grid' },
  { name: 'Публикация', caption: 'Готовые короткие ролики публикуются автоматически.', art: 'out' },
] as const;

function art(name: string): string {
  switch (name) {
    case 'single':
      return '<rect x="30" y="8" width="40" height="30" rx="2" fill="none" stroke="#4f8f63" stroke-width="1.4"/>';
    case 'split':
      return (
        '<rect x="8" y="14" width="24" height="18" rx="2" fill="none" stroke="#4f8f63" stroke-width="1.2"/>' +
        '<rect x="38" y="14" width="24" height="18" rx="2" fill="none" stroke="#4f8f63" stroke-width="1.2"/>' +
        '<rect x="68" y="14" width="24" height="18" rx="2" fill="none" stroke="#4f8f63" stroke-width="1.2"/>'
      );
    case 'grid':
      return (
        [0, 1, 2].map((r) => [0, 1, 2].map((c) => `<rect x="${14 + c * 26}" y="${4 + r * 12}" width="20" height="9" rx="1.5" fill="none" stroke="#3f7a52" stroke-width="1"/>`).join('')).join('') +
        ''
      );
    default:
      return (
        '<rect x="40" y="10" width="20" height="14" rx="2" fill="none" stroke="#4f8f63" stroke-width="1.2"/>' +
        '<path d="M50 30 v10 M50 40 l-6 -5 M50 40 l6 -5 M30 40 h40" stroke="#9cc4a6" stroke-width="1.6" fill="none"/>'
      );
  }
}

export const shortVideoPreview: ProjectPreview = {
  id: 'short-video',
  mount(root) {
    const layout = document.createElement('div');
    layout.className = 'pv-shorts-layout';

    const stage = document.createElement('div');
    stage.className = 'pv-shorts-art';
    stage.setAttribute('aria-hidden', 'true');
    stage.innerHTML = `<svg viewBox="0 0 100 44" preserveAspectRatio="xMidYMid meet">${art('single')}</svg>`;

    const steps = document.createElement('div');
    steps.className = 'pv-picks pv-shorts-steps';
    const caption = document.createElement('p');
    caption.className = 'pv-note';
    caption.textContent = 'Выберите стадию конвейера.';
    const buttons = STAGES.map((item) => {
      const button = pick(item.name, `Стадия: ${item.name}`);
      button.addEventListener('click', () => {
        selectOnly(buttons, button);
        stage.innerHTML = `<svg viewBox="0 0 100 44" preserveAspectRatio="xMidYMid meet">${art(item.art)}</svg>`;
        caption.textContent = item.caption;
      });
      return button;
    });
    steps.append(...buttons, caption);

    layout.append(stage, steps);
    root.append(layout);
  },
};

registerPreview(shortVideoPreview);
