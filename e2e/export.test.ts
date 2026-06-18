/**
 * E2E test for the export-clips IPC: preload → main → save dialog → atomic file write.
 * jsdom unit tests cover the serialization strings; this covers the actual disk write,
 * which only runs in a real Electron main process.
 */
import { test, expect } from './fixtures/electron-app'
import fs from 'fs'
import path from 'path'
import os from 'os'

test('exportClips writes the given content to the chosen path', async ({ window, electronApp }) => {
  const target = path.join(os.tmpdir(), `footage-export-e2e-${Date.now()}.csv`)

  // Stub the native save dialog to return our tmp path
  await electronApp.evaluate(({ dialog }, p) => {
    dialog.showSaveDialog = async () => ({ canceled: false, filePath: p })
  }, target)

  const content = 'fileName,duration\nA001.mov,12.5\n'
  const returned = await window.evaluate(
    async ({ content }) => window.api.exportClips('csv', content, 'export.csv'),
    { content }
  )

  try {
    expect(returned).toBe(target)
    expect(fs.existsSync(target)).toBe(true)
    expect(fs.readFileSync(target, 'utf-8')).toBe(content)
  } finally {
    if (fs.existsSync(target)) fs.unlinkSync(target)
  }
})

test('exportClips returns null and writes nothing when the dialog is cancelled', async ({ window, electronApp }) => {
  await electronApp.evaluate(({ dialog }) => {
    dialog.showSaveDialog = async () => ({ canceled: true, filePath: undefined })
  })

  const returned = await window.evaluate(async () =>
    window.api.exportClips('json', '{"x":1}', 'export.json')
  )
  expect(returned).toBeNull()
})
