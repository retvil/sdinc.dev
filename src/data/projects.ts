// Project section data — separate from components (representation).
// Real project materials are not available yet: the section ships with ONE
// explicitly demonstrational project. Role/result state plainly that real
// information has not been added — no invented achievements, clients,
// numbers or technologies.

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
  /** Always true while the section ships demo content only. */
  isDemo: boolean;
  components: ProjectComponent[];
  details: {
    task: string;
    role: string;
    result: string;
  };
}

export const DEMO_PROJECT: ProjectInfo = {
  id: 'demo',
  title: 'Демонстрационный проект',
  shortDescription: 'Образец наполнения раздела. Реальные проекты пока не добавлены.',
  isDemo: true,
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

export const PROJECTS: ProjectInfo[] = [DEMO_PROJECT];
