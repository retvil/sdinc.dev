// Project section data — separate from components (representation).
// The section lists the owner's lines of work (directions). Directions are
// lines of work, NOT finished products: no invented product names, metrics,
// links, technologies, screenshots or results.
//
// Data lives in projects.json (edit that file to change the section content);
// this module adds the type contract and exports the arrays.

import raw from './projects.json';

export type ProjectKind = 'direction';

export interface ProjectComponent {
  id: string;
  /** Short node label on the project schematic. */
  label: string;
  /** Explanation shown when the component node is selected. */
  description: string;
}

/** Dispatcher id for the open-project screen (stable, not array position). */
export type ProjectScreenRef =
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
  /** A confirmed line of work without product materials yet. */
  kind: ProjectKind;
  /** Which open-project screen renders this item. */
  screen: ProjectScreenRef;
  /** Level-2 page copy (directions carry it). */
  detail?: ProjectDetail;
}

/** Lines of work, user-confirmed order (no product claims). */
export const PROJECTS: ProjectInfo[] = raw
  .filter((p) => p.kind === 'direction')
  .map((p) => p as ProjectInfo);
