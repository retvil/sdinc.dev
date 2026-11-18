// Side-effect import: registers all eight direction screens in the registry.
// Demo does not register — it keeps its built-in schematic view.
//
// Three directions ship full interactive level-3 demonstrations
// (media-analytics, game, rag). The remaining five are honest
// "coming soon" placeholders (createComingSoonScreen) — their level-2
// description is already on the detail page; the interactive build is
// still pending. This keeps the deployable light without faking demos.

import { registerScreen } from '../registry';
import { createMediaAnalyticsScreen } from './media-analytics';
import { createGameScreen } from './game';
import { createRagScreen } from './rag';
import { createComingSoonScreen } from './coming-soon';
import type { ProjectScreenId } from '../types';

registerScreen('media-analytics', createMediaAnalyticsScreen);
registerScreen('game', createGameScreen);
registerScreen('rag', createRagScreen);

// Placeholder demonstrations — pending interactive builds.
const STUBBED: readonly ProjectScreenId[] = [
  'open-source',
  'chatbot',
  'call-analytics',
  'short-video',
  'restoration',
];
for (const id of STUBBED) {
  registerScreen(id, () => createComingSoonScreen(id));
}

