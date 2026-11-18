# SDINC.dev — Исследовательская фаза (до реализации)

> Документ-срез: овервай + референсы + скиллы + архитектура/план/аудит.
> Собирается **до** старта разработки. Реализация не начинается, пока ты не подтвердишь стек, план и правки.

**Модели (Abhibots):** основной аудит на `claude-sonnet-5` (fallback с opus — Opus в Abhibots на этот промпт недоступен, я это указываю честно). Второе мнение на `claude-sonnet-5`. Я сам — на `claude-opus-5-5`. Все три — через провайдер `abhibots` (единственный активный).

---

## 1. Овервай (детально — в PROJECT_OVERVIEW.md)

Персональный сайт-прибор в эстетике Pip-Boy. Весь корпус = один 4K master-растр; поверх — HTML/CSS-интерактив (вкладки, ротор, секции, LLM-карта). Astro 7 + TS + vanilla CSS. Деплой на GitHub Pages. DEV-only редактор слоёв `/editor`.

## 2. Open-source референсы

### 2.1. Ближайший аналог — `purplecandy/kibibyte-pipboy`
- **Задача:** полный Pip-Boy personal landing.
- **Стек/архитектура:** Preact CLI, vanilla JS/CSS, tab/panel architecture (nav + panels разделены), `MouseMoveEffect.js` (3D tilt), gh-pages, PWA manifest + sw.
- **Активность:** 16 звёзд, 0 open issues, последний push Dec 2023; зависимости устарели (preact ^10.3, jest ^24).
- **Перенять:** разделение tab/panel; 3D-tilt chassis; PWA manifest для «device feel».
- **Избегать:** коммиченные lockfiles для npm и pnpm одновременно; unbounded mousemove-трансформы без throttle.

### 2.2. Подтверждение модели «один растр + оверлеи» — `MegaZegan/PipBoy-3000-Interface`
- **Задача:** mock Pip-Boy 3000 UI.
- **Стек/архитектура:** статичный HTML/CSS/JS; один большой PNG корпуса + overlay JS (та же модель, что у нас), кастомный моно-шрифт.
- **Активность:** 5 звёзд, push May 2026; в репо вендорен полный dist Bootstrap + jQuery.
- **Перенять:** подтверждает, что «один растр + hotspots» работает; практика субсеттинга шрифта.
- **Избегать:** вендоринг полного dist фреймворков (на статичном сайте = бloat); коммиченные `.css.bak`.

