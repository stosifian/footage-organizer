import { useEffect, useState, useRef, useMemo, useCallback } from 'react'
import { Search, Sparkles, Square, Video, FolderOpen, Loader2, Download, SlidersHorizontal, AlertTriangle, X } from 'lucide-react'
import { extractDroppedFolderPath, readDroppedDirectoryInfo } from './utils/drag'
import { clipsToCsv, clipsToJson } from './utils/export'
import { clipsToFcpxml } from './utils/fcpxml'
import { filterClips, activeFilterCount, defaultFilters, type ClipFilters } from './utils/filter'
import { isProviderConfigured, notConfiguredHint, type AIStatus } from './utils/ai-status'
import { FilterPanel } from './components/FilterPanel'
import { AIStatusPill } from './components/AIStatusPill'
import { ThemeSwitcher } from './components/ThemeSwitcher'
import { AISetupBanner } from './components/AISetupBanner'
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
    stopGeneration,
    aiErrorCount
  } = useClipStore()

  const { settings, loaded: settingsLoaded, loadSettings } = useSettingsStore()
  const [globalFilter, setGlobalFilter] = useState('')
  const [relinkOpen, setRelinkOpen] = useState(false)
  const [missingPath, setMissingPath] = useState('')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [isDragOver, setIsDragOver] = useState(false)
  const [previewClip, setPreviewClip] = useState<ClipData | null>(null)
  const [exportMenuOpen, setExportMenuOpen] = useState(false)
  const [filters, setFilters] = useState<ClipFilters>(defaultFilters())
  const [filterOpen, setFilterOpen] = useState(false)
  const [aiStatus, setAiStatus] = useState<{ status: AIStatus; message: string }>({ status: 'checking', message: '' })
  const [bannerDismissed, setBannerDismissed] = useState(false)
  const [errorNoticeDismissed, setErrorNoticeDismissed] = useState(false)
  const aiCheckGen = useRef(0)
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
  const exportAs = (format: 'csv' | 'json' | 'fcpxml') => {
    const state = useClipStore.getState()
    if (state.clips.length === 0) return
    const content =
      format === 'csv'
        ? clipsToCsv(state.clips)
        : format === 'fcpxml'
          ? clipsToFcpxml(state.clips)
          : clipsToJson(state.clips)
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
    const unsubExportFcpxml = window.api.onMenuExportFcpxml(() => exportAs('fcpxml'))
    return () => {
      unsubOpen()
      unsubRescan()
      unsubSettings()
      unsubExportCsv()
      unsubExportJson()
      unsubExportFcpxml()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openDirectory, scanDirectory, directory])

  // Reset filters when switching projects — stale codec/tag selections shouldn't carry over.
  useEffect(() => {
    setFilters(defaultFilters())
  }, [directory])

  // Check AI provider status. Reads fresh settings from the store so it's a stable
  // callback (no per-keystroke network calls); a ref counter ignores stale results.
  const checkAIStatus = useCallback(async () => {
    const myGen = ++aiCheckGen.current
    const current = useSettingsStore.getState().settings
    setBannerDismissed(false)
    if (!isProviderConfigured(current)) {
      setAiStatus({ status: 'not-ready', message: notConfiguredHint(current) ?? '' })
      return
    }
    setAiStatus((s) => ({ status: 'checking', message: s.message }))
    try {
      const res = await window.api.testAIConnection()
      if (myGen !== aiCheckGen.current) return
      setAiStatus({ status: res.success ? 'ready' : 'not-ready', message: res.message })
    } catch (err) {
      if (myGen !== aiCheckGen.current) return
      setAiStatus({ status: 'not-ready', message: String(err) })
    }
  }, [])

  // Initial check once settings have loaded.
  useEffect(() => {
    if (settingsLoaded) checkAIStatus()
  }, [settingsLoaded, checkAIStatus])

  // Re-show the failure notice when a fresh batch starts (aiErrorCount resets to 0).
  useEffect(() => {
    if (aiErrorCount === 0) setErrorNoticeDismissed(false)
  }, [aiErrorCount])

  const filteredClips = useMemo(() => filterClips(clips, filters), [clips, filters])
  const filterCount = activeFilterCount(filters)

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
      className="flex flex-col h-screen bg-[var(--bg-base)] relative overflow-hidden"
    >
      {/* Drag-over overlay */}
      {isDragOver && (
        <div className="absolute inset-0 z-50 bg-accent/10 border-2 border-accent border-dashed flex items-center justify-center pointer-events-none">
          <div className="flex flex-col items-center gap-3 text-accent">
            <FolderOpen size={48} />
            <p className="text-lg font-medium">Drop folder to open</p>
          </div>
        </div>
      )}

      {/* Draggable title bar region */}
      <div className="h-[38px] shrink-0" style={{ WebkitAppRegion: 'drag' } as React.CSSProperties} />

      {/* Header */}
      <header className="flex items-center justify-between px-4 py-2 border-b border-[var(--border-default)] bg-[var(--bg-base)]" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
        <div className="flex items-center gap-4">
          <DirectoryPicker />

          {clips.length > 0 && (
            <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
              <Video size={14} />
              {filteredClips.length === clips.length
                ? `${clips.length} clips`
                : `${filteredClips.length} of ${clips.length} clips`}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {clips.length > 0 && (
            <>
              <div className="relative">
                <Search
                  size={15}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-label)] pointer-events-none"
                />
                <input
                  type="text"
                  value={globalFilter}
                  onChange={(e) => setGlobalFilter(e.target.value)}
                  placeholder="Search clips..."
                  className="bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-full pl-10 pr-4 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-label)] outline-none focus:border-[var(--border-focus)] w-[260px]"
                />
              </div>

              <div className="relative">
                <button
                  onClick={() => setFilterOpen((v) => !v)}
                  className={`flex items-center gap-1.5 px-3.5 py-2 text-sm rounded-[var(--radius-lg)] border transition-colors font-medium ${
                    filterCount > 0
                      ? 'bg-accent/20 border-accent text-accent'
                      : 'bg-[var(--bg-elevated)] hover:bg-[var(--border-default)] border-[var(--border-default)]'
                  }`}
                  title="Filter clips"
                >
                  <SlidersHorizontal size={13} />
                  Filter
                  {filterCount > 0 && (
                    <span className="ml-0.5 px-1.5 rounded-full bg-accent text-accent-on text-[10px] leading-4">
                      {filterCount}
                    </span>
                  )}
                </button>
                {filterOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setFilterOpen(false)} />
                    <FilterPanel
                      clips={clips}
                      filters={filters}
                      onChange={setFilters}
                      onClear={() => setFilters(defaultFilters())}
                    />
                  </>
                )}
              </div>

              {isGenerating ? (
                <button
                  onClick={stopGeneration}
                  className="flex items-center gap-1.5 px-3.5 py-2 text-sm bg-red-700 hover:bg-red-800 rounded-[var(--radius-lg)] transition-colors font-medium"
                >
                  <Square size={12} />
                  Stop
                </button>
              ) : (
                <>
                  {clipsNeedingTags > 0 && (
                    <button
                      onClick={tagAllDescribed}
                      className="flex items-center gap-1.5 px-3.5 py-2 text-sm bg-magic hover:bg-magic-hover rounded-[var(--radius-lg)] transition-colors font-medium"
                    >
                      <Sparkles size={13} />
                      Tag All ({clipsNeedingTags})
                    </button>
                  )}
                  {clipsWithoutDesc > 0 && (
                    <button
                      onClick={generateAllDescriptions}
                      className="flex items-center gap-1.5 px-3.5 py-2 text-sm bg-accent hover:bg-accent-hover rounded-[var(--radius-lg)] transition-colors font-medium"
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
                  className="flex items-center gap-1.5 px-3.5 py-2 text-sm bg-[var(--bg-elevated)] hover:bg-[var(--border-default)] border border-[var(--border-default)] rounded-[var(--radius-lg)] transition-colors font-medium"
                  title="Export metadata"
                >
                  <Download size={13} />
                  Export
                </button>
                {exportMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setExportMenuOpen(false)} />
                    <div className="absolute right-0 mt-1 z-50 w-40 bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-[var(--radius-lg)] shadow-xl py-1">
                      <button
                        onClick={() => exportAs('csv')}
                        className="w-full text-left px-3 py-1.5 text-xs text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors"
                      >
                        Export as CSV
                      </button>
                      <button
                        onClick={() => exportAs('json')}
                        className="w-full text-left px-3 py-1.5 text-xs text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors"
                      >
                        Export as JSON
                      </button>
                      <button
                        onClick={() => exportAs('fcpxml')}
                        className="w-full text-left px-3 py-1.5 text-xs text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors"
                      >
                        Export as FCPXML
                      </button>
                    </div>
                  </>
                )}
              </div>
            </>
          )}

          <ThemeSwitcher />

          <AIStatusPill status={aiStatus.status} onClick={() => setSettingsOpen(true)} />

          <SettingsDialog
            open={settingsOpen}
            onOpenChange={(o) => {
              setSettingsOpen(o)
              if (!o) checkAIStatus() // re-check after the user may have edited settings
            }}
          />
        </div>
      </header>

      {/* AI setup banner */}
      {aiStatus.status === 'not-ready' && !bannerDismissed && (
        <AISetupBanner
          message={aiStatus.message || 'AI provider is not set up — descriptions and tags can’t be generated.'}
          onConfigure={() => setSettingsOpen(true)}
          onDismiss={() => setBannerDismissed(true)}
        />
      )}

      {/* Generation-failure notice */}
      {aiErrorCount > 0 && !isGenerating && !errorNoticeDismissed && (
        <div className="flex items-center gap-3 px-4 py-2 bg-red-600/10 border-b border-red-700/40 text-xs text-red-200">
          <AlertTriangle size={14} className="shrink-0 text-red-400" />
          <span className="flex-1">
            {aiErrorCount} {aiErrorCount === 1 ? 'clip' : 'clips'} failed to generate — check your AI setup.
          </span>
          <button
            onClick={() => setSettingsOpen(true)}
            className="px-3 py-1 rounded-[var(--radius-md)] bg-red-600 hover:bg-red-500 text-white font-medium transition-colors"
          >
            Open Settings
          </button>
          <button
            onClick={() => setErrorNoticeDismissed(true)}
            aria-label="Dismiss"
            className="p-1 rounded hover:bg-red-600/20 text-red-300/70 hover:text-red-200 transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Progress */}
      {(isScanning || isGenerating) && (
        <ProgressBar scanProgress={scanProgress} aiProgress={aiProgress} />
      )}

      {/* Main content */}
      {clips.length > 0 ? (
        <ClipTable clips={filteredClips} directory={directory!} globalFilter={globalFilter} onPreview={setPreviewClip} hasActiveFilters={filterCount > 0} />
      ) : showScanningState ? (
        <div className="flex-1 flex flex-col items-center justify-center text-[var(--text-label)]">
          <Loader2 size={36} className="mb-4 animate-spin opacity-40" />
          <p className="text-sm">Scanning footage…</p>
        </div>
      ) : showEmptyState ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-2">
          <Video size={56} className="text-[#2a2a2a] mb-2" />
          <p className="text-xl font-semibold text-[#ccc]">FootageOrganizer</p>
          <p className="text-sm text-[var(--border-focus)] mb-5">AI-powered metadata for your video library</p>
          <button
            onClick={openDirectory}
            className="flex items-center gap-2 px-5 py-2.5 rounded-[var(--radius-lg)] bg-accent hover:bg-accent-hover text-sm font-medium transition-colors"
          >
            <FolderOpen size={16} />
            Open Directory
          </button>
          <p className="text-xs text-[var(--border-strong)] mt-2">or drag a folder onto this window</p>
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
