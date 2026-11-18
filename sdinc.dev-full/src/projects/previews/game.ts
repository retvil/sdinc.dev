// Game projects preview: a small isometric level fragment with one
// expressive game object. No playable field — the working game stays in the
// level-3 demonstration.

import { illustration } from './index';
import { registerPreview } from './registry';
import type { ProjectPreview } from './types';

const SVG =
  '<svg viewBox="0 0 100 56" preserveAspectRatio="xMidYMid meet">' +
  // isometric tiles (a quiet fragment, not a grid)
  '<path d="M50 12 L74 24 L50 36 L26 24 Z" fill="none" stroke="#3f7a52" stroke-width="1.3"/>' +
  '<path d="M50 36 L74 24 L74 36 L50 48 Z" fill="none" stroke="#2c5a3c" stroke-width="1.1"/>' +
  '<path d="M50 36 L26 24 L26 36 L50 48 Z" fill="none" stroke="#2c5a3c" stroke-width="1.1"/>' +
  // one expressive object sitting on the tiles
  '<path d="M50 10 L62 17 L50 24 L38 17 Z" fill="#1d3f2a" stroke="#9cc4a6" stroke-width="1.4"/>' +
  '<path d="M50 24 L62 17 L62 29 L50 36 Z" fill="none" stroke="#4f8f63" stroke-width="1.2"/>' +
  '<path d="M50 24 L38 17 L38 29 L50 36 Z" fill="none" stroke="#4f8f63" stroke-width="1.2"/>' +
  '</svg>';

export const gamePreview: ProjectPreview = {
  id: 'game',
  mount(root) {
    illustration(root, SVG, 'УСЛОВНАЯ ИЛЛЮСТРАЦИЯ');
  },
};

registerPreview(gamePreview);
