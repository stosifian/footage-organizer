import { contextBridge, ipcRenderer } from 'electron'

const api = {
  selectDirectory: () => ipcRenderer.invoke('select-directory'),

  scanDirectory: (dirPath: string) => ipcRenderer.invoke('scan-directory', dirPath),

  getThumbnail: (clipId: string, filePath: string, relativePath: string, duration: number) =>
    ipcRenderer.invoke('get-thumbnail', clipId, filePath, relativePath, duration),

  saveProject: (dirPath: string, project: unknown) =>
    ipcRenderer.invoke('save-project', dirPath, project),

  loadProject: (dirPath: string) => ipcRenderer.invoke('load-project', dirPath),

  loadSettings: () => ipcRenderer.invoke('load-settings'),

  saveSettings: (settings: unknown) => ipcRenderer.invoke('save-settings', settings),

  generateDescription: (filePath: string, duration: number) =>
    ipcRenderer.invoke('generate-description', filePath, duration),

  generateDescriptionsBatch: (clips: { filePath: string; duration: number; id: string }[]) =>
    ipcRenderer.invoke('generate-descriptions-batch', clips),

  classifyDescriptionsBatch: (clips: { id: string; description: string }[]) =>
    ipcRenderer.invoke('classify-descriptions-batch', clips),

  extractKeywords: (description: string) =>
    ipcRenderer.invoke('extract-keywords', description),

  testAIConnection: () => ipcRenderer.invoke('test-ai-connection'),

  pullOllamaModel: () => ipcRenderer.invoke('pull-ollama-model'),
  cancelOllamaPull: () => ipcRenderer.invoke('cancel-ollama-pull'),

  onOllamaPullProgress: (callback: (progress: unknown) => void) => {
    const handler = (_event: unknown, progress: unknown) => callback(progress)
    ipcRenderer.on('ollama-pull-progress', handler as (...args: unknown[]) => void)
    return () => ipcRenderer.removeListener('ollama-pull-progress', handler as (...args: unknown[]) => void)
  },

  loadAllProjects: () => ipcRenderer.invoke('load-all-projects'),

  cancelScan: () => ipcRenderer.invoke('cancel-scan'),
  cancelGeneration: () => ipcRenderer.invoke('cancel-generation'),

  checkDirectoryExists: (dirPath: string) => ipcRenderer.invoke('check-directory-exists', dirPath),

  relinkProject: (oldDirPath: string, newDirPath: string) =>
    ipcRenderer.invoke('relink-project', oldDirPath, newDirPath),

  commitRelink: () => ipcRenderer.invoke('commit-relink'),

  onScanClip: (callback: (clip: unknown) => void) => {
    const handler = (_event: unknown, clip: unknown) => callback(clip)
    ipcRenderer.on('scan-clip', handler as (...args: unknown[]) => void)
    return () => ipcRenderer.removeListener('scan-clip', handler as (...args: unknown[]) => void)
  },

  onScanProgress: (callback: (progress: unknown) => void) => {
    const handler = (_event: unknown, progress: unknown) => callback(progress)
    ipcRenderer.on('scan-progress', handler as (...args: unknown[]) => void)
    return () => ipcRenderer.removeListener('scan-progress', handler as (...args: unknown[]) => void)
  },

  onAIProgress: (callback: (progress: unknown) => void) => {
    const handler = (_event: unknown, progress: unknown) => callback(progress)
    ipcRenderer.on('ai-progress', handler as (...args: unknown[]) => void)
    return () => ipcRenderer.removeListener('ai-progress', handler as (...args: unknown[]) => void)
  },

  onAIResult: (callback: (result: unknown) => void) => {
    const handler = (_event: unknown, result: unknown) => callback(result)
    ipcRenderer.on('ai-result', handler as (...args: unknown[]) => void)
    return () => ipcRenderer.removeListener('ai-result', handler as (...args: unknown[]) => void)
  },

  onAIError: (callback: (error: unknown) => void) => {
    const handler = (_event: unknown, error: unknown) => callback(error)
    ipcRenderer.on('ai-error', handler as (...args: unknown[]) => void)
    return () => ipcRenderer.removeListener('ai-error', handler as (...args: unknown[]) => void)
  },

  onAITagResult: (callback: (result: unknown) => void) => {
    const handler = (_event: unknown, result: unknown) => callback(result)
    ipcRenderer.on('ai-tag-result', handler as (...args: unknown[]) => void)
    return () => ipcRenderer.removeListener('ai-tag-result', handler as (...args: unknown[]) => void)
  },

  findDroppedFolder: (folderName: string, childFileName: string, childFileSize: number) =>
    ipcRenderer.invoke('find-dropped-folder', folderName, childFileName, childFileSize),

  openInPlayer: (filePath: string) => ipcRenderer.invoke('open-in-player', filePath),

  exportClips: (format: 'csv' | 'json', content: string, defaultFileName: string) =>
    ipcRenderer.invoke('export-clips', format, content, defaultFileName),

  onMenuOpenDirectory: (callback: () => void) => {
    const handler = () => callback()
    ipcRenderer.on('menu-open-directory', handler)
    return () => ipcRenderer.removeListener('menu-open-directory', handler)
  },

  onMenuRescan: (callback: () => void) => {
    const handler = () => callback()
    ipcRenderer.on('menu-rescan', handler)
    return () => ipcRenderer.removeListener('menu-rescan', handler)
  },

  onMenuOpenSettings: (callback: () => void) => {
    const handler = () => callback()
    ipcRenderer.on('menu-open-settings', handler)
    return () => ipcRenderer.removeListener('menu-open-settings', handler)
  },

  onMenuExportCsv: (callback: () => void) => {
    const handler = () => callback()
    ipcRenderer.on('menu-export-csv', handler)
    return () => ipcRenderer.removeListener('menu-export-csv', handler)
  },

  onMenuExportJson: (callback: () => void) => {
    const handler = () => callback()
    ipcRenderer.on('menu-export-json', handler)
    return () => ipcRenderer.removeListener('menu-export-json', handler)
  }
}

contextBridge.exposeInMainWorld('api', api)
