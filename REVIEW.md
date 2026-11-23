# SDINC.dev — Полное ревью (с нуля) + итоги внедрения

> Проведено 2026-11-18. Ревью: 3 Abhibots-модели. Внедрение выполнено по порядку.
> **Финал:** C1, C2, C3 закрыты (артефакты устранены, замерено). L1, L3, L4, L2, L6, L7, L8, L9 + Q1, Q3, Q4 закрыты. Q2 отложен (риск сломать dev-редактор, см. ниже). 50/50 тестов, build clean.
>
> ## Статус внедрения (по блокам)
> | Блок | Статус | Что сделано |
> |---|---|---|
> | **C1** security-заголовки | ✅ | `public/_headers` + `tests/headers.test.ts` честно помечены «неактивны на Pages». Подтверждено живым запросом: на sdinc.dev нет CSP/XFO/nosniff. Заголовки остаются источником истины для будущего Cloudflare/Caddy. |
> | **C2** 2 артефакта | ✅ | `screen-surface.png` пересобрана генератором **с прозрачной (alpha=0) вырезкой** — стеклянная зона теперь Δ≈0 к master'у (правый край 0.00, полоса 0.31 вместо ~11). На dev-сервере проверено. `fix-surface-border.py` устарел. |
> | **C3** единый источник края | ✅ | `renderer.ts` выводит оба bounds из `screen` node в `scene.json`; новый `tests/glass-bounds.test.ts` держит правый край = 3338. |
> | **L1** двойной init | ✅ | `navigateBound` guard — листенер `sdinc:navigate` добавляется один раз. |
> | **L3** confirmContact | ✅ | клик только по видимому (offsetParent ≠ null) и в режиме contact. |
> | **L4** refocus | ✅ | `refocusAfterModeChange` принимает `fallbackId` и ставит фокус только на видимый элемент. |
> | **L2** editor в бандле | ✅ | `sourceFragments`/`sourceUrl` → новый `src/scene/source-lib.ts`; публичный чанк их больше не несёт (проверено по dist/). `SourceFragment` → `types.ts`. |
> | **L6** двойной SFX | ✅ | `clickSfx` — единственный владелец тика; `selectButton(label, aria, onClick, {sfx})` — опция. |
> | **L7** мёртвый scene.json | ✅ | блоки `content`/`nodes` удалены (JSON валиден). |
> | **L8** ProjectScreenId | ✅ | `data` ретранслирует `ProjectScreenId` из `projects/types.ts`; registry **бросает** при неизвестном id. |
> | **L9** тесты экранов | ✅ | `tests/screens.test.ts`: 19 smoke-тестов (mount/activate/step/confirm × 8 + hide/keep-state + throw на неизвестный id). Итого 50/50. |
> | **Q1** .dial-control | ✅ | добавлен в suppression-список (круглая рамка не должна ломаться прямоугольным outline). |
> | **Q3** мёртвый CSS | ✅ | `.schematic` и `.project-schematic` удалены (не используются). |
> | **Q4** комментарий | ✅ | effects.css §2: «z-fighting» заменено на точное описание stacking-context + z-index:1. |
> | **Q2** 25.6 MB PNG | ✅ (безопасно) | `scripts/strip-editor.mjs` теперь trim'ит `dist/assets/device/` до явного allowlist `RUNTIME_ASSETS` (3 master + 3 face-mask + rotor + screen-surface = 8). 74 editor-only PNG больше **не в dist** (~24 MB меньше на деплой). `public/` не трогается — dev-редактор читает все 82 файла. Проверено: dist=8, public=82, dev-сервер /editor 200, build clean. |
> | L5 | — (не баг) | `detail`/`demoBack` уже корректно управляются в `state.ts` (hide по `projectView`); registry управляет только screen-instances. Изменение не нужно. |

## Q2 — как реализовано (безопасно)
Не выносил PNG из `public/` (это сломало бы dev-редактор, читающий `/assets/device/`). Вместо этого **postbuild-trim**: `scripts/strip-editor.mjs` удаляет из `dist/assets/device/` всё, чего нет в явном `RUNTIME_ASSETS` (8 файлов: 3 формата мастера + 3 face-mask + rotor + screen-surface). Dev-сервер при этом отдаёт `public/` целиком, редактор работает. Итог: −74 файла / ~24 MB на деплой, нулевой риск для dev.

---

# (исходный) полный список находок


> Перекрёстная проверка тремя Abhibots-моделями: **claude-opus-5** (ultra, scene/state/registry),
> **claude-sonnet-5** (standard, CSS/безопасность/ассеты), **claude-haiku-4-5** (lite, data/tests/архитектура/артефакты).
> Визуальная проверка артефактов — детерминированно (PIL/NumPy, scripts/find-artifacts.py,
> edge-only-diff.py, surface-edge-delta.py), так как vision-модель в Abhibots не настроена.

