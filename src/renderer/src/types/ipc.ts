import type { ClipData, FootageProject } from './clip'
import type { AppSettings } from './settings'

export interface ScanProgress {
  phase: 'scanning' | 'metadata' | 'thumbnails' | 'complete'
  current: number
  total: number
  fileName?: string
}

export interface AIProgress {
  current: number
  total: number
  fileName: string
}

export interface ElectronAPI {
  selectDirectory: () => Promise<string | null>
  scanDirectory: (dirPath: string) => Promise<void>
  onScanClip: (callback: (clip: ClipData) => void) => () => void
  getThumbnail: (clipId: string, filePath: string, relativePath: string, duration: number) => Promise<string | null>
  saveProject: (dirPath: string, project: FootageProject) => Promise<void>
  loadProject: (dirPath: string) => Promise<FootageProject | null>
  loadSettings: () => Promise<AppSettings>
  saveSettings: (settings: AppSettings) => Promise<void>
  generateDescription: (filePath: string, duration: number) => Promise<{ description: string; keywords: string[] }>
  generateDescriptionsBatch: (clips: { filePath: string; duration: number; id: string }[]) => Promise<void>
  extractKeywords: (description: string) => Promise<string[]>
  testAIConnection: () => Promise<{ success: boolean; message: string }>
  loadAllProjects: () => Promise<FootageProject[]>
  checkDirectoryExists: (dirPath: string) => Promise<boolean>
  relinkProject: (oldDirPath: string, newDirPath: string) => Promise<{
    matchCount: number
    totalOldClips: number
    totalNewFiles: number
  }>
  commitRelink: () => Promise<FootageProject>
  onScanProgress: (callback: (progress: ScanProgress) => void) => () => void
  onAIProgress: (callback: (progress: AIProgress) => void) => () => void
  onAIResult: (callback: (result: { id: string; description: string; keywords: string[] }) => void) => () => void
  onAIError: (callback: (error: { id: string; error: string }) => void) => () => void
}

declare global {
  interface Window {
    api: ElectronAPI
  }
}
