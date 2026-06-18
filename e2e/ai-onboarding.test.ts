/**
 * E2E for AI onboarding: the real test-ai-connection IPC drives the status pill
 * and setup banner. jsdom can't exercise the main↔renderer round trip, so we
 * stub the handler in the main process and reload the window.
 */
import { test, expect } from './fixtures/electron-app'
import type { ElectronApplication } from 'playwright'

async function stubConnection(electronApp: ElectronApplication, success: boolean) {
  await electronApp.evaluate(({ ipcMain }, ok) => {
    ipcMain.removeHandler('test-ai-connection')
    ipcMain.handle('test-ai-connection', async () => ({
      success: ok,
      message: ok ? 'Connected.' : 'Cannot connect to Ollama.'
    }))
  }, success)
}

test('shows the setup banner and "not set up" pill when the connection check fails', async ({ window, electronApp }) => {
  await stubConnection(electronApp, false)
  await window.reload()
  await window.waitForLoadState('domcontentloaded')

  await expect(window.getByText(/not set up/i)).toBeVisible()
  await expect(window.getByRole('button', { name: /set up ai/i })).toBeVisible()
})

test('shows the ready pill and no banner when the connection check succeeds', async ({ window, electronApp }) => {
  await stubConnection(electronApp, true)
  await window.reload()
  await window.waitForLoadState('domcontentloaded')

  await expect(window.getByText(/ai ready/i)).toBeVisible()
  await expect(window.getByRole('button', { name: /set up ai/i })).not.toBeVisible()
})
