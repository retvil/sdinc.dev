// Media analytics preview: a conditional video frame linked to an audio
// track. Picking one of three marks highlights the linked frame marker and
// track segment with a short caption. Everything is synthetic and marked.

import { noteLine, originTag, pick, selectOnly } from './index';
import { registerPreview } from './registry';
import type { ProjectPreview } from './types';

const MARKS = [
  { time: '00:05', x: 22, caption: 'Совместный момент — оба собеседника в кадре.' },
  { time: '00:12', x: 52, caption: 'Смена сцены — переход к новому плану.' },
  { time: '00:18', x: 80, caption: 'Крупный план — ключевой фрагмент разговора.' },
] as const;

export const mediaPreview: ProjectPreview = {
  id: 'media-analytics',
  mount(root) {
    const layout = document.createElement('div');
    layout.className = 'pv-media-layout';

    const frame = document.createElement('div');
    frame.className = 'pv-media-frame';
    frame.setAttribute('aria-hidden', 'true');
    frame.innerHTML =
      '<svg viewBox="0 0 100 56" preserveAspectRatio="none">' +
      '<rect x="1" y="1" width="98" height="54" fill="#0c1f14" stroke="#2c5a3c" stroke-width="1"/>' +
      '<line x1="1" y1="40" x2="99" y2="40" stroke="#1d3f2a" stroke-width="1.4"/>' +
      '<circle class="pv-media-subject" cx="34" cy="30" r="9" fill="none" stroke="#3f7a52" stroke-width="1.6"/>' +
      '<circle class="pv-media-subject" cx="66" cy="28" r="7" fill="none" stroke="#3f7a52" stroke-width="1.6"/>' +
      '<line class="pv-media-marker" x1="30" y1="2" x2="30" y2="54" stroke="#9cc4a6" stroke-width="2" opacity="0"/>' +
      '</svg>';

    const track = document.createElement('div');
    track.className = 'pv-media-track';
    track.setAttribute('aria-hidden', 'true');
    for (let i = 0; i < 12; i += 1) {
      const bar = document.createElement('span');
      bar.className = 'pv-media-bar';
      bar.style.setProperty('--h', `${25 + ((i * 37) % 60)}%`);
      track.append(bar);
    }

    const picks = document.createElement('div');
    picks.className = 'pv-picks';
    const note = noteLine();
    note.textContent = 'Выберите отметку на записи.';
    const buttons = MARKS.map((mark) => {
      const button = pick(`Отметка ${mark.time}`, `Показать событие на отметке ${mark.time}`);
      button.addEventListener('click', () => {
        selectOnly(buttons, button);
        const marker = frame.querySelector<SVGLineElement>('.pv-media-marker');
        if (marker) {
          marker.setAttribute('x1', String(mark.x));
          marker.setAttribute('x2', String(mark.x));
          marker.setAttribute('opacity', '1');
        }
        frame.classList.add('active');
        track.classList.add('active');
        note.textContent = mark.caption;
      });
      return button;
    });
    picks.append(...buttons, note, originTag('УСЛОВНЫЙ ПРИМЕР'));

    layout.append(frame, track, picks);
    root.append(layout);
  },
};

registerPreview(mediaPreview);
