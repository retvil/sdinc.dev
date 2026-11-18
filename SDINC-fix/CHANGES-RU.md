# Список изменений

1. **`src/styles/effects.css`**
   - Исправлен неработавший селектор `.screen-surface::after` (псевдоэлементы не применяются к `<img>`): сканлайн-эффект перенесён на `.projects-view::before`, `.project-view::before`, `.contact-view::before`.
   - Для `#device .dir-screen` включена внутренняя прокрутка (`overflow-y: auto; pointer-events: auto`) с тематическим скроллбаром, чтобы длинные демонстрации (игры, звонки, видеоаналитика, конвейер) не обрезались снизу.
   - Ограничен размер `.dir-game-svg` через `clamp(140px, 18cqw, 260px)`.
   - Заданы минимальные читаемые размеры шрифта через `clamp()` для подписей (`.dir-origin`, `small`), описаний в превью и кнопок контактов на узких экранах.

2. **`src/styles/projects.css`**
   - Добавлены минимальные размеры шрифта через `clamp()` для `.pv-origin`, `.detail-essence`, `.detail-section h3`, `.detail-section p`, `.detail-capabilities li` и шагов `.detail-capabilities li::before`.
