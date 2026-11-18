# SDINC — что это, для кого, какие сценарии

> Краткое описание для рабочей сессии. Не публичный README (тот намеренно урезан до одной строки). Это внутренняя точка отсчёта для проектирования/ревью.

## Что это

**SDINC.dev** — персональный сайт-прибор. Ретрофутуристическая «Pip-Boy»-estetica (Fallout): весь корпус устройства — **один цельный 4K master-растр** (PNG/AVIF/WebP в `public/assets/device/`), поверх которого на HTML/CSS-слоях живёт интерактив. Статика (вкладки, ротор, секционные кнопки, LLM-карта, «стекло» экрана) **не перерисовывается** в рантайме — только лёгкие состояния (hover/focus/selected) и ротации ротора.

Стек: **Astro 7 + TypeScript (strict) + vanilla CSS + vanilla TS**. Статичный вывод, деплой на **GitHub Pages**. Никаких сторонних UI-фреймворков — только `astro`.

## Как устроено (коротко)

- **Master-растр** = `public/assets/device/SDINC_reference_4K_conservative.png` (3840×2560). Один слой, не складывается из фрагментов. Все размеры CSS — в `cqw` (container query units), привязаны к ширине `.device` (100%, aspect 3:2, `container-type: inline-size`).
- **Интерактив** = прозрачные HTML-элементы (`.tab-control`, `.node-control`, `.open-control`, ротор, кнопки) с `data-action` и CSS-состояниями. Рендер — `src/scene/renderer.ts`; state machine — `src/scene/state.ts`; звук — `src/scene/sound.ts`.
- **Данные** = `src/data/projects.json` (8 направлений, у каждого `kind: "direction"`, `screen`, `detail` с 5 полями) и `src/data/contacts.ts`.
- **Проекты** = 8 экранов (`src/projects/screens/`) + 8 превью (`src/projects/previews/`), регистрируются в `registry.ts`, лениво монтируются, делегируют ротору.
- **DEV-only слой** = `/editor` (Astro page `src/pages/editor.astro`) + `src/styles/editor.css` — редактор слоёв для подстройки master-растра, не входит в публичный бандл.
- **Графика** = `src/styles/effects.css` + `projects.css` (глобальные состояния, дубли).

## Задача, которую решает

Не «личный сайт» в привычном смысле. Это **портфель-прибор**: пользователь «включает» устройство, выбирает вкладку (Профиль / Проекты / Связь), крутит ротор по направлениям, открывает экран. Контент — 8 направлений (видео/аудиоаналитика, игры, open-source, RAG, чат-бот, аналитика звонков, короткие видео, реставрация видео) — подаётся как интерактивные сценарии, а не карточки.

## Целевой пользователь

- Посетитель, знакомый с эстетикой Fallout / CRT / ретро-интерфейсов. Ожидает «прибор», а не лендинг.
- Второй пользователь (сам автор) — использует `/editor` для подстройки master-растра и слоёв.
- Третий (ревьюер/демо) — проходит по 8 направлениям через ротор, читает `detail`-поля.

## Ключевые сценарии

1. **Включение устройства** — master-растр (PNG, `fetchpriority=high`) + AVIF/WebP fallback, `rotor` и `tab` инициализируются из `state.ts`.
2. **Переключение вкладок** — `data-action="tab:profile|projects|contact"` на `.tab-control`; body меняет класс `.view-*`, CSS показывает нужный контур.
3. **Ротор по направлениям** — `data-action="rotor:step"` на `.node-control` / секционные кнопки; `state.ts` двигает `rotorIndex`, экраны lazy-монтируются через `registry.ts`.
4. **Открытие направления** — `data-action="open:direction"` → экран уровня 2 (`detail`-layout из `projects.json`).
5. **Связь** — `contact-select` + каналы + действия (скопировать, перейти) + `aria` live-region.
6. **DEV: подстройка слоёв** — `/editor` с canvas-превью + ползунки offset/opacity для каждого слоя.

## Что НЕ входит (сознательно)

- Нет SPA-роутинга, нет SSR, нет API, нет авторизации.
- Нет публичной формы (contact — только каналы + copy).
- Нет бэкенда; `projects.json` и `contacts.ts` — единственный источник данных.
- `/editor` не деплоится в продакшен (DEV-only, но на Pages он сейчас доступен — см. аудит ниже).

## Локальные скиллы (для дальнейшей разработки)

Уже установлены в `.agents/skills/` (локально, без `-g`): `astro`, `code-review`, `codebase-design`, `improve-codebase-architecture`, `diagnosing-bugs`, `domain-modeling`, `prototype`, `tdd`, `triage`, `web-design-guidelines`, `frontend-design`, `design-taste-frontend`, `find-skills`. Покрытие для этой фазы (Astro-устройство, CSS-overlay, visual regression, security) достаточное — доустановка из экосистемы `npx skills` не требуется: лучшие совпадения (`astrolicious/agent-skills@astro`, `clerk/skills@clerk-astro-patterns`) менее специфичны, чем уже установленный `astro`-скилл.

## Текущее состояние (HEAD)

- Astro 7.4.12, `@playwright/test` 1.65.1, `0 vulnerabilities` в прямых deps (picomatch transitive — известен, не блокирует деплой).
- CI: `npm audit` (мягкий гейт) → `astro check` → `vitest` (28/28) → `build` → Pages.
- Visual-тесты (Playwright, 16/16) — **только локально**, не в CI.
- `public/_headers` — security-заголовки (CSP, COOP/COEP, X-Frame-Options).
