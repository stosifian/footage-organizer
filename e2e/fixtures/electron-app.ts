import { test as base, expect } from '@playwright/test'
import { ElectronApplication, Page, _electron as electron } from 'playwright'
import path from 'path'
import os from 'os'

// Isolated userData dir so tests never pick up your real settings/last-opened directory
const TEST_USER_DATA = path.join(os.tmpdir(), 'footage-organizer-e2e')

type Fixtures = {
  electronApp: ElectronApplication
  window: Page
}

export const test = base.extend<Fixtures>({
  electronApp: async ({}, use) => {
    const app = await electron.launch({
      args: [
        path.join(__dirname, '../../out/main/index.js'),
        `--user-data-dir=${TEST_USER_DATA}`
      ]
    })
    await use(app)
    await app.close()
  },

  window: async ({ electronApp }, use) => {
    const page = await electronApp.firstWindow()
    await page.waitForLoadState('domcontentloaded')
    await use(page)
  }
})

export { expect }
