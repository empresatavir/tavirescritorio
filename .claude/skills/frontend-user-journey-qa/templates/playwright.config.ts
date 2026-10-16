import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  // Organize testes em tests/e2e e tests/api; mantenha as categorias separadas.
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
  ],
  use: {
    baseURL: process.env.BASE_URL ?? 'http://127.0.0.1:4173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 10_000,
    navigationTimeout: 20_000,
  },
  projects: [
    {
      name: 'web-chromium',
      testMatch: /ui-journeys\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'web-mobile-viewport',
      testMatch: /ui-journeys\.spec\.ts/,
      // Esta é emulação de browser mobile; não é teste de app nativo.
      use: { ...devices['iPhone 13'] },
    },
    {
      name: 'api',
      testMatch: /api-checks\.spec\.ts/,
      use: { browserName: 'chromium' },
    },
  ],
});
