# SDINC.dev — План архитектуры и аудит (подготовительный этап, без кода)

> Синтез: моё исследование кода + second-opinion архитектуры (Abhibots/claude-opus-5-5)
> + код-аудит (Abhibots/claude-opus-5) + ландшафт open-source референсов.
> Дата: 2026-11-19. **Ничего не реализовано — это план на подтверждение.**

## 1. Итоговая оценка стека
**Стек остаётся как есть: Astro 7 (static) + vanilla TypeScript + WebAudio + Playwright.**
Не менять. Обоснование: «один 4K-мастер-растр + тонкие HTML/CSS-оверлеи +
vanilla-TS state machine + lazy-реестр 8 экранов» — осознанная, продуманная
система, правильная для «художественного прибора», а не контент-сайта. Ничего
не сломано, заменять не нужно. Единственные реальные слабости — инфраструктурные
(security-заголовки не применяются на Pages) и LCP-груз (три preloaded растра).

## 2. Что ОСТАВИТЬ как есть (по аудитам)
- `DeviceState` (state machine, `state.ts`) — чистый, focus-repair продуман.
- Registry + lazy-скрины (`registry.ts`) — глубокий модуль, не каша.
- Glass-bounds single-source-of-truth (`renderer.ts:309–326`) — защитило right-edge.
- WebAudio-SFX (`sound.ts`) — синтез без файлов, mute персистентный, одного контекста.
- Фокус-инварианты + честный контакт/копи (`state.ts:189–238,390–412`) — чисто.
- 8 direction-скринов как чистые TS-модули (`game.ts` = образец) — паттерн масштабируется.
- Честность демо: все помечены `originNote`, контакты verbatim, 0 `console.log` в проде.

## 3. Что ДОРАБОТАТЬ (приоритет, без рисковых пунктов)
| # | Что | Почему | Усилие | Вердикт |
|---|---|---|---|---|
| 3.1 | **П0-1** Security-заголовки не применяются на Pages (`public/_headers` инертен) | clickjacking + MIME-sniffing | Ср/Бол | **rework** (см. ниже) |
| 3.2 | LCP: три preloaded растра 4K master (`index.astro:38–40`) — PNG+AVIF+WEBP | LCP ~1.4MB+ | Низкий | improve — оставить 1 preload (WebP) |
| 3.3 | Хрупкий фолбэк PNG→AVIF→retry-PNG через 3s (`renderer.ts:69–76`) | сложность, таймеры | Низкий | improve — один `<picture>` |
| 3.4 | Императивный цикл `dataset.screen` (`state.ts:422–430`) — главная хрупкость при новом режиме | масштабируемость | Низкий | improve — явная карта mode→элементы |
| 3.5 | CI-визуалка «правый край панели == стекло» (защита дрейфа overlay↔raster) | SPOF raster | Ср | improve — тест на стык |
| 3.6 | `AudioContext.suspend()` по idle (`sound.ts`) | фоновый слот | Низкий | improve |
| 3.7 | Teardown `device`+registry для SPA-готовности (`state.ts`, `registry.ts:11`) | переиспользование страницы | Ср | improve (только если SPA) |
| 3.8 | T2: декоративный слой в px (scanlines/scrollbar `perspective:400px`) — **осознанно**, но `perspective` не масштабируется | чистота cqw | Низкий | **пропустить** (см. ниже) |

## 3.9 Решение по 3.8 — почему НЕ сделано (осознанно)
Оба «px-футбола» — **не баг**, а осознанное решение, и их конвертация в cqw
сдвигает визуальный baseline:
- `perspective:400px` (`.vault-shutter`) — влияет только на короткую (0.22s)
  анимацию «открытия хранилища». Пересчёт в cqw изменил бы глубину затвора
  на каждом viewport-размере → сдвиг baseline.
- `clamp(140px, 18cqw, 260px)` (`.dir-game-svg`) — уже масштабируется в
  середине диапазона (18cqw активен при ~780–1444px ширины устройства);
  фикс. 140/260px — намеренные floor/ceiling читабельности SVG.
- scanlines (`0px/1px/3px`) и нативный scrollbar (`9px/5px/2px`) — cqw к ним
  неприменим (период пикселей + нативный UI-роль).
Вердикт: **не трогаем** — это P3-косметика, а не дефект, и «видимое =
baseline c309b52». 3.6 и 3.7 (suspend + teardown) — реальные правки, сделаны.

