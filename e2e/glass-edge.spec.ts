import { test, expect } from '@playwright/test';

/**
 * D2: guard the RENDERED alignment of the HTML content panels against the
 * baked glass edge. The C3 unit test (tests/glass-bounds.test.ts) proves the
 * CODE keeps the content box's horizontal edges equal to the scene.json
 * "screen" node. This browser test proves the RENDERED result: in every
 * display mode, the content panel's right edge must NOT overrun the glass
 * (screen-surface) right edge — the exact defect that recurred as the
 * right-edge seam.
 *
 * Geometry: both the glass plate (.screen-surface) and the content views
 * (.projects-view / .project-view / .contact-view) are positioned in the
 * same reference space (place() maps ref bounds → % of the device), so
 * comparing their right edges in client space is a direct drift detector.
 * A tolerance of a few CSS px absorbs sub-pixel rounding + font metric
 * differences without masking a real overrun.
 *
 * Runs against a live `npm run dev`/`preview` server (port 4322).
 */

const TOLERANCE_PX = 2;

// Mode → the selector of the content view that is visible in that mode.
const MODE_VIEWS: Array<{ action: string; view: string; label: string }> = [
  { action: 'section:projects', view: '.projects-view', label: 'projects' },
  { action: 'section:contact', view: '.contact-view', label: 'contact' },
];

test.describe('glass right-edge alignment (D2)', () => {
  test('content panel right edge does not overrun the glass in every mode', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(300);

    // Measure the glass plate's right edge once (it is the persistent "panel"
    // group, visible in all non-profile modes).
    const glassRight = async (): Promise<number> => {
      const box = await page.locator('.screen-surface').boundingBox();
      expect(box, 'glass plate (.screen-surface) must be laid out').toBeTruthy();
      return box!.x + box!.width;
    };

    for (const m of MODE_VIEWS) {
      await page.locator(`.tab-control[data-action="${m.action}"]`).click({ timeout: 10000 });
      await page.waitForTimeout(250);
      const viewBox = await page.locator(m.view).boundingBox();
      expect(viewBox, `content view ${m.view} must be laid out in mode ${m.label}`).toBeTruthy();
      const viewRight = viewBox!.x + viewBox!.width;
      const gr = await glassRight();
      // Content must stay inside the glass: its right edge may not extend
      // past the glass right edge by more than the sub-pixel tolerance.
      expect(
        viewRight - gr,
        `${m.label} view right edge overruns the glass by ${Math.round(viewRight - gr)}px`,
      ).toBeLessThanOrEqual(TOLERANCE_PX);
    }

    // Open-project mode: the .project-view panel is the same content box,
    // just a different dataset group; verify it too.
    await page.locator('.tab-control[data-action="section:projects"]').click({ timeout: 10000 });
    await page.locator('.project-item').first().click({ timeout: 10000 });
    await page.waitForTimeout(150);
    await page.locator('#project-open').click({ timeout: 10000 });
    await page.waitForTimeout(250);
    const projView = await page.locator('.project-view').boundingBox();
    expect(projView, '.project-view must be laid out').toBeTruthy();
    const projRight = projView!.x + projView!.width;
    const gr = await glassRight();
    expect(
      projRight - gr,
      `project view right edge overruns the glass by ${Math.round(projRight - gr)}px`,
    ).toBeLessThanOrEqual(TOLERANCE_PX);
  });
});
