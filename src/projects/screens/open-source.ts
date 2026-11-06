// 03. Открытые разработки: каталог подтверждённых модулей текущего
// портфолио (retvil/sdinc.dev) и паспорт выбранного модуля. Никаких
// выдуманных репозиториев, звёзд, языковых процентов и статусов CI.

import type { ProjectScreen } from '../types';
import { el, originNote, selectButton, statusLine, markSelected, clickSfx } from '../ui';

/** Confirmed source: the portfolio site repository itself (user-confirmed). */
const REPO = {
  name: 'retvil/sdinc.dev',
  url: 'https://github.com/retvil/sdinc.dev',
};

interface Module {
  id: string;
  title: string;
  purpose: string;
  files: readonly string[];
  properties: readonly string[];
  explanation: string;
}

/** Modules verified by the actual site code (src/… of this repository). */
const MODULES: readonly Module[] = [
  {
    id: 'module-ui',
    title: 'Интерфейс устройства',
    purpose: 'Рендер цельного корпуса и слоёв управления поверх единой поверхности дисплея.',
    files: ['src/scene/renderer.ts', 'src/scene/assets.ts'],
    properties: ['Статический master-кадр 4K', 'Прозрачные hit-области', 'Masked-оверлеи кнопок и ротора'],
    explanation:
      'Экран сайта построен как один непрерывный master-кадр; интерактивными являются только прозрачные слои управления и маскированные движущиеся элементы.',
  },
  {
    id: 'module-nav',
    title: 'Навигация и состояния',
    purpose: 'Машина режимов (профиль / проекты / проект / связь), ротор и политика фокуса.',
    files: ['src/scene/state.ts'],
    properties: ['Единое правило видимости карточки', 'Сохранение явного выбора', 'Восстановление фокуса при смене разделов'],
    explanation:
      'Смена разделов не сбрасывает явные выборы: направление профиля и выбранный контакт сохраняются, фокус восстанавливается по принятой политике.',
  },
  {
    id: 'module-data',
    title: 'Данные и контакты',
    purpose: 'Каталог направлений, демонстрационный образец и подтверждённые контакты.',
    files: ['src/data/projects.ts', 'src/data/contacts.ts', 'src/data/demo.ts'],
    properties: ['Типизированные данные', 'Стабильные идентификаторы', 'Контакты — только подтверждённые значения'],
    explanation:
      'Данные отделены от представления: список направлений, демо-образец и контакты читаются из типизированных модулей, а не зашиты в разметку.',
  },
];

export function createOpenSourceScreen(): ProjectScreen {
  let selectedId = MODULES[0].id;
  let buttons: HTMLButtonElement[] = [];
  let passportTitle: HTMLElement | null = null;
  let passportPurpose: HTMLElement | null = null;
  let passportSource: HTMLElement | null = null;
  let passportProps: HTMLElement | null = null;
  let passportExplanation: HTMLElement | null = null;
  let status: HTMLParagraphElement | null = null;

  const module = (): Module => MODULES.find((m) => m.id === selectedId) ?? MODULES[0];

  function sync(): void {
    const m = module();
    markSelected(buttons, buttons[MODULES.indexOf(m)], 'aria-pressed');
    if (passportTitle) passportTitle.textContent = m.title;
    if (passportPurpose) passportPurpose.textContent = `Назначение: ${m.purpose}`;
    if (passportSource) {
      passportSource.textContent = '';
      passportSource.append(
        el('span', undefined, 'Источник: '),
        Object.assign(el('a', 'dir-link', REPO.name), {
          href: REPO.url,
          target: '_blank',
          rel: 'noopener noreferrer',
        }),
        el('span', undefined, ' (внешняя ссылка открывается отдельно от выбора карточки).'),
      );
    }
    if (passportProps) {
      passportProps.textContent = '';
      const list = el('ul', 'dir-open-props');
      for (const p of m.properties) list.append(el('li', undefined, p));
      passportProps.append(el('strong', undefined, 'Подтверждённые свойства: '), list);
    }
    if (passportExplanation) passportExplanation.textContent = m.explanation;
  }

  return {
    id: 'open-source',
    mount(container) {
      const root = el('div', 'dir-screen dir-open');
      root.dataset.screenId = 'open-source';
      const layout = el('div', 'dir-open-layout');

      // Catalog: modules of the single confirmed repository.
      const catalog = el('div', 'dir-open-catalog');
      const catalogTitle = el('h4', 'dir-subtitle', `Каталог модулей — ${REPO.name}`);
      const list = el('div', 'dir-open-list');
      list.setAttribute('role', 'group');
      list.setAttribute('aria-label', 'Модули портфолио');
      buttons = MODULES.map((m) =>
        selectButton(m.title, `Модуль ${m.title}`, () => {
          selectedId = m.id;
          sync();
          if (status) status.textContent = `Модуль: ${m.title}.`;
        }),
      );
      list.append(...buttons);
      const repoLink = el('a', 'panel-button dir-link-button') as HTMLAnchorElement;
      repoLink.href = REPO.url;
      repoLink.target = '_blank';
      repoLink.rel = 'noopener noreferrer';
      repoLink.textContent = 'Исходный код ↗';
      repoLink.setAttribute('aria-label', `Исходный код: открыть ${REPO.name} на GitHub в новой вкладке`);
      catalog.append(catalogTitle, list, repoLink);

      // Passport of the selected module.
      const passport = el('div', 'dir-open-passport');
      const passportHead = el('h4', 'dir-subtitle', 'Паспорт модуля');
      passportTitle = el('h5', 'dir-open-title');
      passportPurpose = el('p', 'dir-open-purpose');
      passportSource = el('p', 'dir-open-source');
      passportProps = el('div', 'dir-open-props-wrap');
      passportExplanation = el('p', 'dir-open-explanation');
      status = statusLine();
      passport.append(
        passportHead,
        passportTitle,
        passportPurpose,
        passportSource,
        passportProps,
        passportExplanation,
        status,
        originNote('Сведения из фактического кода текущего репозитория; другие репозитории не приписываются.'),
      );

      layout.append(catalog, passport);
      root.append(layout);
      container.append(root);
      sync();
    },
    enter() {
      sync();
    },
    leave() {},
    step(delta) {
      const idx = MODULES.findIndex((m) => m.id === selectedId);
      selectedId = MODULES[(idx + delta + MODULES.length) % MODULES.length].id;
      sync();
      if (status) status.textContent = `Модуль: ${module().title}.`;
    },
    confirm() {
      // Reveal the explanation; external link stays a separate native action.
      buttons[MODULES.indexOf(module())]?.focus();
      if (status) status.textContent = module().explanation;
    },
  };
}
