// Single source of demo texts and direction data for the device scene.
// Texts come from the approved V5 package (scene.json content + nodes).
// They are demonstrational placeholders, not claims about the user.

export interface DirectionInfo {
  title: string;
  description: string;
}

export type DirectionKey = 'vision' | 'llm' | 'auto' | 'system';

/** Static labels rendered over clean plates when switched to HTML mode. */
export const SCENE_TEXT: Record<string, string> = {
  screen_title: 'SDINC / PERSONAL SYSTEM',
  serial: 'S/N 0427-316',
  mod: 'MOD 1.0',
  button_profile: 'ПРОФИЛЬ',
  button_projects: 'ПРОЕКТЫ',
  button_contact: 'СВЯЗЬ',
  node_vision: 'VISION',
  node_llm: 'LLM',
  node_auto: 'AUTO',
  node_system: 'SYSTEM',
  card_title: 'LLM SYSTEMS',
  card_description: 'Языковые модели\nв прикладных системах',
  open_projects: 'ПРОЕКТЫ',
  tab_profile: 'ПРОФИЛЬ',
  tab_projects: 'ПРОЕКТЫ',
  tab_contact: 'СВЯЗЬ',
};

export const DIRECTIONS: Record<DirectionKey, DirectionInfo> = {
  vision: {
    title: 'VISION',
    description: 'Компьютерное зрение.\nДемонстрационные данные.',
  },
  llm: {
    title: 'LLM SYSTEMS',
    description: 'Языковые модели\nв прикладных системах',
  },
  auto: {
    title: 'AUTOMATION',
    description: 'Автоматизация процессов.\nДемонстрационные данные.',
  },
  system: {
    title: 'SYSTEM DESIGN',
    description: 'Архитектура систем.\nДемонстрационные данные.',
  },
};

export const DIRECTION_KEYS = Object.keys(DIRECTIONS) as DirectionKey[];

export const DEFAULT_DIRECTION: DirectionKey = 'llm';
