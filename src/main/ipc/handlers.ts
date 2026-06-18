import fs from 'fs'
import { ipcMain, dialog, BrowserWindow, shell } from 'electron'
import { scanDirectory, cancelScan } from './scan'
import { setRootDir, handleGetThumbnail } from './ffmpeg'
import { handleGenerateDescription, handleGenerateDescriptionsBatch, handleClassifyBatch, handleExtractKeywords, handleTestConnection, cancelGeneration } from './ai'
import { saveProject, loadProject, loadAllProjects, loadSettings, saveSettings, computeRelinkPreview, findDroppedFolder, type RelinkPreview } from './persistence'

let pendingRelink: RelinkPreview | null = null

export function registerIpcHandlers(getWindow: () => BrowserWindow | null): void {
  ipcMain.handle('select-directory', async () => {
    const window = getWindow()
    if (!window) return null

    const result = await dialog.showOpenDialog(window, {
      properties: ['openDirectory']
    })

    if (result.canceled || result.filePaths.length === 0) {
      return null
    }

    return result.filePaths[0]
  })

  ipcMain.handle('scan-directory', async (_event, dirPath: string) => {
    const window = getWindow()
    if (!window) return

    setRootDir(dirPath)
    await scanDirectory(dirPath, window)
    // Clips are streamed to the renderer via 'scan-clip' events as they are probed.
    // The return value is intentionally void.
  })

  ipcMain.handle('get-thumbnail', async (_event, clipId: string, filePath: string, relativePath: string, duration: number) => {
    return handleGetThumbnail(clipId, filePath, relativePath, duration)
  })

  ipcMain.handle('save-project', async (_event, dirPath: string, project: unknown) => {
    saveProject(dirPath, project as Parameters<typeof saveProject>[1])
  })

  ipcMain.handle('load-project', async (_event, dirPath: string) => {
    return loadProject(dirPath)
  })

  ipcMain.handle('load-settings', async () => {
    return loadSettings()
  })

  ipcMain.handle('save-settings', async (_event, settings: Record<string, unknown>) => {
    saveSettings(settings)
  })

  ipcMain.handle('generate-description', async (_event, filePath: string, duration: number) => {
    return handleGenerateDescription(filePath, duration)
  })

  ipcMain.handle('generate-descriptions-batch', async (_event, clips: { filePath: string; duration: number; id: string }[]) => {
    const window = getWindow()
    if (!window) return
    return handleGenerateDescriptionsBatch(clips, window)
  })

  ipcMain.handle('classify-descriptions-batch', async (_event, clips: { id: string; description: string }[]) => {
    const window = getWindow()
    if (!window) return
    return handleClassifyBatch(clips, window)
  })

  ipcMain.handle('extract-keywords', async (_event, description: string) => {
    return handleExtractKeywords(description)
  })

  ipcMain.handle('test-ai-connection', async () => {
    return handleTestConnection()
  })

  ipcMain.handle('load-all-projects', async () => {
    return loadAllProjects()
  })

  ipcMain.handle('cancel-scan', () => {
    cancelScan()
  })

  ipcMain.handle('cancel-generation', () => {
    cancelGeneration()
  })

  ipcMain.handle('check-directory-exists', async (_event, dirPath: string) => {
    return fs.existsSync(dirPath)
  })

  ipcMain.handle('find-dropped-folder', async (_event, folderName: string, childFileName: string, childFileSize: number) => {
    return findDroppedFolder(folderName, childFileName, childFileSize)
  })

  ipcMain.handle('open-in-player', async (_event, filePath: string) => {
    await shell.openPath(filePath)
  })

  ipcMain.handle('export-clips', async (_event, format: 'csv' | 'json', content: string, defaultFileName: string) => {
    const window = getWindow()
    if (!window) return null

    const result = await dialog.showSaveDialog(window, {
      defaultPath: defaultFileName,
      filters: [{ name: format.toUpperCase(), extensions: [format] }]
    })

    if (result.canceled || !result.filePath) return null

    // Atomic write: same .tmp + rename pattern as persistence.saveProject
    const tmpPath = result.filePath + '.tmp'
    fs.writeFileSync(tmpPath, content, 'utf-8')
    fs.renameSync(tmpPath, result.filePath)
    return result.filePath
  })

  ipcMain.handle('relink-project', async (_event, oldDirPath: string, newDirPath: string) => {
    const window = getWindow()
    if (!window) return null

    setRootDir(newDirPath)
    const newClips = await scanDirectory(newDirPath, window)
    const preview = computeRelinkPreview(oldDirPath, newDirPath, newClips)
    if (!preview) return null

    pendingRelink = preview
    return {
      matchCount: preview.matchCount,
      totalOldClips: preview.totalOldClips,
      totalNewFiles: preview.totalNewFiles
    }
  })

  ipcMain.handle('commit-relink', async () => {
    if (!pendingRelink) return null

    const { mergedProject } = pendingRelink
    saveProject(mergedProject.directory, mergedProject)
    pendingRelink = null
    return mergedProject
  })
}
