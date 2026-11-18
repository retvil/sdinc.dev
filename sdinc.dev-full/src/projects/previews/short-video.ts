// Short-video preview: a wide source frame flowing into a compact group of
// vertical clips. No detailed pipeline, no publish buttons — the full
// production chain stays in the level-3 demonstration.

import { illustration } from './index';
import { registerPreview } from './registry';
import type { ProjectPreview } from './types';

const SVG =
  '<svg viewBox="0 0 100 56" preserveAspectRatio="xMidYMid meet">' +
  // one wide source frame (landscape)
  '<rect x="8" y="14" width="40" height="28" rx="2.5" fill="#1d3f2a" stroke="#9cc4a6" stroke-width="1.6"/>' +
  '<circle cx="20" cy="26" r="4" fill="none" stroke="#4f8f63" stroke-width="1.2"/>' +
  // transition
  '<path d="M52 28 h12 m0 0 l-5 -4 m5 4 l-5 4" fill="none" stroke="#4f8f63" stroke-width="1.3" stroke-linecap="round"/>' +
  // compact group of vertical clips (portrait)
  '<rect x="68" y="12" width="9" height="18" rx="1.5" fill="none" stroke="#3f7a52" stroke-width="1.3"/>' +
  '<rect x="79" y="12" width="9" height="18" rx="1.5" fill="none" stroke="#3f7a52" stroke-width="1.3"/>' +
  '<rect x="90" y="12" width="9" height="18" rx="1.5" fill="none" stroke="#3f7a52" stroke-width="1.3"/>' +
  '</svg>';

export const shortVideoPreview: ProjectPreview = {
  id: 'short-video',
  mount(root) {
    illustration(root, SVG, 'УСЛОВНАЯ ИЛЛЮСТРАЦИЯ');
  },
};

registerPreview(shortVideoPreview);
