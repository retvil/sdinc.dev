// Open-source preview: real, confirmed modules of the rettvil / sdinc.dev
// repositories. Picking a module explains its purpose. No invented projects.

import { noteLine, pick, selectOnly } from './index';
import { registerPreview } from './registry';
import type { ProjectPreview } from './types';

const MODULES = [
  { name: 'rettvil', role: 'Интерфейс', text: 'Пользовательский интерфейс: экраны, компоненты и их состояние.' },
  { name: 'rettvil', role: 'Навигация', text: 'Переходы между разделами приложения и точка входа на сайт.' },
  { name: 'sdinc.dev', role: 'Данные', text: 'Данные разделов и их связь с отображением на устройстве.' },
] as const;

export const openSourcePreview: ProjectPreview = {
  id: 'open-source',
  mount(root) {
    const layout = document.createElement('div');
    layout.className = 'pv-open-layout';

    const modules = document.createElement('div');
    modules.className = 'pv-open-modules';
    const note = noteLine();
    note.textContent = 'Выберите модуль, чтобы увидеть его назначение.';
    const buttons = MODULES.map((mod) => {
      const button = pick(mod.role, `Модуль ${mod.role} проекта ${mod.name}: показать назначение`);
      button.innerHTML = `<b>${mod.role}</b><span>${mod.name}</span>`;
      button.addEventListener('click', () => {
        selectOnly(buttons, button);
        note.textContent = `${mod.name} · ${mod.role} — ${mod.text}`;
      });
      return button;
    });
    modules.append(...buttons);

    const panel = document.createElement('div');
    panel.className = 'pv-open-panel';
    panel.setAttribute('aria-hidden', 'true');
    panel.textContent = 'src/\n  modules/\n  interface/\n  data/';

    layout.append(modules, panel, note);
    root.append(layout);
  },
};

registerPreview(openSourcePreview);
