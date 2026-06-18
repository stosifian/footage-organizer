import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  retries: 0,
  // E2E tests are slow — run sequentially to avoid port/process conflicts
  workers: 1,
  reporter: [['list'], ['html', { open: 'never' }]],
})
