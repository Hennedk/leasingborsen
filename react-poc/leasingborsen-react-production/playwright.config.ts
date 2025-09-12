import { defineConfig, devices } from '@playwright/test'

const baseURL = process.env.TEST_BASE_URL || 'http://localhost:5173'

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 60_000,
  expect: { timeout: 5_000 },
  fullyParallel: true,
  reporter: [['list']],
  use: {
    baseURL,
    headless: true,
    viewport: { width: 390, height: 844 },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)'
  },
  projects: [
    {
      name: 'Mobile Chromium',
      use: { ...devices['iPhone 14 Pro'] },
    },
  ],
})

