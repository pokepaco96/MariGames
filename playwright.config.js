import { defineConfig } from '@playwright/test';

// Local run builds and serves dist/. Set BASE_URL to test a deployed site instead,
// e.g. PowerShell:  $env:BASE_URL="https://marigames.onrender.com"; npm run test:e2e
const baseURL = process.env.BASE_URL || 'http://localhost:4173';
const browserTests = { testIgnore: 'logic/**' };

export default defineConfig({
  testDir: 'tests',
  timeout: 60_000,
  fullyParallel: true,
  reporter: 'list',
  use: { baseURL, browserName: 'chromium' },
  projects: [
    { name: 'logic', testMatch: 'logic/**/*.spec.js' },
    { name: 'mobile-small', ...browserTests, use: { viewport: { width: 320, height: 568 }, isMobile: true, hasTouch: true } },
    { name: 'tablet', ...browserTests, use: { viewport: { width: 768, height: 1024 }, isMobile: true, hasTouch: true } },
    { name: 'desktop', ...browserTests, use: { viewport: { width: 1280, height: 800 } } },
  ],
  webServer: process.env.BASE_URL
    ? undefined
    : {
        command: 'npm run build && npm run preview -- --port 4173 --strictPort',
        url: 'http://localhost:4173',
        reuseExistingServer: true,
        timeout: 120_000,
      },
});
