import { defineConfig, devices } from '@playwright/test';

/**
 * End-to-end tests for Pixel Swarm.
 * The game is served by the project's own dev server, and the browser opens on screen (headed)
 * with a phone-sized window, so a run can be watched and recorded.
 */
export default defineConfig({
  testDir: './tests/e2e',
  timeout: 5 * 60 * 1000,            // a full level takes a while: 5 minutes per test
  expect: { timeout: 15 * 1000 },
  fullyParallel: false,
  workers: 1,                        // one browser window at a time (easier to watch)
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://localhost:5173',
    ...devices['Desktop Chrome'],
    viewport: { width: 430, height: 900 },
    headless: process.env.HEADLESS === '1', // the browser is shown, unless HEADLESS=1
    launchOptions: { slowMo: 120 },  // small pause between actions, so every click is visible
    video: { mode: 'on', size: { width: 430, height: 900 } },
    screenshot: 'on',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
    timeout: 30 * 1000,
  },
});
