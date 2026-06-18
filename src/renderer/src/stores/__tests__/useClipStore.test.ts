import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useClipStore } from '../useClipStore'

// window.api is globally mocked in src/test/setup.ts

beforeEach(() => {
  useClipStore.setState({
    clips: [],
    directory: null,
    isScanning: false,
    scanProgress: null,
    aiProgress: null,
    isGenerating: false
  })
  vi.clearAllMocks()
  // Restore sensible defaults after clearAllMocks
  vi.mocked(window.api.scanDirectory).mockResolvedValue(undefined)
  vi.mocked(window.api.loadProject).mockResolvedValue(null)
  vi.mocked(window.api.saveProject).mockResolvedValue(undefined)
  vi.mocked(window.api.loadSettings).mockResolvedValue(null)
  vi.mocked(window.api.saveSettings).mockResolvedValue(undefined)
  vi.mocked(window.api.loadAllProjects).mockResolvedValue([])
  vi.mocked(window.api.onScanClip).mockReturnValue(() => {})
  vi.mocked(window.api.onScanProgress).mockReturnValue(() => {})
})

describe('scanDirectory', () => {
  it('returns immediately without setting isScanning when dirPath is empty', async () => {
    await useClipStore.getState().scanDirectory('')
    expect(useClipStore.getState().isScanning).toBe(false)
    expect(window.api.loadProject).not.toHaveBeenCalled()
  })

  it('does not leave isScanning stuck when loadProject throws (regression)', async () => {
    vi.mocked(window.api.loadProject).mockRejectedValueOnce(
      new TypeError('The "data" argument must be of type string')
    )
    await useClipStore.getState().scanDirectory('/Volumes/SSD/footage')
    expect(useClipStore.getState().isScanning).toBe(false)
  })

  it('sets isScanning true during scan, false after', async () => {
    let resolveScandirectory!: () => void
    vi.mocked(window.api.scanDirectory).mockReturnValueOnce(
      new Promise<void>((res) => { resolveScandirectory = res })
    )

    const scanPromise = useClipStore.getState().scanDirectory('/Volumes/SSD/footage')
    expect(useClipStore.getState().isScanning).toBe(true)

    resolveScandirectory()
    await scanPromise
    expect(useClipStore.getState().isScanning).toBe(false)
  })

  it('sets directory to the provided path', async () => {
    await useClipStore.getState().scanDirectory('/Volumes/SSD/footage')
    expect(useClipStore.getState().directory).toBe('/Volumes/SSD/footage')
  })
})
