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
    let resolveScandirectory!: (clips: unknown[]) => void
    vi.mocked(window.api.scanDirectory).mockReturnValueOnce(
      new Promise<unknown[]>((res) => { resolveScandirectory = res })
    )

    const scanPromise = useClipStore.getState().scanDirectory('/Volumes/SSD/footage')
    expect(useClipStore.getState().isScanning).toBe(true)

    resolveScandirectory([])
    await scanPromise
    expect(useClipStore.getState().isScanning).toBe(false)
  })

  it('renders clips from the scanDirectory return value even if no scan-clip events arrive (race regression)', async () => {
    // Simulates the IPC race: the invoke response carries the clips, but the
    // streamed scan-clip events are lost (onScanClip never fires).
    const scanned = [
      { id: 'a', fileName: 'A.mov', filePath: '/d/A.mov', relativePath: 'A.mov', folder: '',
        dateShot: null, duration: 1, resolution: '1920x1080', codec: 'h264', fileSize: 1,
        contentHash: null, thumbnailPath: null, sceneDescription: null, sceneKeywords: [],
        visualTexture: [], energy: [], mood: [], lightQuality: [], location: [] },
      { id: 'b', fileName: 'B.mov', filePath: '/d/B.mov', relativePath: 'B.mov', folder: '',
        dateShot: null, duration: 1, resolution: '1920x1080', codec: 'h264', fileSize: 1,
        contentHash: null, thumbnailPath: null, sceneDescription: null, sceneKeywords: [],
        visualTexture: [], energy: [], mood: [], lightQuality: [], location: [] }
    ]
    vi.mocked(window.api.scanDirectory).mockResolvedValueOnce(scanned)
    vi.mocked(window.api.onScanClip).mockReturnValue(() => {}) // no events delivered

    await useClipStore.getState().scanDirectory('/d')
    expect(useClipStore.getState().clips.map((c) => c.fileName)).toEqual(['A.mov', 'B.mov'])
  })

  it('sets directory to the provided path', async () => {
    await useClipStore.getState().scanDirectory('/Volumes/SSD/footage')
    expect(useClipStore.getState().directory).toBe('/Volumes/SSD/footage')
  })

  it('resets aiErrorCount so a stale failure notice does not persist across projects', async () => {
    useClipStore.setState({ aiErrorCount: 5 })
    await useClipStore.getState().scanDirectory('/Volumes/SSD/other-project')
    expect(useClipStore.getState().aiErrorCount).toBe(0)
  })
})
