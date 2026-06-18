/**
 * E2E: when the connection check reports the Ollama model is missing, the
 * Settings dialog surfaces the in-app "Download model" CTA. Verifies the
 * reason → CTA wiring through the real test-ai-connection IPC.
 * (The actual multi-GB pull needs a live Ollama and is verified manually.)
 */
import { test, expect } from './fixtures/electron-app'

test('shows the in-app Download model button when the model is missing', async ({ window, electronApp }) => {
  await electronApp.evaluate(({ ipcMain }) => {
    ipcMain.removeHandler('test-ai-connection')
    ipcMain.handle('test-ai-connection', async () => ({
      success: false,
      reason: 'model-missing',
      message: "Connected, but model isn't downloaded yet."
    }))
  })
  await window.reload()
  await window.waitForLoadState('domcontentloaded')

  // Open Settings (the gear button)
  await window.getByRole('button', { name: /settings/i }).first().click()

  await expect(window.getByRole('button', { name: /download model/i })).toBeVisible()
})
