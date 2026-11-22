// Scroll reveal for the display's internal scroll containers.
//
// The device shows HTML content inside a fixed glass area. Several of those
// surfaces scroll internally (project description, project list, contact list,
// direction demo panes). Blocks below the scroll fold are simply rendered
// already — they appear with no transition while the user scrolls to them.
//
// This module gives those blocks a quiet entry: fade in plus a small upward
// settle, cascading by reading order within one batch.
//
// Design constraints:
//   - Progressive enhancement. Nothing is hidden until JS runs, so a broken
//     bundle or a no-JS load still shows every block.
//   - Reduced motion wins: with `prefers-reduced-motion: reduce` (or no
//     IntersectionObserver) every block is left visible and no observer is
//     created at all.
//   - Only blocks that are genuinely below the fold are armed. A block that is
//     already inside its scrollport when scanned stays visible and never
//     animates — this is what keeps an appended chat message from flashing.
//   - One-shot per block: a revealed block is unobserved, so scrolling back up
//     never re-hides or replays it.
//   - The observer root is the scroll container itself, so "visible" means
//     "inside the scrollport", not "inside the page viewport".

interface TargetSpec {
  /** Scroll container, matched inside #device. */
  container: string;
  /** Revealable blocks. Direct-child selectors keep nesting unambiguous. */
  items: string;
}

const TARGETS: readonly TargetSpec[] = [
  { container: '.project-detail', items: '.detail-essence, .detail-section, .detail-demo-open' },
  { container: '.project-list', items: ':scope > li' },
  { container: '.contact-list', items: ':scope > li' },
  { container: '.dir-screen', items: ':scope > *' },
  { container: '.dir-open-catalog', items: ':scope > *' },
  { container: '.dir-open-passport', items: ':scope > *' },
  { container: '.dir-rag-left', items: ':scope > *' },
  { container: '.dir-rag-right', items: ':scope > *' },
  { container: '.dir-game-right', items: ':scope > *' },
  { container: '.dir-chat-log', items: ':scope > *' },
];

export const REVEAL_HIDDEN = 'is-reveal';
export const REVEAL_SHOWN = 'is-revealed';

/** Cap on the cascade index so a long batch never waits seconds. */
const MAX_STAGGER = 6;

let containerObservers = new WeakMap<HTMLElement, IntersectionObserver>();
let observers: IntersectionObserver[] = [];
let mutationObserver: MutationObserver | null = null;
let visibilityObserver: IntersectionObserver | null = null;
let watchedContainers = new WeakSet<HTMLElement>();
let seen = new WeakSet<HTMLElement>();
let scheduled = false;
let initialized = false;

