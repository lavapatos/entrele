import { existsSync } from 'node:fs'

import { defineConfig } from '@playwright/test'

const systemChromiumPath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ?? '/usr/bin/chromium'
const executablePath = existsSync(systemChromiumPath) ? systemChromiumPath : undefined

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: 'line',
  preserveOutput: 'always',
  expect: {
    timeout: 7_000,
  },
  use: {
    baseURL: 'http://127.0.0.1:4173/e2e/',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    launchOptions: executablePath ? { executablePath } : undefined,
  },
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 4173 --strictPort',
    url: 'http://127.0.0.1:4173/e2e/',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
