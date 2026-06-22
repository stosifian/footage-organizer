export interface ElectronAPI {
  selectDirectory: () => Promise<string | null>
  scanDirectory: (dirPath: string) => Promise<unknown[]>
  onScanClip: (callback: (clip: unknown) => void) => () => void
  getThumbnail: (clipId: string, filePath: string, relativePath: string, duration: number) => Promise<string | null>
  saveProject: (dirPath: string, project: unknown) => Promise<void>
  loadProject: (dirPath: string) => Promise<unknown | null>
  loadSettings: () => Promise<unknown | null>
  saveSettings: (settings: unknown) => Promise<void>
  generateDescription: (filePath: string, duration: number) => Promise<string>
  generateDescriptionsBatch: (clips: { filePath: string; duration: number; id: string }[]) => Promise<void>
  testAIConnection: () => Promise<{ success: boolean; message: string; reason?: 'unreachable' | 'model-missing' }>
  pullOllamaModel: () => Promise<{ success: boolean; message?: string }>
  cancelOllamaPull: () => Promise<void>
  onOllamaPullProgress: (callback: (progress: { status: string; percent: number }) => void) => () => void
  onScanProgress: (callback: (progress: unknown) => void) => () => void
  onAIProgress: (callback: (progress: unknown) => void) => () => void
  onAIResult: (callback: (result: unknown) => void) => () => void
  onAIError: (callback: (error: unknown) => void) => () => void
  cancelScan: () => Promise<void>
  cancelGeneration: () => Promise<void>
  classifyDescriptionsBatch: (clips: { id: string; description: string }[]) => Promise<void>
  onAITagResult: (callback: (result: unknown) => void) => () => void
  findDroppedFolder: (folderName: string, childFileName: string, childFileSize: number) => Promise<string | null>
  openInPlayer: (filePath: string) => Promise<void>
  exportClips: (format: 'csv' | 'json', content: string, defaultFileName: string) => Promise<string | null>
  onMenuExportCsv: (callback: () => void) => () => void
  onMenuExportJson: (callback: () => void) => () => void
  onMenuExportFcpxml: (callback: () => void) => () => void
  onMenuOpenDirectory: (callback: () => void) => () => void
  onMenuRescan: (callback: () => void) => () => void
  onMenuOpenSettings: (callback: () => void) => () => void
}
