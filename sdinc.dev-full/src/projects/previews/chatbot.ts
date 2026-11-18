// Chatbot preview: a quiet two-message dialogue around one recognizable
// central bot symbol. No clickable replies, no live conversation — the full
// dialogue tree stays in the level-3 demonstration.

import { illustration } from './index';
import { registerPreview } from './registry';
import type { ProjectPreview } from './types';

const SVG =
  '<svg viewBox="0 0 100 56" preserveAspectRatio="xMidYMid meet">' +
  // user message bubble (left)
  '<rect x="8" y="10" width="34" height="12" rx="6" fill="none" stroke="#3f7a52" stroke-width="1.3"/>' +
  '<line x1="14" y1="16" x2="34" y2="16" stroke="#4f8f63" stroke-width="1.2"/>' +
  // bot symbol (center)
  '<circle cx="50" cy="34" r="9" fill="#1d3f2a" stroke="#9cc4a6" stroke-width="1.6"/>' +
  '<circle cx="47" cy="32" r="1.4" fill="#b7ddc0"/>' +
  '<circle cx="53" cy="32" r="1.4" fill="#b7ddc0"/>' +
  '<line x1="46" y1="37" x2="54" y2="37" stroke="#4f8f63" stroke-width="1.2" stroke-linecap="round"/>' +
  // bot reply bubble (right)
  '<rect x="58" y="44" width="34" height="12" rx="6" fill="none" stroke="#3f7a52" stroke-width="1.3"/>' +
  '<line x1="64" y1="50" x2="84" y2="50" stroke="#4f8f63" stroke-width="1.2"/>' +
  '</svg>';

export const chatbotPreview: ProjectPreview = {
  id: 'chatbot',
  mount(root) {
    illustration(root, SVG, 'УСЛОВНАЯ ИЛЛЮСТРАЦИЯ');
  },
};

registerPreview(chatbotPreview);
