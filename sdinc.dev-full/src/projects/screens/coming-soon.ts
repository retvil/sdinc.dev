// Shared "demo coming soon" stub for direction screens that are not yet
// built as interactive level-3 demonstrations. The direction's level-2
// description (essence / problem / approach / capabilities / outcome) is
// already shown on the detail page; this screen is the placeholder that
// appears when the user opens the demonstration for a direction whose
// interactive build is still pending. It is honest: it states the demo
// is not yet available and does not fake a result.
//
// Rotor step/confirm are no-ops: there is nothing to step or confirm on
// a placeholder, so they keep the screen inert (no sound, no state).

import type { ProjectScreen, ProjectScreenId } from '../types';
import { el, originNote, statusLine } from '../ui';

export function createComingSoonScreen(id: ProjectScreenId): ProjectScreen {
  let statusEl: HTMLElement | null = null;

  function mount(host: HTMLElement): void {
    const screen = el('section', 'dir-screen dir-coming-soon');
    screen.dataset.screenId = id;
    screen.hidden = true;
    screen.setAttribute('aria-label', `Демонстрация появится позже: ${id}`);

    const title = el('h3', 'dir-heading');
    title.textContent = 'Демонстрация появится позже';
    const note = originNote('Интерактивная демонстрация этого направления ещё не собрана. Описание направления — на странице выше.');
    statusEl = statusLine();
    statusEl.textContent = 'Демонстрация недоступна.';

    screen.append(title, note, statusEl);
    host.append(screen);
  }

  function enter(): void {
    // No focus steal; the rotor and detail page already own navigation.
  }

  function leave(): void {
    if (statusEl) statusEl.textContent = '';
  }

  function step(): void {
    // Inert: nothing to step on a placeholder.
  }

  function confirm(): void {
    // Inert: nothing to confirm on a placeholder.
  }

  return { id, mount, enter, leave, step, confirm };
}
