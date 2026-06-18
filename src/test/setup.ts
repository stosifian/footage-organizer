import { vi } from 'vitest'
import '@testing-library/jest-dom'

// IntersectionObserver is not available in jsdom
global.IntersectionObserver = class {
  observe = vi.fn()
  unobserve = vi.fn()
  disconnect = vi.fn()
} as unknown as typeof IntersectionObserver

// Mock the Electron preload bridge so renderer code can be tested outside Electron
Object.defineProperty(window, 'api', {
  value: {
    selectDirectory: vi.fn(),
    scanDirectory: vi.fn().mockResolvedValue(undefined),
    loadProject: vi.fn().mockResolvedValue(null),
    saveProject: vi.fn().mockResolvedValue(undefined),
    loadAllProjects: vi.fn().mockResolvedValue([]),
    loadSettings: vi.fn().mockResolvedValue(null),
    saveSettings: vi.fn().mockResolvedValue(undefined),
    getThumbnail: vi.fn().mockResolvedValue(null),
    generateDescription: vi.fn(),
    generateDescriptionsBatch: vi.fn().mockResolvedValue(undefined),
    classifyDescriptionsBatch: vi.fn().mockResolvedValue(undefined),
    extractKeywords: vi.fn(),
    testAIConnection: vi.fn().mockResolvedValue({ success: true, message: 'Connected.' }),
    pullOllamaModel: vi.fn().mockResolvedValue({ success: true }),
    cancelOllamaPull: vi.fn().mockResolvedValue(undefined),
    onOllamaPullProgress: vi.fn().mockReturnValue(() => {}),
    cancelScan: vi.fn(),
    cancelGeneration: vi.fn(),
    checkDirectoryExists: vi.fn().mockResolvedValue(false),
    relinkProject: vi.fn(),
    commitRelink: vi.fn(),
    onScanClip: vi.fn().mockReturnValue(() => {}),
    onScanProgress: vi.fn().mockReturnValue(() => {}),
    onAIProgress: vi.fn().mockReturnValue(() => {}),
    onAIResult: vi.fn().mockReturnValue(() => {}),
    onAIError: vi.fn().mockReturnValue(() => {}),
    onAITagResult: vi.fn().mockReturnValue(() => {}),
    findDroppedFolder: vi.fn().mockResolvedValue(null),
    openInPlayer: vi.fn().mockResolvedValue(undefined),
    exportClips: vi.fn().mockResolvedValue(null),
    onMenuOpenDirectory: vi.fn().mockReturnValue(() => {}),
    onMenuRescan: vi.fn().mockReturnValue(() => {}),
    onMenuOpenSettings: vi.fn().mockReturnValue(() => {}),
  },
  writable: true
})
