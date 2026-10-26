// Restoration preview: a small before/after comparison with a switcher.
// The frames are an explicitly synthetic training sample — never presented
// as an actual restoration result.

import { originTag, pick, selectOnly } from './index';
import { registerPreview } from './registry';
import type { ProjectPreview } from './types';

const NOISE: Array<[number, number]> = [
  [12, 14], [22, 30], [31, 10], [42, 24], [55, 16], [61, 34], [70, 12], [78, 28], [86, 18], [18, 40], [47, 42], [74, 44],
];

export const restorationPreview: ProjectPreview = {
  id: 'restoration',
  mount(root) {
    const layout = document.createElement('div');
    layout.className = 'pv-restore-layout';

    const stage = document.createElement('div');
    stage.className = 'pv-restore-stage';
    stage.setAttribute('aria-hidden', 'true');
    const noise = NOISE.map(([x, y]) => `<line x1="${x}" y1="${y}" x2="${x + 4}" y2="${y + 3}" stroke="#2c5a3c" stroke-width="1"/>`).join('');
    stage.innerHTML =
      '<svg viewBox="0 0 100 52" preserveAspectRatio="none">' +
      '<rect x="1" y="1" width="98" height="50" fill="#0c1f14" stroke="#2c5a3c" stroke-width="1"/>' +
      `<g class="pv-restore-before">${noise}</g>` +
      '<line x1="50" y1="2" x2="50" y2="50" stroke="#3f7a52" stroke-width="1" stroke-dasharray="2 2"/>' +
      '<path class="pv-restore-contour" d="M30 34 q10 -14 20 0 q10 14 20 0" fill="none" stroke="#9cc4a6" stroke-width="2" opacity="0.35"/>' +
      '</svg>';

    const picks = document.createElement('div');
    picks.className = 'pv-picks';
    const note = document.createElement('p');
    note.className = 'pv-note';
    note.textContent = 'Кадр условный: слева — имитация дефектов, справа — чистая версия.';
    const buttons = [
      { label: 'До', mode: 'before', caption: '«До»: шум и царапины носителя (имитация).' },
      { label: 'После', mode: 'after', caption: '«После»: дефекты убраны, контур усилен (имитация).' },
    ].map((item) => {
      const button = pick(item.label, `Показать кадр: ${item.label}`);
      button.addEventListener('click', () => {
        selectOnly(buttons, button);
        const before = stage.querySelector<SVGGraphicsElement>('.pv-restore-before');
        const contour = stage.querySelector<SVGGraphicsElement>('.pv-restore-contour');
        const showBefore = item.mode === 'before';
        if (before) before.setAttribute('opacity', showBefore ? '1' : '0.15');
        if (contour) contour.setAttribute('opacity', showBefore ? '0.35' : '1');
        stage.classList.toggle('show-after', !showBefore);
        note.textContent = item.caption;
      });
      return button;
    });
    picks.append(...buttons, note, originTag('УЧЕБНЫЙ ПРИМЕР'));

    layout.append(stage, picks);
    root.append(layout);
  },
};

registerPreview(restorationPreview);
