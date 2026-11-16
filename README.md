# SDINC — персональный сайт-прибор

Ретрофутуристический персональный сайт в эстетике Pip-Boy (Fallout).
Astro 5 + TypeScript (strict) + vanilla CSS. Статичный сайт, деплой на
GitHub Pages.

## Быстрый старт

```bash
npm install
npm run dev        # dev-сервер
npm run build      # сборка в dist/
npm run preview    # предпросмотр dist/
npm run test       # vitest (unit)
npm run test:visual # Playwright (visual regression)
```

## Архитектура (V7)

Весь корпус устройства — **один цельный 4K master-растр**
(`public/assets/device/SDINC_reference_4K_conservative.png`, ~6.1 MB),
в `.device` (100% ширины, aspect 3:2, `container-type: inline-size` →
все размеры в `cqw`). Поверх — прозрачный HTML-контент: вкладки
profile / projects / contact, rotor, section buttons, LLM card,
`screen-surface.png` (чистое «стекло», lazy-загрузка). Статичные
фрагменты в рантайме **не** складываются.

| Слой | Путь |
|---|---|
| Сцена / состояние | `src/scene/` (renderer, state, sound, assets, parse, types, scene.json) |
| Проекты (8 экранов + 8 превью) | `src/projects/` (registry, screens/, previews/, ui, types) |
| Данные | `src/data/` (projects.json, contacts.ts, demo.ts) |
| Стили | `src/styles/` (global.css, projects.css, effects.css, editor.css) |
| Страницы | `src/pages/` (index.astro, editor.astro DEV-only) |
| Тесты | `tests/` (vitest), `e2e/` (Playwright visual) |
| CI | `.github/workflows/pages.yml` (astro check + tests + build → Pages) |

## Деплой

GitHub Pages: `dist/` деплоится при push на `main`
(workflow `pages.yml`). Для apex-domain (sdinc.dev) — CNAME в `public/`
+ DNS + Pages custom domain. Sub-path (retvil.github.io/sdinc.dev/) —
`base` в `astro.config.mjs` + `import.meta.env.BASE_URL` в
`src/scene/assets.ts`.

## Структура

```
src/
  scene/       # движок устройства (state machine, renderer, sound, assets)
  projects/    # реестр + 8 экранов + 8 превью (lazy singleton, rotor delegation)
  data/        # projects.json, contacts.ts, demo.ts + typed accessors
  styles/      # global.css (1700+ строк), projects.css, effects.css, editor.css
  components/  # DeviceStage, Display, RotaryKnob, SectionButtons, LayerEditor
  pages/       # index.astro (device), editor.astro (DEV-only layer editor)
tests/         # vitest unit (4 сьюта, ~22 теста)
e2e/           # Playwright visual (16 снапшотов, 4K, maxDiffPixelRatio 0.05)
```

## Графические артефакты (история)

Правый край CSS-зоны (view) выходил за реальное стекло master
(`viewR=1335` vs `glassR≈1332` @1536) → затёк контента + жёсткая
линия/тёмный угол. Устранено: `SCREEN_CONTENT_BOUNDS` 3338→3331,
surface/view bevel-тени, `::after` градиент-затухание 2.5cqw,
padding-right 3.5cqw. Профиль (чистое стекло) не тронут.

## Зависимости

Runtime: только `astro` (нет сторонних UI-фреймворков). Dev:
typescript, vitest, @playwright/test, @astrojs/check.