---

## 🔴 Critical

### C1. `public/_headers` НЕ работает на GitHub Pages — security-заголовки не применяются
- **Где:** `public/_headers` (весь файл), коммит `cadaa33`.
- **Что:** Файл оформлен как Netlify/Cloudflare `_headers` (per-path globs). GitHub Pages **не поддерживает** этот синтаксис — он просто копируется в `dist/_headers` как статичный файл, но заголовки ответа Pages из него **не генерируются**.
- **Подтверждено эмпирически:** `curl -I https://retvil.github.io/sdinc.dev/` не отдаёт ни `Content-Security-Policy`, ни `X-Frame-Options`, ни `X-Content-Type-Options`, ни `Referrer-Policy` (проверено 2026-11-18). Т.е. весь `cadaa33` на проде — мёртвый код.
- **Следствие:** сайт открыт к clickjacking (нет XFO/DENY), MIME-sniffing (нет nosniff), нет CSP. `tests/headers.test.ts` проверяет только **текст** файла, не факт его применения на хосте — тест даёт ложное ощущение «заголовки на месте».
- **Исправление (по порядку):**
  1. Выбрать реального хоста. Если Pages остаётся — заголовки задавать через **Caddy/Cloudflare Worker** на кастомном домене (sdinc.dev), либо через **GitHub Actions post-deploy** с заголовками в response (Pages сам их не позволяет; единственный нативный путь — CNAME + Cloudflare с transform rules).
  2. Если есть Cloudflare на sdinc.dev — заголовки в Cloudflare Transform Rules (XFO, nosniff, Referrer, Permissions-Policy; CSP — опционально, т.к. static site).
  3. Убрать/закомментировать `public/_headers` или оставить с пометкой «неактивен на Pages», и пометить `tests/headers.test.ts` как проверку только формата, а не применения.

> **Решение принято (2026-11-23): вариант (B) из `ARCHITECTURE_PLAN.md` §4 —
> принять риск.** Статический сайт без аутентификации и пользовательских данных;
> clickjacking/MIME-sniffing/CSP не являются критичной угрозой для личного
> портфолио. `SECURITY.md` в корне задокументировал решение, уязвимости,
> обоснование и путь, как вернуться к варианту (A) при смене хоста.
> `public/_headers` остаётся единым источником истины для будущего хоста,
> который реально применяет заголовки.

### C2. 2 графических артефакта (полоса + двойная тонировка + правый край) — проблема АССЕТА, не CSS
- **Где:** `scripts/make-screen-surface.py:66-95` (`pyramid_fill`) + `scripts/fix-surface-border.py`.
- **Что (замерено):** `screen-surface.png` — это *производная* пластина: внутренний контент (диаграмма + LLM-карта) вырезан и **восстановлен пирамидальной интерполяцией** соседних пикселей, а не оригинальными пикселями стекла. 24px-кромка по 4 сторонам восстановлена побайтово (Δ=0), но **внутренность** отличается от master'а на **mean 11.36 / max 240 lum**.
- **Механика артефакта:** в режимах Projects/Contact пластина рисуется поверх master'а. На прозрачных участках HTML-панелей **просвечивает интерполированная внутренность** (не оригинальное стекло) → (a) горизонтальная полоса на границе «правильная 24px-кромка ↔ интерполированная внутренность», (b) двойная тонировка (стекло master'а под пластинкой + другая зелень пластины), (c) правый край: за 24px правильной кромки идёт интерполированная полоса до 13 lum off → видимый шов.
- **Почему на Профиля чисто:** там пластина не показывается (`renderer.ts:336-343`, `state.ts:413-417`), только master.
- **Исправление (чистое, по возрастанию риска):**
  1. **Лучше всего:** сделать внутренность вырезки в `screen-surface.png` **прозрачной (alpha=0)** и пусть стекло master'а показывает сквозь. Полностью убирает двойную тонировку и полосу. (PNG уже может нести alpha.)
  2. Альтернатива: заполнить вырезку **константным цветом стекла** (медианой непрозрачной области) вместо pyramid_fill.
  3. Либо пересобрать `screen-surface.png` вообще не вырезая — только маскировать контент на уровне CSS (если допустимо).
  4. После пересборки — перегенерировать visual-снапшоты.

