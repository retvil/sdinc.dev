// RAG preview: a few document fragments converging into one answer element.
// No full search interface or chat — the working retrieval stays in the
// level-3 demonstration.

import { illustration } from './index';
import { registerPreview } from './registry';
import type { ProjectPreview } from './types';

const SVG =
  '<svg viewBox="0 0 100 56" preserveAspectRatio="xMidYMid meet">' +
  // three document fragments on the left (sheets with a folded corner)
  '<path d="M12 10 h16 v22 h-16 z" fill="none" stroke="#3f7a52" stroke-width="1.3"/>' +
  '<path d="M28 22 l4 -4 v4 z" fill="#1d3f2a" stroke="#3f7a52" stroke-width="1.1"/>' +
  '<path d="M12 36 h16 v12 h-16 z" fill="none" stroke="#3f7a52" stroke-width="1.1" opacity="0.7"/>' +
  '<path d="M22 4 h16 v22 h-16 z" fill="none" stroke="#3f7a52" stroke-width="1.1" opacity="0.7"/>' +
  // converging lines into one answer element
  '<line x1="38" y1="21" x2="62" y2="28" stroke="#4f8f63" stroke-width="1.2"/>' +
  '<line x1="38" y1="42" x2="62" y2="30" stroke="#4f8f63" stroke-width="1.2"/>' +
  '<line x1="38" y1="15" x2="62" y2="26" stroke="#4f8f63" stroke-width="1.2"/>' +
  // one answer element
  '<rect x="62" y="20" width="24" height="16" rx="2.5" fill="#1d3f2a" stroke="#9cc4a6" stroke-width="1.6"/>' +
  '<line x1="66" y1="26" x2="82" y2="26" stroke="#4f8f63" stroke-width="1.4"/>' +
  '<line x1="66" y1="30" x2="78" y2="30" stroke="#3f7a52" stroke-width="1.2"/>' +
  '</svg>';

export const ragPreview: ProjectPreview = {
  id: 'rag',
  mount(root) {
    illustration(root, SVG, 'УЧЕБНЫЙ ПРИМЕР');
  },
};

registerPreview(ragPreview);
