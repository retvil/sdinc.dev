// Call-analytics preview: two abstract participants linked by a speech wave,
// with a small transcription motif beneath. Visually distinct from the general
// media-audio illustration (single frame + wave). No real recordings.

import { illustration } from './index';
import { registerPreview } from './registry';
import type { ProjectPreview } from './types';

const SVG =
  '<svg viewBox="0 0 100 56" preserveAspectRatio="xMidYMid meet">' +
  // two participants (head + shoulders silhouettes)
  '<circle cx="18" cy="16" r="6" fill="none" stroke="#3f7a52" stroke-width="1.4"/>' +
  '<path d="M9 32 q9 -8 18 0" fill="none" stroke="#3f7a52" stroke-width="1.4"/>' +
  '<circle cx="82" cy="16" r="6" fill="none" stroke="#3f7a52" stroke-width="1.4"/>' +
  '<path d="M73 32 q9 -8 18 0" fill="none" stroke="#3f7a52" stroke-width="1.4"/>' +
  // speech wave between them
  '<path d="M30 22 q3 -5 6 0 t6 0 t6 0" fill="none" stroke="#9cc4a6" stroke-width="1.5" stroke-linecap="round"/>' +
  // small transcription motif (short staggered bars)
  '<line x1="34" y1="44" x2="52" y2="44" stroke="#4f8f63" stroke-width="1.6" stroke-linecap="round"/>' +
  '<line x1="34" y1="48" x2="60" y2="48" stroke="#3f7a52" stroke-width="1.4" stroke-linecap="round"/>' +
  '<line x1="34" y1="52" x2="48" y2="52" stroke="#3f7a52" stroke-width="1.4" stroke-linecap="round" opacity="0.7"/>' +
  '</svg>';

export const callAnalyticsPreview: ProjectPreview = {
  id: 'call-analytics',
  mount(root) {
    illustration(root, SVG, 'УСЛОВНЫЙ ТРАНСКРИПТ');
  },
};

registerPreview(callAnalyticsPreview);