## 4. П0-1 (заголовки) — выбор стратегии (решение за тобой)
Сейчас `public/_headers` — только формат, на GitHub Pages не применяется. Варианты:
- **(A) Cloudflare** (бесплатно, если домен за CF): Transform Rules → реальный CSP/XFO/nosniff/Referrer-Policy. Тест остаётся источником истины.
- **(B) Принять риск**: для личного портфолио clickjacking/MIME-sniffing риск низкий; зафиксировать решение в README.
- **(C) Caddy/другой host** — если не Pages.
Рекомендация: **(A)** если домен на Cloudflare, иначе **(B)** (честно задокументировать).

> **Решение принято: (B), зафиксировано в `SECURITY.md` (корень репо, не
> на Pages).** Сайт статический, без аутентификации и пользовательских данных;
> `public/_headers` остаётся единым источником истины для будущего хоста,
> который реально применяет заголовки (Cloudflare / Caddy / Netlify).

## 5. Границы MVP (сценарий: понять→погрузиться, 8 направлений c демо, честный контакт)
**В v1:** Profile + 4 узла (ротор); Projects list + 8 direction-скринов c demo;
Contact (3 канала, copy+anchor, честный); mute/status/focus-repair.
**Отложить:** LLM-чат-скрин (заглушка, карта LLM запечена в master); LayerEditor
(рабочий инструмент — удалить из публичной поверхности, не строить); shutter-анимации.

## 6. Пошаговая последовательность (без рисковых пунктов)
1. Зафиксировать scope v1 (8 направлений, contact, без LLM-чата и editor).
2. Обрезать LCP: один preload (WebP), убрать двойной AVIF+WEBP.
3. Заменить PNG→AVIF-retry фолбэк на один `<picture>`.
4. Разобрать императивный `dataset.screen`-цикл на явную карту.
5. Реальный фронт security-заголовков (по 3.1 / 4).
6. CI-визуалка на стык «правый край панели == стекло».
7. Прогнать visual regression на всех 8 направлениях + contact + focus-траектории.
8. README: master-raster = источник правды по корпусу; как менять через source library.

## 7. Top-3 архитектурных риска + mitigation
1. **Master-raster = чёрный ящик / SPOF** → держать source (LayerEditor lib) в репо,
   генерировать master из него, покрывать каждый релиз растера visual regression.
2. **Дрейф HTML-панели от запечённого стекла** → glass-bounds уже SOT; усилить
   авто-тестом на стык (шаг 6).
3. **Тяжёлый LCP (три preloaded растра)** → один `<picture>`/один preload (шаги 2+3).

## 8. Open-source референсы (что заимствовать)
| Часть SDINC | Референс | Заимствовать | Избегать |
|---|---|---|---|
| Устройство / оверлеи | InM1nd/portfolio (Pip-Boy), elih.net (Astro+GH-Pages) | CRT-эстетика, Astro→Pages-пайплайн | framework-heavy |
| Ротор / детенты | jQuery-Knob (4.9K★), smartknob (22K★, active) | детент/угол→значение, endstop→SFX | jQuery, hardware-слой |
| Машина режимов | StateSafe (typed FSM, 0 deps) | тип-безопасные transition/guards | runtime-зависимость |
| 8 экранов (данные) | satnaing/terminal-portfolio | config-driven screens | React/Styled |
| WebAudio SFX | sfxr.js (vanilla, без deps) | синтез огибающей клика/детента | зависимость (неактивен) |
| Visual regression | WebDriverIO/visual-testing | toMatchScreenshot workflow | субпиксельный flake → толеранция + фикс. 4K |

> Слабые углы поиска (честно): «single raster + HTML overlay» как open-source
> почти не существует (device UI закрыты в играх). Ваш ротор, вероятно, net-new —
> заимствуется только детент-модель, не готовый код.

## 9. Локально установленные скиллы (локально, без -g; в .gitignore)
- `.agents/skills/astro` — официальный Astro Team skill (MIT, 19.9K installs) — Astro/SSG/CI.
- `.agents/skills/playwright-visual-testing` — visual regression / Playwright (1.4K installs).
Оба vetted (прочитаны SKILL.md, безопасные, без подозрительных команд). `.agents/` уже в .gitignore — в репо не попадают.

## 10. Оценка текущего кода (итог аудитов)
Код **production-grade по интерактиву/честности/фокусу/звуку**: сильные комментарии,
50 unit + 16 visual тестов, чистые инварианты. Кода-долга умеренно:
**~2–3 дня** на (a) реальный фронт заголовков [P0], (b) `AudioContext.suspend()`,
(c) teardown для SPA-готовности, (d) полный cqw декоративного слоя. В TS-ядре
**нет «сломает в проде»** — деградация только допустимая.
