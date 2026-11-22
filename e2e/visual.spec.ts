import { test, expect } from '@playwright/test';

/**
 * Visual regression suite: one screenshot per direction preview scene and
 * per direction detail page.
 * Run against a live `npm run preview` server (port 4322).
 * First run generates baselines into e2e/screenshots/; subsequent runs
 * fail if the pixel diff exceeds maxDiffPixelRatio (2%).
 */

const DIRECTIONS = [
  { name: 'media', index: 0, file: 'list-media' },
  { name: 'game', index: 1, file: 'list-game' },
  { name: 'open-source', index: 2, file: 'list-open-source' },
  { name: 'rag', index: 3, file: 'list-rag' },
  { name: 'chatbot', index: 4, file: 'list-chatbot' },
  { name: 'calls', index: 5, file: 'list-calls' },
  { name: 'shorts', index: 6, file: 'list-shorts' },
  { name: 'restore', index: 7, file: 'list-restore' },
] as const;

async function selectAndCapture(
  page: import('@playwright/test').Page,
  itemIndex: number,
  shotName: string,
  openDetail = false,
) {
  await page.goto('/');
  await page.waitForTimeout(300);
  // The baked tab row is persistent chrome; navigate to the projects list.
  await page.locator('.tab-control[data-action="section:projects"]').click({ timeout: 10000 });
  await page.locator('.project-item').nth(itemIndex).click({ timeout: 10000 });
  await page.waitForTimeout(200);
  if (openDetail) {
    await page.locator('#project-open').click({ timeout: 10000 });
    // The vault-open sequence runs ~650ms (0.15s content delay + 0.5s keyframe)
    // and the class is cleared at 750ms. Capturing at 200ms recorded a frame
    // from the middle of that animation, so the screenshot only ever matched
    // the old code that cancelled the keyframes after one frame. Wait for the
    // sequence to finish instead of guessing a delay.
    await page.waitForFunction(
      () => !document.querySelector('.project-view')?.classList.contains('is-opening'),
      undefined,
      { timeout: 5000 },
    );
  }
  // The device (3:2) is taller than the 720px test viewport, so the browser
  // auto-scrolls the page to whatever control was just clicked and the resting
  // scroll position varies between runs. Pin it before capturing, otherwise
  // the screenshot depends on where the page happened to stop.
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForFunction(() => window.scrollY === 0, undefined, { timeout: 2000 });
  // Let any pending reveal transition settle so the capture is a final state.
  await page.waitForTimeout(150);
  await expect(page).toHaveScreenshot(shotName + '.png');
}

test.describe('direction preview scenes (level 1)', () => {
  for (const d of DIRECTIONS) {
    test(`preview scene: ${d.name}`, async ({ page }) => {
      await selectAndCapture(page, d.index, d.file);
    });
  }
});

test.describe('detail pages (level 2)', () => {
  for (const d of DIRECTIONS) {
    test(`detail page: ${d.name}`, async ({ page }) => {
      await selectAndCapture(page, d.index, `detail-${d.name}`, true);
    });
  }
});
