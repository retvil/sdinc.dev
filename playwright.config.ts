import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  use: {
    baseURL: 'http://localhost:4322',
    ...devices['desktop'],
  },
  expect: {
    toHaveScreenshot: {
      // The device is built over a 4K raster master; font antialiasing at
      // ~1536px width can legitimately shift a few pixels. 0.05 keeps
      // genuine regressions failing without tripping on raster noise.
      maxDiffPixelRatio: 0.05,
    },
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  outputDir: 'e2e/test-results',
});