### 2.3. Чек-лист визуальной консистентности — `NeverMorewd/Pipboy.Avalonia`
- **Задача:** библиотека тем Pip-Boy (C#/Avalonia, 46 звёзд, push Sep 2026).
- **Перенять:** токенизацию вида — accent green `#83FF66`, scanline/glow, пропорции ротора/табов — как спеку для сэмплирования цветов нашего master-растра.
- **Избегать:** N/A (это desktop UI-либ, web-архитектуры для копирования нет).

### 2.4. Референс для редактора слоёв — `fabricjs/fabric.js`
- **Задача:** в-браузер композиция объектов/слоёв.
- **Стек/архитектура:** TS canvas-либ, ~31.5k звёзд, активный (Nov 2026), 476 open issues.
- **Перенять:** концепция слоёв — объекты как независимые canvas-слои, порядок `getCanvasElements`, сериализация в JSON для формата состояния редактора.
- **Избегать:** тащить весь fabric (тяжёлый). Для «один растр + несколько оверлеев» достаточно обычного `<canvas>`-стека с `drawImage` + JSON-манифестом `{x, y, opacity, blend, z}` (~100 строк). Средний вариант — Konva (15k звёзд, активный, 3 open issues).

**Покрытие:** pip-boy сайты, raster+overlay device UI, browser layer editors. **Не покрыто вглубь:** CRT/terminal-эстетика (маленькие/устаревшие репо), интерактивные терминальные движки (wterm — только если LLM-карта вырастет в полноценный terminal mode).

## 3. Скиллы

Локальные (`.agents/skills/`, без `-g`): `astro`, `code-review`, `codebase-design`, `improve-codebase-architecture`, `diagnosing-bugs`, `domain-modeling`, `prototype`, `tdd`, `triage`, `web-design-guidelines`, `frontend-design`, `design-taste-frontend`, `find-skills`. Покрытие для фазы достаточное. Доустановка из экосистемы `npx skills` не требуется — лучшие совпадения (`astrolicious/agent-skills@astro`, `clerk/skills@clerk-astro-patterns`) менее специфичны, чем уже установленный `astro`.

## 4. Архитектура, план, аудит

### Стек (рекомендация)
**Оставить Astro 7 + vanilla TS + vanilla CSS + GitHub Pages.** Верный выбор для статичного «прибора»: нет фреймворка, детерминированный вывод, минимальный рантайм. **Не менять стек.**

### Подход (master-raster + overlay)
**Оставить.** Он решил проблему швов V5 и стабилен (MAE-база). **Не переходить** на canvas-комpositor — добавит слой рендера без контентной пользы и столкнётся с инвариантом «статичный корпус не перерисовывается».

### Аудит текущего кода

**scene/:**
- `userSelected` (state.ts:52,146,598,611) — write-only, семантически мёртвый (не гейтит ничего). **Удалить.**
- `parse.ts` валидирует `scene.content`/`scene.nodes`, но рантайм их не читает (тексты в `data/demo.ts`). Мёртвый путь ~25 строк. **Убрать.**
- `renderer.ts` ~690 строк, 5 mount-функций inline; `sourceFragments`/`sourceUrl` (editor-only) шьются в публичный бандл. **Разделить.**

**projects/:**
- Lazy-singleton + rotor-delegation — **здорово**: единый host, enter/leave state, нет дублирования хэндлеров. `screens/` (уровень 3, интерактив) и `previews/` (уровень 1, статичные SVG) — осознанно разные.
- `ui.ts` экспортирует и `selectButton` (с SFX), и `clickSfx`-обёртку; `open-source.ts`/`short-video.ts`/`restoration.ts` импортируют `clickSfx` но **не используют**. **Убрать лишний SFX-обёрток.**

**CSS:**
- global.css 1721 строка + 4 `@import` слоя. Слойинг через `@import` разумен, но **порядкозависим**.
- `.control:focus-visible` suppression (global.css:320–324) **остаётся корректной** после px→cqw миграции — editor.css трогает только editor-chrome, не device-`.control`. Конфликта нет.
- Мёртвое: effects.css §5 — «no-op placeholder» (пустое правило), удалить. `/* --- narrow-viewport --- */` (global.css:1716–1721) — пустой блок, удалить.
- 16 MB device-фрагментов PNG в `public/` — это **editor-only source library**, не складывается в рантайме, но шьётся на Pages. Не баг, а footprint.

**editor (DEV-only) ДЕПЛОЕН на Pages — реальный вопрос.**
- `editor.astro` гейтит `<LayerEditor>` за `import.meta.env.DEV` (false в `astro build`), поэтому публичная страница = пустая оболочка, **тулинг не шьётся** — ок.
- Но **роут всё ещё существует**, и `public/_headers` даже определяет отдельный `/editor/` CSP-rule. Мёртвая публичная поверхность.
- Чистый фикс: вынести editor за пределы `dist/` (второй `astro.config` или флаг build), потом убрать `/editor/` из `_headers`.

**CI audit gate** — `|| echo "KNOWN VULNERABLE..."` (pages.yml:68) — корректная **промежуточная** позиция для dev-only transitive ReDoS без апстрим-фикса; комментарий документирует CVE и команду ре-включения. Держать до патча picomatch, потом переключить на жёсткий `npm audit --audit-level=low`. Не дефект.

**_headers vs dist/** — правила резолвятся в ровно один матч на путь (закрыто `tests/headers.test.ts`). `img-src 'self'` корректно: единственные runtime-изображения — self-hosted PNG/AVIF/WebP/SVG. `blob:` в `img-src` нужен для editor-JSON export (`URL.createObjectURL`). Внешнего image-host нет, `'self'` достаточно.

### Границы MVP
- **v1 (ship новому аудитории):** profile + 3 вкладки, ротор, 8 направлений, level-2 detail (все 8), contact, sound toggle, LCP master-raster, security headers, CI-арматура.
- **Stub на потом:** level-3 интерактивные демо — оставить 2–3 сильнейших (game, media-analytics, rag), остальные 5 — **статичная иллюстрация + «demo coming soon»**, не полноценные screens. Режет ~6 из 8 screen-модулей и ~половину effects.css / `dir-*`.
- **Out of scope навсегда:** реальный бэкенд, auth, SPA-роутинг.

### Последовательность разработки
1. Удалить `userSelected`, мёртвые `clickSfx`-импорты, effects.css §5, пустой narrow-viewport блок, неиспользуемые `parse.ts` content/nodes.
2. Вынести editor из `dist/` (отдельный build); убрать `/editor/` из `_headers`; добавить `404.html` + `robots.txt` (оба сейчас отсутствуют).
3. Застейбить 5 из 8 level-3 screens (оставить 3 сильнейших).
4. Переключить audit gate на жёсткий, когда ляжет picomatch-патч (cron b53ff8b9 следит).
5. Опционально: `base: '/sdinc.dev/'` для реального sub-path деплоя + апдейт `ASSET_BASE` (assets.ts:15 уже использует `import.meta.env.BASE_URL` — отстает только комментарий).

### По файлам (оставить / улучшить / заменить)
- **Оставить:** state.ts (без `userSelected`), registry.ts, types.ts, previews/*, projects.css, editor.css (dev-only), pattern registry.
- **Улучшить:** renderer.ts (разбить 5 mount, вынести `sourceFragments` за dev-only импорт), parse.ts (сбросить content/nodes), ui.ts (один SFX), global.css (убрать мёртвые блоки; рассмотреть CSS-modules-per-feature), demo.ts/scene.json (убрать неиспользуемы�� `content`/`nodes`).
- **Заменить:** pages/editor.astro (→ dev-only build), pages.yml audit (→ hard gate на патч), public device-fragment library (→ оставить в репо, перестать шить 16 MB на Pages).

---

## Стоп-правило
**Реализация не начата.** Жду явного подтверждения: (а) стек оставляем как есть, (б) подход master-raster+overlay оставляем, (в) границы MVP и последовательность разработки, (г) правки по текущему коду (какие пункты из списка делаем). Без подтверждения в код не иду.