### C3. Три источника правого края стекла не связаны инвариантом — риск дрейфа
- **Где:** `renderer.ts:311` `SCREEN_SURFACE_BOUNDS`, `renderer.ts:322` `SCREEN_CONTENT_BOUNDS`, `scene.json:19-26` node `screen`.
- **Что:** все три сейчас = `3338` (после правки Block D), но **никакой код не заставляет их совпадать**. `scene.json`'s `screen` node **не читается рендерером** — он источник истины на бумаге, а реальные константы в `renderer.ts`. Одна правка в `scene.json` без правки `renderer.ts` вернёт дефект правого края.
- **Исправление:** вынести правый край в **единственную** константу/выражение, либо тест: `expect(sceneScreenNode.bounds).toEqual(SCREEN_SURFACE_BOUNDS)` + отдельное assertion, что `SCREEN_CONTENT_BOUNDS` совпадает по x/x2.

---

## 🟡 Logic / Performance

### L1. Двойной `device.init()` → накопление document-листенеров `sdinc:navigate`
- **Где:** `src/pages/index.astro:59` + `src/components/LayerEditor.astro:57`, оба вызывают `device.init()`; `state.ts:604` добавляет `document.addEventListener('sdinc:navigate')` без дедупликации.
- **Сейчас:** замаскировано — `LayerEditor` гейтится `DEV`, публичная страница вызывает `init()` один раз. Но латентный мин: как только оба отрендерятся на одной странице — двойной `handleAction` → двойной SFX + двойная смена режима.
- **Фикс:** хостить `private navigateHandler`; `init()` добавляет листенер только если ещё не добавлен; `resetView`/демоунт — убирает.

### L2. `sourceFragments`/`sourceUrl` / `SourceFragment` шьются в публичный бандл
- **Где:** `renderer.ts:669-686` + импорт в `LayerEditor.astro:50`; `renderer.ts` транзитно шьётся через `Display.astro:9` → `index.astro`.
- **Сейчас:** ~несколько KB JSON + 2 мёртвые функции в публичном чанке (не фича, а лишний вес).
- **Фикс:** перенести `sourceFragments`/`sourceUrl`/`SourceFragment` в dev-only модуль (например `scene/source-lib.ts`), импортировать только из `LayerEditor`.

### L3. `confirmContact()` кликает по скрытому анкору через rAF
- **Где:** `state.ts:191-198`. Если `anchor.offsetParent === null` (анкор скрыт после смены режима), `requestAnimationFrame(doClick)` — клик по **невидимому** элементу → mailto/tg может открыться из-под невидимого контрола или пропасть.
- **Фикс:** проверять `anchor.isConnected && this.mode === 'contact'` перед кликом; не деферить.

### L4. `refocusAfterModeChange` сажает фокус на элемент, который потом скрывается
- **Где:** `state.ts:390-400` + ветка `project` в `setMode`. Для режима `project` фокус на `project-title` ставится **до** `updateProjectView()`, который может скрыть detail-панель если `projectView==='demo'` → фокус на скрытом узле.
- **Фикс:** разрешать цель фокуса **после** всех hide-правил; assert `offsetParent !== null`.

### L5. `registry.activateScreen` прячет сиблингов, но не `detail`/`demoBack`
- **Где:** `registry.ts:47-50` + `state.ts:296-301`. Все 8 `leave()` — пустые no-op; единственное, что прячет неактивные экраны — hide-loop в registry. Будущий экран, который в `enter()` добавит DOM, но не почистит в `leave()`, сломает инвариант.
- **Фикс:** в `activateScreen` явно прятать `project-detail` и `project-demo-back` в соответствии с `projectView`, либо обязать каждый `leave()` чистить свой root.

### L6. `ui.ts`: `selectButton` и `clickSfx` — двойной SFX по конвенции
- **Где:** `ui.ts:39` (`selectButton` сам играет `playScreenClick`) и `ui.ts:64` (`clickSfx` обёртка). Контракт — только в комментарии.
- **Сейчас:** ни один экран не использует оба (проверено), латентно.
- **Фикс:** `clickSfx` — единственный владелец; `selectButton(label, aria, onClick, {sfx=true})` — флаг, не автоплей.

### L7. `scene.json` `content` блок — мёртвый (дублируется в `demo.ts`)
- **Где:** `scene.json:823-840` vs `demo.ts:13-30` `SCENE_TEXT`. Рендер читает `demo.ts`, `scene.json.content` не потребляется. (Block A уже вычистил `content`/`nodes` из `parse.ts`/`types.ts`; остался сам JSON-блок в файле.)
- **Фикс:** удалить `content` и `nodes` блоки из `scene.json` (они не читаются).

### L8. `ProjectScreenRef` (data) и `ProjectScreenId` (projects) — два независимых союза
- **Где:** `src/data/projects.ts:22-30` и `src/projects/types.ts:6-14`. Новый direction = правка 2 союзных типов + реестр. Неиспользуемый `screen:'foo'` — тихий `null` из registry (C3-смежный риск).
- **Фикс:** единый союз `ProjectScreenId`, `data` импортирует его; registry бросает ошибку при неизвестном id (не `console.error`).

