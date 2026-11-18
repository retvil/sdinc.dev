// Side-effect import: registers all eight direction screens in the registry.
// Demo does not register — it keeps its built-in schematic view.

import { registerScreen } from '../registry';
import { createMediaAnalyticsScreen } from './media-analytics';
import { createGameScreen } from './game';
import { createOpenSourceScreen } from './open-source';
import { createRagScreen } from './rag';
import { createChatbotScreen } from './chatbot';
import { createCallAnalyticsScreen } from './call-analytics';
import { createShortVideoScreen } from './short-video';
import { createRestorationScreen } from './restoration';

registerScreen('media-analytics', createMediaAnalyticsScreen);
registerScreen('game', createGameScreen);
registerScreen('open-source', createOpenSourceScreen);
registerScreen('rag', createRagScreen);
registerScreen('chatbot', createChatbotScreen);
registerScreen('call-analytics', createCallAnalyticsScreen);
registerScreen('short-video', createShortVideoScreen);
registerScreen('restoration', createRestorationScreen);
