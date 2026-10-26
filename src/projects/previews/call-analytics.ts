// Call analytics preview: two participant tracks with segments. Picking a
// segment shows the matching replica. Synthetic transcript only — no real
// personal data, no live recordings.

import { noteLine, originTag, pick, selectOnly } from './index';
import { registerPreview } from './registry';
import type { ProjectPreview } from './types';

const SEGMENTS = [
  { lane: 'operator', width: 30, replica: 'Оператор: «Здравствуйте! Чем можем помочь?»' },
  { lane: 'client', width: 45, replica: 'Клиент: «Хочу уточнить статус моего запроса.»' },
  { lane: 'operator', width: 25, replica: 'Оператор: «Проверяю — ответ направим сегодня.»' },
] as const;

export const callAnalyticsPreview: ProjectPreview = {
  id: 'call-analytics',
  mount(root) {
    const layout = document.createElement('div');
    layout.className = 'pv-calls-layout';

    const lanes = document.createElement('div');
    lanes.className = 'pv-calls-lanes';
    const labels = ['Оператор', 'Клиент'];
    for (const label of labels) {
      const lane = document.createElement('div');
      lane.className = 'pv-calls-lane';
      const name = document.createElement('span');
      name.className = 'pv-calls-name';
      name.textContent = label;
      const line = document.createElement('span');
      line.className = 'pv-calls-line';
      lane.append(name, line);
      lanes.append(lane);
    }

    const picks = document.createElement('div');
    picks.className = 'pv-picks';
    const note = noteLine();
    note.textContent = 'Выберите сегмент разговора.';
    const buttons = SEGMENTS.map((segment, index) => {
      const button = pick(`Сегмент ${index + 1}`, `Показать реплику сегмента ${index + 1}`);
      button.style.setProperty('--w', `${segment.width}%`);
      button.addEventListener('click', () => {
        selectOnly(buttons, button);
        const laneEls = lanes.querySelectorAll<HTMLElement>('.pv-calls-lane');
        laneEls.forEach((lane, i) => lane.classList.toggle('lit', i === (segment.lane === 'operator' ? 0 : 1)));
        note.textContent = segment.replica;
      });
      return button;
    });
    picks.append(...buttons, note, originTag('УСЛОВНЫЙ ТРАНСКРИПТ'));

    layout.append(lanes, picks);
    root.append(layout);
  },
};

registerPreview(callAnalyticsPreview);
