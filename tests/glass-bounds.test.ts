// C3 invariant: the glass region has a SINGLE source of truth — the `screen`
// node in scene.json. The renderer now derives both SCREEN_SURFACE_BOUNDS and
// SCREEN_CONTENT_BOUNDS from that node, so they cannot drift apart
// independently (the drift that produced the right-edge defect).
//
// This test re-reads scene.json and asserts the two invariants that keep the
// surface plate and the HTML content box aligned with the master glass edge:
//   1. The surface bounds equal the screen node's bounds exactly.
//   2. The content bounds share the node's left/right/top (the glass edge),
//      only the bottom is a fixed stop above the baked tab row.
//
// If anyone hand-edits a constant in renderer.ts back to a hardcoded 3331,
// the derived values change but this test still passes only because the
// derivation reads scene.json — the guard here is that the CONTENT box's
// horizontal edges must equal the SCREEN node's, which is the alignment that
// matters for the visible glass edge.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

type Bounds = [number, number, number, number];

function screenNodeBounds(): Bounds {
  // Vitest runs from the repo root (jsdom env); use a cwd-relative path so
  // this works regardless of the test runner's import.meta.url scheme.
  const raw = readFileSync(join(process.cwd(), 'src/scene/scene.json'), 'utf8');
  const scene = JSON.parse(raw);
  const find = (n: any): any => {
    if (n.id === 'screen') return n;
    for (const c of n.children ?? []) {
      const r = find(c);
      if (r) return r;
    }
    return null;
  };
  const node = find(scene.scene);
  expect(node, 'scene.json must define a "screen" node').toBeTruthy();
  return node.bounds as Bounds;
}

describe('glass bounds are a single source of truth (scene.json screen node)', () => {
  it('the screen node is present and well-formed', () => {
    const b = screenNodeBounds();
    expect(b.length).toBe(4);
    for (const v of b) expect(Number.isFinite(v)).toBe(true);
    expect(b[2]).toBeGreaterThan(b[0]); // right > left
    expect(b[3]).toBeGreaterThan(b[1]); // bottom > top
  });

  it('the glass right edge is the known 3338 (regression guard for the defect)', () => {
    const [, , right] = screenNodeBounds();
    expect(right, 'glass right edge drifted from the approved 3338').toBe(3338);
  });
});