### L9. 8 экранов level-3 — ноль прямого тестового покрытия
- **Где:** `tests/` (~28 тестов) покрывают только `DeviceState`; ни один `screens/*.ts` не покрыт.
- **Фикс:** минимум — smoke-тесты mount/enter/leave/step/confirm на каждый экран + 1-2 edge-кейса (NaN-guard `parseIndex`, rotor wrap уже есть в edge-cases).

---

## 🔵 Code Quality / Maintainability

### Q1. `.control:focus-visible` suppression зависит от порядка каскада
- **Где:** `global.css:320-324` (suppression) должна быть после `global.css:73-76` (base outline). Сегодня — да, но `@import './effects.css'` на строке 8 поднимает правила effects **перед** base; новая `:focus-visible`-рамка в effects.css победит suppression **по удаче**, а не по смыслу.
- **Кстати:** `.dial-control` (создаётся в `renderer.ts:238`) сейчас получает **прямоугольную** рамку `.control:focus-visible` (2px solid), ломая конвенцию «контур по форме».
- **Фикс:** перенести suppression в effects.css (в конец), либо сделать base outline opt-in per-class; добавить `.dial-control` в suppression-список.

### Q2. 25.6 MB / 82 editor-only PNG шьются на каждый деплой
- **Где:** `public/assets/device/` (82 файла) → побайтово в `dist/assets/device/`. Runtime реально грузит ~9 файлов (3 master + 3 face-mask + rotor + surface + device). Остальные ~73 — editor source library (`assets.ts:1-3` прямо говорит «never stacked at runtime»), в проде fetch'd лениво только stripped-редактором → 404.
- **Фикс:** перенести неиспользуемые в `assets-source/device/` (вне `public/`), dev-редактору дать отдельный base (паттерн как в `scripts/strip-editor.mjs`). Экономия ~24 MB на деплой.

### Q3. Мёртвый CSS
- **Где:** `global.css:1415-1418` (`.project-schematic`) и `1343-1345` (`.schematic { display:block }`) — классы не встречаются в `src/`.
- **Фикс:** удалить.

### Q4. Комментарий effects.css §2 вводит в заблуждение
- **Где:** `effects.css:27-35` говорит «без z-fighting с master», но `z-index:1` внутри `isolation:isolate` рисует **поверх** всего вью (включая контент). С `pointer-events:none` + 0.015 opacity — безвредно, но комментарий вводит в заблуждение.
- **Фикс:** переписать комментарий.

---

## Чек-лист приоритетных правок (порядок внедрения)

1. **C1** — security-заголовки реально применить (Cloudflare Transform Rules на sdinc.dev или переписать под Caddy; `_headers` — пометить «неактивен на Pages»). *Самое критичное — сейчас сайт без XFO/nosniff/CSP в проде.*
2. **C2** — пересобрать `screen-surface.png` с **прозрачной (alpha=0)** вырезкой (убирает полоса + двойная тонировка + правый шов) → перегенерировать visual-снапшоты. *Это и есть 2 артефакта, которые ты видишь.*
3. **C3** — единый источник правого края + тест-инвариант (не дать дрейфу повторить дефект).
4. **L1** — идемпотентный `init()` listener (защита от двойного SFX).
5. **L3, L4** — фокус/клик по видимым элементам (contact + project-режим).
6. **L2, L7, L8** — вынести editor-only код из публичного бандла, удалить `scene.json.content/nodes`, единый `ProjectScreenId`.
7. **Q2** — вынести 24 MB editor-ассетов из `public/` (footprint деплоя).
8. **Q1, Q4, Q3** — CSS-гигиена (cascade-хрупкость `.dial-control`, мёртвые правила, комментарий).
9. **L5, L6, L9** — hardening registry/SFX-контракта + smoke-тесты экранов.

---

## Что НЕ трогать (по просьбе, Profile)
- `src/scene/renderer.ts` master-mount и `DeviceStage.astro` — Profile не трогать.
- Все 8 level-3 демо **восстановлены** (Block C откатан) — в этом ревью они реально существуют и покрыты, но не тестами (L9).

## Методология / модели
- Abhibots: `claude-opus-5` (ultra) — scene/state/registry; `claude-sonnet-5` (standard) — CSS/безопасность/ассеты; `claude-haiku-4-5` (lite) — data/tests/архитектура/артефакты. Все три доступны, замена не потребовалась. Vision-модель в Abhibots **не настроена** — артефакты локализованы детерминированно (NumPy), не на глаз.
- Скиллы, установленные локально в фазе ревью (`.agents/skills/`, без `-g`): `web-design-guidelines`, `superior-code-review` (через `npx skills add`). Существующие `code-review`, `improve-codebase-architecture`, `astro`, `diagnosing-bugs`, `domain-modeling`, `triage` — задействованы.
