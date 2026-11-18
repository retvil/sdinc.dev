// Media analytics preview: a quiet illustration of a video frame with one
// highlighted subject and a single concise sound wave beneath it. No detailed
// timeline, no controls. Purely illustrative — the working analytics stay in
// the level-3 demonstration.

import { illustration } from './index';
import { registerPreview } from './registry';
import type { ProjectPreview } from './types';

const SVG =
  '<svg viewBox="0 0 100 56" preserveAspectRatio="xMidYMid meet">' +
  // frame contour
  '<rect x="14" y="6" width="72" height="34" rx="2.5" fill="none" stroke="#3f7a52" stroke-width="1.4"/>' +
  // one highlighted subject inside the frame
  '<circle cx="38" cy="23" r="7.5" fill="none" stroke="#9cc4a6" stroke-width="1.8"/>' +
  '<circle cx="38" cy="23" r="2" fill="#b7ddc0"/>' +
  // a single, calm sound wave below the frame
  '<path d="M22 48 q4 -6 8 0 t8 0 t8 0 t8 0 t8 0 t8 0" fill="none" stroke="#4f8f63" stroke-width="1.4" stroke-linecap="round"/>' +
  '</svg>';

export const mediaPreview: ProjectPreview = {
  id: 'media-analytics',
  mount(root) {
    illustration(root, SVG, 'УСЛОВНАЯ ИЛЛЮСТРАЦИЯ');
  },
};

registerPreview(mediaPreview);
