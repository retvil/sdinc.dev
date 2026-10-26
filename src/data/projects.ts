// Project section data — separate from components (representation).
// The section lists EIGHT lines of work (directions) plus ONE explicitly
// demonstrational sample project. Directions are lines of work, NOT finished
// products: no invented product names, metrics, links, technologies,
// screenshots or results. Only the demo project carries schematic components
// and task/role/result copy, which plainly state that real information has
// not been added.

export type ProjectKind = 'demo' | 'direction';

export interface ProjectComponent {
  id: string;
  /** Short node label on the project schematic. */
  label: string;
  /** Explanation shown when the component node is selected. */
  description: string;
}

export interface ProjectInfo {
  id: string;
  title: string;
  shortDescription: string;
  /**
   * 'demo' — explicitly demonstrational sample of the section structure;
   * 'direction' — a confirmed line of work without product materials yet.
   */
  kind: ProjectKind;
  /** Schematic components — only the demo sample has them. */
  components: ProjectComponent[];
  /** Task/role/result copy — only the demo sample has one. */
  details?: {
    task: string;
    role: string;
    result: string;
  };
}

/** Lines of work, user-confirmed order (no product claims). */
const WORK_DIRECTIONS: ProjectInfo[] = [
  {
    id: 'direction-video-audio',
    title: 'Видео- и аудиоаналитика',
    shortDescription:
      'Инструменты для анализа видео и звука: обработка медиаданных, поиск значимых фрагментов и извлечение полезной информации.',
    kind: 'direction',
    components: [],
  },
  {
    id: 'direction-game',
    title: 'Игровые проекты',
    shortDescription: 'Разработка игровых механик, прототипов и интерактивных систем.',
    kind: 'direction',
    components: [],
  },
  {
    id: 'direction-open-source',
    title: 'Открытые разработки',
    shortDescription: 'Собственные приложения, инструменты и эксперименты с исходным кодом на GitHub.',
    kind: 'direction',
    components: [],
  },
  {
    id: 'direction-rag',
    title: 'RAG-системы',
    shortDescription:
      'Работа с документами и базами знаний: поиск информации и подготовка ответов с опорой на материалы источников.',
    kind: 'direction',
    components: [],
  },
  {
    id: 'direction-chatbot',
    title: 'Собственный чат-бот',
    shortDescription: 'Чат-бот с собственной логикой диалога и инструментами для автоматизации задач.',
    kind: 'direction',
    components: [],
  },
  {
    id: 'direction-call-analytics',
    title: 'Аналитика звонков',
    shortDescription:
      'Транскрибация разговоров колл-центра и анализ их содержания для оценки качества общения.',
    kind: 'direction',
    components: [],
  },
  {
    id: 'direction-short-video',
    title: 'Автоматизация коротких видео',
    shortDescription:
      'ПО для создания коротких роликов, автоматического перевода и дубляжа на 10 языков с последующей автопубликацией.',
    kind: 'direction',
    components: [],
  },
  {
    id: 'direction-video-restore',
    title: 'Реставрация видео',
    shortDescription:
      'Восстановление и улучшение качества мультфильмов и фильмов: очистка изображения и повышение детализации.',
    kind: 'direction',
    components: [],
  },
];

export const DEMO_PROJECT: ProjectInfo = {
  id: 'demo',
  title: 'Демонстрационный проект',
  shortDescription: 'Образец наполнения раздела. Реальные проекты пока не добавлены.',
  kind: 'demo',
  components: [
    {
      id: 'input',
      label: 'ВВОД',
      description: 'Условный блок получения данных. Демонстрационные данные.',
    },
    {
      id: 'processing',
      label: 'ОБРАБОТКА',
      description: 'Условный блок обработки. Демонстрационные данные.',
    },
    {
      id: 'output',
      label: 'ВЫВОД',
      description: 'Условный блок представления результата. Демонстрационные данные.',
    },
  ],
  details: {
    task: 'Задача: показать структуру раздела на условной системе из трёх блоков. Реальное описание не добавлено.',
    role: 'Моя роль: сведения ещё не добавлены.',
    result: 'Результат: сведения ещё не добавлены.',
  },
};

export const PROJECTS: ProjectInfo[] = [...WORK_DIRECTIONS, DEMO_PROJECT];
