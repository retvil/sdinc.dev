// Open-source preview: a few neatly linked software modules around one
// central element. No fake code, no unconfirmed technology logos.

import { illustration } from './index';
import { registerPreview } from './registry';
import type { ProjectPreview } from './types';

const SVG =
  '<svg viewBox="0 0 100 56" preserveAspectRatio="xMidYMid meet">' +
  // central element
  '<rect x="41" y="20" width="18" height="16" rx="2.5" fill="#1d3f2a" stroke="#9cc4a6" stroke-width="1.6"/>' +
  // surrounding modules
  '<rect x="14" y="8" width="16" height="11" rx="2" fill="none" stroke="#3f7a52" stroke-width="1.3"/>' +
  '<rect x="70" y="8" width="16" height="11" rx="2" fill="none" stroke="#3f7a52" stroke-width="1.3"/>' +
  '<rect x="14" y="37" width="16" height="11" rx="2" fill="none" stroke="#3f7a52" stroke-width="1.3"/>' +
  '<rect x="70" y="37" width="16" height="11" rx="2" fill="none" stroke="#3f7a52" stroke-width="1.3"/>' +
  // quiet connecting lines
  '<line x1="30" y1="14" x2="41" y2="24" stroke="#4f8f63" stroke-width="1.1"/>' +
  '<line x1="70" y1="14" x2="59" y2="24" stroke="#4f8f63" stroke-width="1.1"/>' +
  '<line x1="30" y1="41" x2="41" y2="32" stroke="#4f8f63" stroke-width="1.1"/>' +
  '<line x1="70" y1="41" x2="59" y2="32" stroke="#4f8f63" stroke-width="1.1"/>' +
  '</svg>';

export const openSourcePreview: ProjectPreview = {
  id: 'open-source',
  mount(root) {
    illustration(root, SVG, 'УСЛОВНАЯ ИЛЛЮСТРАЦИЯ');
  },
};

registerPreview(openSourcePreview);