function prefersReducedMotion(): boolean {
  return (
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

/** Environment can animate: JS present, motion allowed, observer available. */
function canAnimate(): boolean {
  return typeof IntersectionObserver === 'function' && !prefersReducedMotion();
}

/** Visual (document) order — batches cascade the way the eye reads them. */
function byDomOrder(a: HTMLElement, b: HTMLElement): number {
  if (a === b) return 0;
  return a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
}

/**
 * True when the block already sits fully inside its scrollport, so animating it
 * would read as a flash rather than an entry.
 */
function isInsideScrollport(item: HTMLElement, container: HTMLElement): boolean {
  const itemRect = item.getBoundingClientRect();
  const boxRect = container.getBoundingClientRect();
  if (boxRect.width === 0 || boxRect.height === 0) return false;
  return itemRect.top >= boxRect.top - 1 && itemRect.bottom <= boxRect.bottom + 1;
}

/** A container with no layout (hidden panel, unmounted screen) cannot be
 *  measured yet — its blocks must be left untouched and re-examined when it
 *  actually appears. */
function hasLayout(container: HTMLElement): boolean {
  const box = container.getBoundingClientRect();
  return box.width > 0 && box.height > 0;
}

/**
 * Watches a still-hidden container so the reveal arms as soon as it gains
 * layout. Without this, a panel that first measures zero (any tab other than
 * the one open on load) would either stay unarmed forever or — worse — arm
 * from meaningless rects. One observer for every container; disconnecting
 * happens in dispose.
 */
function watchVisibility(container: HTMLElement): void {
  if (watchedContainers.has(container)) return;
  watchedContainers.add(container);
  if (!visibilityObserver) {
    visibilityObserver = new IntersectionObserver(
      (entries) => {
        // A container that became measurable is worth another look.
        if (entries.some((entry) => entry.isIntersecting)) scheduleScan();
      },
      { threshold: 0 },
    );
  }
  visibilityObserver.observe(container);
}

/** Leaves every matched block visible. Used when animation is not available. */
function revealAll(root: ParentNode): void {
  for (const spec of TARGETS) {
    for (const container of root.querySelectorAll<HTMLElement>(spec.container)) {
      for (const item of container.querySelectorAll<HTMLElement>(spec.items)) {
        item.classList.remove(REVEAL_HIDDEN);
        item.classList.add(REVEAL_SHOWN);
      }
    }
  }
}

function observerFor(container: HTMLElement): IntersectionObserver {
  const existing = containerObservers.get(container);
  if (existing) return existing;

  const observer = new IntersectionObserver(
    (entries) => {
      const batch = entries
        .filter((entry) => entry.isIntersecting)
        .map((entry) => entry.target as HTMLElement);
      if (batch.length === 0) return;
      batch.sort(byDomOrder);
      batch.forEach((item, index) => {
        // Per-batch cascade: the first block leads, the rest follow in reading
        // order. Capped so a long list stays responsive.
        item.style.setProperty('--reveal-i', String(Math.min(index, MAX_STAGGER)));
        item.classList.remove(REVEAL_HIDDEN);
        item.classList.add(REVEAL_SHOWN);
        observer.unobserve(item);
      });
    },
    // Slightly inset bottom edge: a block starts revealing just before it is
    // fully in, so the settle finishes about when the user arrives.
    { root: container, threshold: 0.01, rootMargin: '0px 0px -6% 0px' },
  );

  containerObservers.set(container, observer);
  observers.push(observer);
  return observer;
}

/** Arms every not-yet-seen block inside the current tree. Idempotent. */
function scan(): void {
  if (!canAnimate()) {
    revealAll(document);
    return;
  }

  const root: ParentNode = document.getElementById('device') ?? document;
  for (const spec of TARGETS) {
    for (const container of root.querySelectorAll<HTMLElement>(spec.container)) {
      // A hidden panel (or a screen that has not mounted yet) measures as zero
      // and yields meaningless rects. Skip it entirely and mark nothing: the
      // blocks are re-examined by the next scan, which the visibility watcher
      // schedules as soon as the container gets layout.
      if (!hasLayout(container)) {
        watchVisibility(container);
        continue;
      }
      const items = container.querySelectorAll<HTMLElement>(spec.items);
      if (items.length === 0) continue;
      let observer: IntersectionObserver | null = null;
      for (const item of items) {
        // Nested scrollers: a block belongs to the nearest listed container.
        if (seen.has(item)) continue;
        seen.add(item);
        if (isInsideScrollport(item, container)) continue;
        if (!observer) observer = observerFor(container);
        item.style.setProperty('--reveal-i', '0');
        item.classList.add(REVEAL_HIDDEN);
        observer.observe(item);
      }
    }
  }
}

function scheduleScan(): void {
  if (scheduled) return;
  scheduled = true;
  const run = (): void => {
    scheduled = false;
    scan();
  };
  if (typeof requestAnimationFrame === 'function') requestAnimationFrame(run);
  else setTimeout(run, 16);
}

/**
 * Arms scroll reveal. Safe to call more than once: a second call is a no-op
 * until disposeScrollReveal() runs.
 *
 * Direction screens mount lazily on first activation, so the module also
 * watches #device for new children and re-scans (coalesced to one frame).
 */
export function initScrollReveal(): void {
  if (initialized) return;
  initialized = true;
  scan();

  if (typeof MutationObserver === 'function') {
    const root = document.getElementById('device') ?? document.body;
    mutationObserver = new MutationObserver(scheduleScan);
    mutationObserver.observe(root, { childList: true, subtree: true });
  }
}

/** Releases observers and listeners. Idempotent; for SPA remounts and tests. */
export function disposeScrollReveal(): void {
  for (const observer of observers) observer.disconnect();
  observers = [];
  containerObservers = new WeakMap<HTMLElement, IntersectionObserver>();
  visibilityObserver?.disconnect();
  visibilityObserver = null;
  watchedContainers = new WeakSet<HTMLElement>();
  seen = new WeakSet<HTMLElement>();
  mutationObserver?.disconnect();
  mutationObserver = null;
  scheduled = false;
  initialized = false;
}
