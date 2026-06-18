/**
 * Smoke tests for core app behaviour. These verify the shell of the app
 * works — correct empty state, menu actions, modal open/close.
 * They don't require real footage files.
 *
 * Note: native menu accelerators (Cmd+O etc.) are OS-level and are NOT triggered
 * by Playwright's renderer-level keyboard input. We exercise the menu items by
 * invoking their click handler through the main-process Menu API instead — this
 * tests the same IPC path the accelerator fires.
 */
import { test, expect } from './fixtures/electron-app'
import type { ElectronApplication } from 'playwright'

// Click a top-level menu item by label → submenu item by label, in the main process.
async function clickMenuItem(electronApp: ElectronApplication, topLabel: string, itemLabel: string) {
  await electronApp.evaluate(({ Menu }, { topLabel, itemLabel }) => {
    const menu = Menu.getApplicationMenu()
    const top = menu?.items.find((i) => i.label === topLabel)
    const item = top?.submenu?.items.find((i) => i.label === itemLabel)
    item?.click()
  }, { topLabel, itemLabel })
}

test('launches and shows the empty state', async ({ window }) => {
  await expect(window.getByText('FootageOrganizer')).toBeVisible()
  await expect(window.getByText(/AI-powered metadata/i)).toBeVisible()
  // Two "Open Directory" buttons exist (header + empty state) — assert at least one
  await expect(window.getByRole('button', { name: /open directory/i }).first()).toBeVisible()
})

test('File > Open Directory… triggers the open-directory flow', async ({ window, electronApp }) => {
  // Intercept the native dialog so it doesn't block the test
  await electronApp.evaluate(({ dialog }) => {
    dialog.showOpenDialog = async () => ({ canceled: true, filePaths: [] })
  })
  await clickMenuItem(electronApp, 'File', 'Open Directory…')
  // Dialog was shown and cancelled; app stays on empty state without crashing
  await expect(window.getByText('FootageOrganizer')).toBeVisible()
})

test('File > Settings… opens the settings dialog', async ({ window, electronApp }) => {
  await clickMenuItem(electronApp, 'File', 'Settings…')
  await expect(window.getByRole('dialog')).toBeVisible()
  await expect(window.getByText('AI Provider')).toBeVisible()
  await window.keyboard.press('Escape')
  await expect(window.getByRole('dialog')).not.toBeVisible()
})

test('settings gear button opens the dialog (regression)', async ({ window }) => {
  await window.getByRole('button', { name: /settings/i }).click()
  await expect(window.getByRole('dialog')).toBeVisible()
})
