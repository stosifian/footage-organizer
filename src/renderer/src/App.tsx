import { useEffect, useState, useRef } from 'react'
import { Search, Sparkles, Square, Video, FolderOpen, Loader2, Download } from 'lucide-react'
import { extractDroppedFolderPath, readDroppedDirectoryInfo } from './utils/drag'
import { clipsToCsv, clipsToJson } from './utils/export'
import { VideoPreviewModal } from './components/VideoPreviewModal'
import type { ClipData } from './types/clip'
import { DirectoryPicker } from './components/DirectoryPicker'
import { SettingsDialog } from './components/SettingsDialog'
import { ProgressBar } from './components/ProgressBar'
import { RelinkDialog } from './components/RelinkDialog'
import { ClipTable } from './components/ClipTable/ClipTable'
import { useClipStore } from './stores/useClipStore'
import { useSettingsStore } from './stores/useSettingsStore'

export default function App() {
  const {
    clips,
    directory,
    scanProgress,
    aiProgress,
    isScanning,
    isGenerating,
    openDirectory,
    scanDirectory,
    generateAllDescriptions,
    tagAllDescribed,
    stopGeneration
  } = useClipStore()

  const { settings, loaded: settingsLoaded, loadSettings } = useSettingsStore()
  const [globalFilter, setGlobalFilter] = useState('')
  const [relinkOpen, setRelinkOpen] = useState(false)
  const [missingPath, setMissingPath] = useState('')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [isDragOver, setIsDragOver] = useState(false)
  const [previewClip, setPreviewClip] = useState<ClipData | null>(null)
  const [exportMenuOpen, setExportMenuOpen] = useState(false)
  const autoOpenRan = useRef(false)

  useEffect(() => {
    loadSettings()
  }, [loadSettings])

  useEffect(() => {
    if (!settingsLoaded || autoOpenRan.current) return
    autoOpenRan.current = true

    const lastDir = settings.lastOpenedDirectory
    if (!lastDir) return

    window.api.checkDirectoryExists(lastDir).then((exists) => {
      if (exists) {
        useClipStore.getState().scanDirectory(lastDir)
      } else {
        setMissingPath(lastDir)
        setRelinkOpen(true)
      }
    })
  }, [settingsLoaded, settings.lastOpenedDirectory])

  // Reads fresh clips/directory from the store so it can be a stable handler
  // (no need to re-subscribe menu listeners when clips change).
  const exportAs = (format: 'csv' | 'json') => {
    const state = useClipStore.getState()
    if (state.clips.length === 0) return
    const content = format === 'csv' ? clipsToCsv(state.clips) : clipsToJson(state.clips)
    const base = state.directory
      ? state.directory.split('/').filter(Boolean).pop() || 'footage'
      : 'footage'
    const date = new Date().toISOString().slice(0, 10)
    window.api.exportClips(format, content, `${base}_export_${date}.${format}`)
    setExportMenuOpen(false)
  }

  // Menu keyboard shortcut subscriptions
  useEffect(() => {
    const unsubOpen = window.api.onMenuOpenDirectory(() => openDirectory())
    const unsubRescan = window.api.onMenuRescan(() => {
      if (directory) scanDirectory(directory)
    })
    const unsubSettings = window.api.onMenuOpenSettings(() => setSettingsOpen(true))
    const unsubExportCsv = window.api.onMenuExportCsv(() => exportAs('csv'))
    const unsubExportJson = window.api.onMenuExportJson(() => exportAs('json'))
    return () => {
      unsubOpen()
      unsubRescan()
      unsubSettings()
      unsubExportCsv()
      unsubExportJson()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openDirectory, scanDirectory, directory])

  const clipsWithoutDesc = clips.filter((c) => !c.sceneDescription && !c.missing).length
  const clipsNeedingTags = clips.filter(
    (c) => c.sceneDescription && !c.missing &&
      !c.visualTexture?.length && !c.energy?.length &&
      !c.mood?.length && !c.lightQuality?.length
  ).length

  // Document-level drag listeners are more reliable than React synthetic events in Electron.
  // A ref counter handles dragenter/dragleave correctly across child elements.
  const dragCounter = useRef(0)
  useEffect(() => {
    const onDragEnter = (e: DragEvent) => {
      e.preventDefault()
      dragCounter.current++
      setIsDragOver(true)
    }
    const onDragOver = (e: DragEvent) => {
      e.preventDefault()
    }
    const onDragLeave = () => {
      dragCounter.current--
      if (dragCounter.current <= 0) {
        dragCounter.current = 0
        setIsDragOver(false)
      }
    }
    const onDrop = (e: DragEvent) => {
      e.preventDefault()
      dragCounter.current = 0
      setIsDragOver(false)

      const entry = e.dataTransfer?.items[0]?.webkitGetAsEntry()
      if (!entry?.isDirectory) return
      const directPath = extractDroppedFolderPath(e)
      if (directPath) {
        useClipStore.getState().scanDirectory(directPath)
      } else {
        // Electron 33 doesn't expose File.path for dropped folders or their children.
        // Read a child file's name+size, then ask the main process to locate the folder
        // on disk — this works for both new footage and previously-scanned footage.
        readDroppedDirectoryInfo(entry as FileSystemDirectoryEntry).then((info) => {
          if (!info) { openDirectory(); return }
          window.api.findDroppedFolder(info.folderName, info.childFileName, info.childFileSize)
            .then((found) => {
              if (found) {
                useClipStore.getState().scanDirectory(found)
              } else {
                openDirectory()
              }
            })
        })
      }
    }

    document.addEventListener('dragenter', onDragEnter)
    document.addEventListener('dragover', onDragOver)
    document.addEventListener('dragleave', onDragLeave)
    document.addEventListener('drop', onDrop)
    return () => {
      document.removeEventListener('dragenter', onDragEnter)
      document.removeEventListener('dragover', onDragOver)
      document.removeEventListener('dragleave', onDragLeave)
      document.removeEventListener('drop', onDrop)
    }
  }, [openDirectory])

  const showEmptyState = !isScanning && clips.length === 0
  const showScanningState = isScanning && clips.length === 0

  return (
    <div
      className="flex flex-col h-screen bg-[#0f0f0f] relative overflow-hidden"
    >
      {/* Drag-over overlay */}
      {isDragOver && (
        <div className="absolute inset-0 z-50 bg-blue-500/10 border-2 border-blue-500 border-dashed flex items-center justify-center pointer-events-none">
          <div className="flex flex-col items-center gap-3 text-blue-400">
            <FolderOpen size={48} />
            <p className="text-lg font-medium">Drop folder to open</p>
          </div>
        </div>
      )}

      {/* Draggable title bar region */}
      <div className="h-[38px] shrink-0" style={{ WebkitAppRegion: 'drag' } as React.CSSProperties} />

      {/* Header */}
      <header className="flex items-center justify-between px-4 py-2 border-b border-[#333] bg-[#0f0f0f]" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
        <div className="flex items-center gap-4">
          <DirectoryPicker />

          {clips.length > 0 && (
            <div className="flex items-center gap-2 text-xs text-[#999]">
              <Video size={14} />
              {clips.length} clips
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {clips.length > 0 && (
            <>
              <div className="relative">
                <Search
                  size={14}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#666]"
                />
                <input
                  type="text"
                  value={globalFilter}
                  onChange={(e) => setGlobalFilter(e.target.value)}
                  placeholder="Search clips..."
                  className="bg-[#252525] border border-[#333] rounded-lg pl-8 pr-3 py-1.5 text-xs text-[#e5e5e5] placeholder-[#666] outline-none focus:border-[#555] w-[200px]"
                />
              </div>

              {isGenerating ? (
                <button
                  onClick={stopGeneration}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-red-700 hover:bg-red-800 rounded-lg transition-colors font-medium"
                >
                  <Square size={12} />
                  Stop
                </button>
              ) : (
                <>
                  {clipsNeedingTags > 0 && (
                    <button
                      onClick={tagAllDescribed}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-violet-700 hover:bg-violet-800 rounded-lg transition-colors font-medium"
                    >
                      <Sparkles size={13} />
                      Tag All ({clipsNeedingTags})
                    </button>
                  )}
                  {clipsWithoutDesc > 0 && (
                    <button
                      onClick={generateAllDescriptions}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors font-medium"
                    >
                      <Sparkles size={13} />
                      Generate All ({clipsWithoutDesc})
                    </button>
                  )}
                </>
              )}

              <div className="relative">
                <button
                  onClick={() => setExportMenuOpen((v) => !v)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-[#252525] hover:bg-[#333] border border-[#333] rounded-lg transition-colors font-medium"
                  title="Export metadata"
                >
                  <Download size={13} />
                  Export
                </button>
                {exportMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setExportMenuOpen(false)} />
                    <div className="absolute right-0 mt-1 z-50 w-40 bg-[#1a1a1a] border border-[#333] rounded-lg shadow-xl py-1">
                      <button
                        onClick={() => exportAs('csv')}
                        className="w-full text-left px-3 py-1.5 text-xs text-[#e5e5e5] hover:bg-[#252525] transition-colors"
                      >
                        Export as CSV
                      </button>
                      <button
                        onClick={() => exportAs('json')}
                        className="w-full text-left px-3 py-1.5 text-xs text-[#e5e5e5] hover:bg-[#252525] transition-colors"
                      >
                        Export as JSON
                      </button>
                    </div>
                  </>
                )}
              </div>
            </>
          )}

          <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
        </div>
      </header>

      {/* Progress */}
      {(isScanning || isGenerating) && (
        <ProgressBar scanProgress={scanProgress} aiProgress={aiProgress} />
      )}

      {/* Main content */}
      {clips.length > 0 ? (
        <ClipTable clips={clips} directory={directory!} globalFilter={globalFilter} onPreview={setPreviewClip} />
      ) : showScanningState ? (
        <div className="flex-1 flex flex-col items-center justify-center text-[#666]">
          <Loader2 size={36} className="mb-4 animate-spin opacity-40" />
          <p className="text-sm">Scanning footage…</p>
        </div>
      ) : showEmptyState ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-2">
          <Video size={56} className="text-[#2a2a2a] mb-2" />
          <p className="text-xl font-semibold text-[#ccc]">FootageOrganizer</p>
          <p className="text-sm text-[#555] mb-5">AI-powered metadata for your video library</p>
          <button
            onClick={openDirectory}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-sm font-medium transition-colors"
          >
            <FolderOpen size={16} />
            Open Directory
          </button>
          <p className="text-xs text-[#444] mt-2">or drag a folder onto this window</p>
        </div>
      ) : null}

      <RelinkDialog
        open={relinkOpen}
        missingPath={missingPath}
        onClose={() => setRelinkOpen(false)}
      />

      <VideoPreviewModal clip={previewClip} onClose={() => setPreviewClip(null)} />
    </div>
  )
}
