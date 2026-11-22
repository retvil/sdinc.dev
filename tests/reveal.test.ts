// Unit tests for the scroll-reveal module (src/scene/reveal.ts).
//
// jsdom has no layout engine and no IntersectionObserver, so the module's
// environment gate is exercised directly: with an observer stub present the
// arming path runs, without one everything must be left visible.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  initScrollReveal,
  disposeScrollReveal,
  REVEAL_HIDDEN,
  REVEAL_SHOWN,
} from '../src/scene/reveal';

interface FakeObserver {
  root: Element | null;
  callback: IntersectionObserverCallback;
  observed: Set<Element>;
  disconnected: boolean;
}

let observers: FakeObserver[] = [];

/** Minimal IntersectionObserver stand-in that records observed targets. */
class StubObserver {
  root: Element | null;
  callback: IntersectionObserverCallback;
  observed = new Set<Element>();
  disconnected = false;

  constructor(callback: IntersectionObserverCallback, options?: IntersectionObserverInit) {
    this.callback = callback;
    this.root = (options?.root as Element | null) ?? null;
    observers.push(this as unknown as FakeObserver);
  }

  observe(target: Element): void {
    this.observed.add(target);
  }

  unobserve(target: Element): void {
    this.observed.delete(target);
  }

  disconnect(): void {
    this.disconnected = true;
    this.observed.clear();
  }

  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
}

/** Fires an intersection batch on the observer that watches `target`. */
function intersect(target: Element): void {
  const owner = observers.find((o) => o.observed.has(target));
  if (!owner) throw new Error('target is not observed');
  owner.callback(
    [{ target, isIntersecting: true } as unknown as IntersectionObserverEntry],
    owner as unknown as IntersectionObserver,
  );
}

/**
 * Fires ONE callback with several entries — the real shape of a batch when
 * multiple blocks cross the scrollport in the same frame.
 */
function intersectBatch(targets: readonly Element[]): void {
  if (targets.length === 0) return;
  const owner = observers.find((o) => targets.every((t) => o.observed.has(t)));
  if (!owner) throw new Error('targets are not observed by one observer');
  owner.callback(
    targets.map(
      (target) => ({ target, isIntersecting: true }) as unknown as IntersectionObserverEntry,
    ),
    owner as unknown as IntersectionObserver,
  );
}

function buildDevice(): void {
  document.body.innerHTML = `
    <div id="device">
      <div class="project-detail">
        <p class="detail-essence">essence</p>
        <section class="detail-section">one</section>
        <section class="detail-section">two</section>
      </div>
    </div>`;
}

/** jsdom reports all rects as zero, which the module treats as "unknown". */
function stubRect(el: Element, top: number, bottom: number): void {
  vi.spyOn(el, 'getBoundingClientRect').mockReturnValue({
    top,
    bottom,
    left: 0,
    right: 100,
    width: 100,
    height: bottom - top,
    x: 0,
    y: top,
    toJSON: () => ({}),
  } as DOMRect);
}

describe('scroll reveal', () => {
  beforeEach(() => {
    observers = [];
    vi.stubGlobal('IntersectionObserver', StubObserver);
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }));
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      cb(0);
      return 0;
    });
    buildDevice();
  });

  afterEach(() => {
    disposeScrollReveal();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  it('arms below-the-fold blocks inside the scroller', () => {
    const items = document.querySelectorAll('.project-detail > .detail-section');
    // Container occupies the scrollport; both sections sit below its bottom.
    stubRect(document.querySelector('.project-detail')!, 0, 100);
    items.forEach((item, i) => stubRect(item, 200 + i * 50, 240 + i * 50));

    initScrollReveal();

    items.forEach((item) => expect(item.classList.contains(REVEAL_HIDDEN)).toBe(true));
  });

  it('leaves blocks that are already inside the scrollport untouched', () => {
    const essence = document.querySelector('.detail-essence')!;
    stubRect(document.querySelector('.project-detail')!, 0, 300);
    stubRect(essence, 10, 40);

    initScrollReveal();

    expect(essence.classList.contains(REVEAL_HIDDEN)).toBe(false);
    expect(observers.flatMap((o) => [...o.observed])).not.toContain(essence);
  });

  it('reveals a block once and stops observing it', () => {
    const items = document.querySelectorAll('.project-detail > .detail-section');
    stubRect(document.querySelector('.project-detail')!, 0, 100);
    items.forEach((item, i) => stubRect(item, 200 + i * 50, 240 + i * 50));

    initScrollReveal();
    intersect(items[0]);

    expect(items[0].classList.contains(REVEAL_HIDDEN)).toBe(false);
    expect(items[0].classList.contains(REVEAL_SHOWN)).toBe(true);
    expect(observers.flatMap((o) => [...o.observed])).not.toContain(items[0]);
  });

  it('cascades a batch in document order', () => {
    const items = document.querySelectorAll('.project-detail > .detail-section');
    stubRect(document.querySelector('.project-detail')!, 0, 100);
    items.forEach((item, i) => stubRect(item, 200 + i * 50, 240 + i * 50));

    initScrollReveal();
    // One batch, out of document order — the module must sort before indexing.
    intersectBatch([items[1], items[0]]);

    expect(items[0].style.getPropertyValue('--reveal-i')).toBe('0');
    expect(items[1].style.getPropertyValue('--reveal-i')).toBe('1');
  });

  it('does not arm anything under prefers-reduced-motion', () => {
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: query.includes('prefers-reduced-motion'),
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }));

    initScrollReveal();

    const items = document.querySelectorAll('.project-detail > .detail-section');
    items.forEach((item) => expect(item.classList.contains(REVEAL_HIDDEN)).toBe(false));
    expect(observers).toHaveLength(0);
  });

  it('leaves everything visible when IntersectionObserver is unavailable', () => {
    vi.stubGlobal('IntersectionObserver', undefined);

    initScrollReveal();

    const items = document.querySelectorAll('.project-detail > .detail-section');
    items.forEach((item) => {
      expect(item.classList.contains(REVEAL_HIDDEN)).toBe(false);
      expect(item.classList.contains(REVEAL_SHOWN)).toBe(true);
    });
  });

  it('is idempotent across repeated init calls', () => {
    const detail = document.querySelector('.project-detail')!;
    stubRect(detail, 0, 100);
    document.querySelectorAll('.detail-section').forEach((item, i) => {
      stubRect(item, 200 + i * 50, 240 + i * 50);
    });

    initScrollReveal();
    const created = observers.length;
    initScrollReveal();

    expect(observers.length).toBe(created);
  });

  it('disconnects every observer on dispose', () => {
    stubRect(document.querySelector('.project-detail')!, 0, 100);
    document.querySelectorAll('.detail-section').forEach((item, i) => {
      stubRect(item, 200 + i * 50, 240 + i * 50);
    });

    initScrollReveal();
    expect(observers.length).toBeGreaterThan(0);

    disposeScrollReveal();

    expect(observers.every((o) => o.disconnected)).toBe(true);
  });
});
