// Restoration preview: one abstract frame softly divided into a damaged and
// a clean half. An illustration of the theme, not proof of real processing.

import { illustration } from './index';
import { registerPreview } from './registry';
import type { ProjectPreview } from './types';

const SVG =
  '<svg viewBox="0 0 100 56" preserveAspectRatio="xMidYMid meet">' +
  // single frame
  '<rect x="18" y="8" width="64" height="40" rx="2.5" fill="#0c1f14" stroke="#3f7a52" stroke-width="1.5"/>' +
  // soft vertical divider
  '<line x1="50" y1="9" x2="50" y2="47" stroke="#4f8f63" stroke-width="1" stroke-dasharray="3 3" opacity="0.7"/>' +
  // damaged half: faint scratches and noise
  '<line x1="24" y1="16" x2="30" y2="20" stroke="#2c5a3c" stroke-width="1.1"/>' +
  '<line x1="34" y1="34" x2="40" y2="30" stroke="#2c5a3c" stroke-width="1.1"/>' +
  '<line x1="28" y1="40" x2="34" y2="42" stroke="#2c5a3c" stroke-width="1.1"/>' +
  '<circle cx="40" cy="18" r="0.8" fill="#2c5a3c"/>' +
  '<circle cx="26" cy="30" r="0.8" fill="#2c5a3c"/>' +
  // clean half: a clear, calm contour
  '<path d="M56 34 q6 -12 14 0 q6 10 14 -2" fill="none" stroke="#9cc4a6" stroke-width="1.8" stroke-linecap="round"/>' +
  '</svg>';

export const restorationPreview: ProjectPreview = {
  id: 'restoration',
  mount(root) {
    illustration(root, SVG, 'УЧЕБНЫЙ ПРИМЕР');
  },
};

registerPreview(restorationPreview);
