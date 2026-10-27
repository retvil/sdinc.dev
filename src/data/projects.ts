// Project section data — separate from components (representation).
// The section lists EIGHT lines of work (directions) plus ONE explicitly
// demonstrational sample project. Directions are lines of work, NOT finished
// products: no invented product names, metrics, links, technologies,
// screenshots or results. Only the demo project carries schematic components
// and task/role/result copy, which plainly state that real information has
// not been added.
//
// Data lives in projects.json (edit that file to change the section content);
// this module adds the type contract and exports the arrays.

import raw from './projects.json';

export type ProjectKind = 'demo' | 'direction';

export interface ProjectComponent {
  id: string;
  /** Short node label on the project schematic. */
  label: string;
  /** Explanation shown when the component node is selected. */
  description: string;
}

/** Dispatcher id for the open-project screen (stable, not array position). */
export type ProjectScreenRef =
  | 'demo'
  | 'media-analytics'
  | 'game'
  | 'open-source'
  | 'rag'
  | 'chatbot'
  | 'call-analytics'
  | 'short-video'
  | 'restoration';

/**
 * Level-2 project page copy (understand first, explore later). Only
 * confirmed directions carry it; wording may be expanded but never adds
 * unconfirmed functions, technologies, metrics or clients.
 */
export interface ProjectDetail {
  /** Composition variant — keeps the eight pages from looking identical. */
  layout: 'compare' | 'thesis' | 'flow' | 'split';
  /** Short essence: 1–2 plain sentences. */
  essence: string;
  /** «Какую задачу решаем». */
  problem: string;
  /** «Как устроено решение». */
  approach: string;
  /** «Основные возможности» — 3–4 confirmed items only. */
  capabilities: string[];
  /** «Что получает пользователь» — no invented metrics or guarantees. */
  outcome: string;
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
  /** Which open-project screen renders this item (demo uses the built-in view). */
  screen: ProjectScreenRef;
  /** Level-2 page copy — only directions have it (demo keeps schematic+tabs). */
  detail?: ProjectDetail;
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
const WORK_DIRECTIONS = raw
  .filter((p) => p.kind === 'direction')
  .map((p) => p as ProjectInfo);

export const DEMO_PROJECT = raw.find((p) => p.kind === 'demo') as ProjectInfo;

export const PROJECTS: ProjectInfo[] = [...WORK_DIRECTIONS, DEMO_PROJECT];
