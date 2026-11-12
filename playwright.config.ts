import { defineConfig, devices } from '@playwright/test';

const executablePath = process.env.PW_CHROMIUM_PATH ?? '/opt/pw-browsers/chromium';

export default defineConfig({
  testDir: './e2e',
  testIgnore: process.env.E2E_REAL_API ? [] : ['**/*.real.spec.ts'],
  timeout: 30_000,
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'off',
    launchOptions: { executablePath },
  },
  projects: [
    {
      name: 'iphone',
      use: { ...devices['iPhone 13'], browserName: 'chromium', launchOptions: { executablePath } },
    },
    { name: 'desktop', use: { ...devices['Desktop Chrome'], launchOptions: { executablePath } } },
  ],
  webServer: {
    command: 'VITE_API_URL=http://localhost:8000/api npm run build && npm run preview',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
