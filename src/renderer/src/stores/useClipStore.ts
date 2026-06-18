import { create } from 'zustand'
import type { ClipData, FootageProject } from '../types/clip'
import type { ScanProgress, AIProgress } from '../types/ipc'
import type { TagCategory } from '../constants/preset-tags'

interface RelinkPreview {
  matchCount: number
  totalOldClips: number
  totalNewFiles: number
  oldDirPath: string
  newDirPath: string
}

interface ClipState {
  clips: ClipData[]
  directory: string | null
  scanProgress: ScanProgress | null
  aiProgress: AIProgress | null
  isScanning: boolean
  isGenerating: boolean
  customTags: Record<string, string[]>
  pendingRelink: RelinkPreview | null

  openDirectory: () => Promise<void>
  scanDirectory: (dirPath: string) => Promise<void>
  updateClip: (id: string, updates: Partial<ClipData>) => void
  addTag: (clipId: string, category: TagCategory, tag: string) => void
  removeTag: (clipId: string, category: TagCategory, tag: string) => void
  generateDescription: (clipId: string) => Promise<void>
  generateAllDescriptions: () => Promise<void>
  tagAllDescribed: () => Promise<void>
  stopGeneration: () => void
  addCustomTag: (category: string, tag: string) => void
  saveProject: () => Promise<void>
  relinkDirectory: (oldDirPath: string, newDirPath: string) => Promise<void>
  confirmRelink: () => Promise<void>
  cancelRelink: () => void
}

let saveTimeout: ReturnType<typeof setTimeout> | null = null
// Monotonically increasing generation counter. Incremented at the start of every
// scanDirectory() call so that IPC events arriving from a superseded scan are ignored.
let scanGeneration = 0
// Same pattern for AI batch generation.
let generateGeneration = 0

export const useClipStore = create<ClipState>((set, get) => ({
  clips: [],
  directory: null,
  scanProgress: null,
  aiProgress: null,
  isScanning: false,
  isGenerating: false,
  customTags: { visualTexture: [], energy: [], mood: [], lightQuality: [], location: [] },
  pendingRelink: null,

  openDirectory: async () => {
    const dirPath = await window.api.selectDirectory()
    if (!dirPath) return
    // Fire-and-forget: just signals main process to abort in-flight ffprobe calls.
    // scanDirectory() increments scanGeneration synchronously so the UI resets
    // immediately without waiting for the IPC round-trip.
    window.api.cancelScan()
    await get().scanDirectory(dirPath)
  },

  scanDirectory: async (dirPath: string) => {
    if (!dirPath) return

    // Capture generation before any awaits so stale IPC events from a superseded
    // scan are ignored by the listeners below.
    const myGen = ++scanGeneration

    // Clear stale clips immediately so the table doesn't show the old directory's data
    set({ isScanning: true, directory: dirPath, scanProgress: null, clips: [] })

    // Load the existing project BEFORE the scan starts so merge maps are ready
    // when the first scan-clip events arrive. Wrap in try/catch so a missing or
    // corrupt project file doesn't leave isScanning stuck as true.
    let project: FootageProject | null = null
    try {
      const existing = await window.api.loadProject(dirPath)
      project = existing as FootageProject | null
    } catch {
      // No saved project for this directory yet — proceed with a fresh scan
    }

    const byRelPath = project
      ? new Map(project.clips.map((c) => [c.relativePath, c]))
      : new Map<string, ClipData>()
    const byHash = new Map<string, ClipData>()
    if (project) {
      for (const c of project.clips) {
        if (c.contentHash) byHash.set(c.contentHash, c)
      }
    }

    const matchedRelPaths = new Set<string>()

    // Batch incoming clips to avoid triggering a re-render per file.
    // Flush to state every BATCH_SIZE clips or when the scan completes.
    const BATCH_SIZE = 50
    let pendingBatch: ClipData[] = []

    const flushBatch = () => {
      if (pendingBatch.length === 0) return
      if (myGen !== scanGeneration) return
      const toAdd = pendingBatch
      pendingBatch = []
      set((state) => ({ clips: [...state.clips, ...toAdd] }))
    }

    const unsubProgress = window.api.onScanProgress((progress) => {
      if (myGen !== scanGeneration) return
      set({ scanProgress: progress as ScanProgress })
    })

    // Merge each clip with existing project metadata as it arrives from the main process.
    const unsubClip = window.api.onScanClip((clip) => {
      if (myGen !== scanGeneration) return

      let merged: ClipData = clip

      let prev = byRelPath.get(clip.relativePath)
      if (prev) {
        matchedRelPaths.add(prev.relativePath)
        merged = { ...clip, ...copyMetadata(prev) }
      } else if (clip.contentHash) {
        prev = byHash.get(clip.contentHash)
        if (prev && !matchedRelPaths.has(prev.relativePath)) {
          matchedRelPaths.add(prev.relativePath)
          merged = { ...clip, ...copyMetadata(prev) }
        }
      }

      pendingBatch.push(merged)
      if (pendingBatch.length >= BATCH_SIZE) {
        flushBatch()
      }
    })

    try {
      // scanDirectory now returns void — clips arrive via scan-clip events above.
      await window.api.scanDirectory(dirPath)

      // If a newer scan has taken over, clean up listeners and bail without
      // touching state (the new scan owns it now).
      if (myGen !== scanGeneration) return

      // Flush the last partial batch
      flushBatch()

      // Append old clips that are no longer on disk as missing ghost rows
      const missingClips = project
        ? project.clips
            .filter((c) => !matchedRelPaths.has(c.relativePath))
            .filter((c) => hasMetadata(c))
            .map((c) => ({ ...c, missing: true, filePath: '' }))
        : []

      if (missingClips.length > 0) {
        set((state) => ({ clips: [...state.clips, ...missingClips] }))
      }

      set({ customTags: project?.customTags || get().customTags })
    } finally {
      unsubProgress()
      unsubClip()
      // Only update shared state if this scan is still the active one.
      if (myGen === scanGeneration) {
        set({ isScanning: false, scanProgress: null })
        get().saveProject()
        window.api.loadSettings().then((saved) => {
          const settings = saved || {}
          window.api.saveSettings({ ...settings, lastOpenedDirectory: dirPath })
        })
      }
    }

    // Cross-project hash recovery runs after the UI has settled.
    // Deferred so it never blocks the initial render of scan results.
    setTimeout(async () => {
      if (myGen !== scanGeneration) return
      if (get().directory !== dirPath) return

      const currentClips = get().clips
      const unmatchedClips = currentClips.filter((c) => !hasMetadata(c) && !c.missing)
      if (unmatchedClips.length === 0) return

      // Count how many unmatched clips share each hash.
      // For unique hashes, match by hash alone. For non-unique hashes (common with camera
      // formats that have identical first-64KB headers), fall back to hash+filename —
      // if both match, it's almost certainly the same file moved to a new location.
      const hashCount = new Map<string, number>()
      for (const c of unmatchedClips) {
        if (c.contentHash) hashCount.set(c.contentHash, (hashCount.get(c.contentHash) ?? 0) + 1)
      }
      const uniqueUnmatchedHashes = new Set(
        [...hashCount.entries()].filter(([, n]) => n === 1).map(([h]) => h)
      )
      const nonUniqueUnmatchedHashes = new Set(
        [...hashCount.entries()].filter(([, n]) => n > 1).map(([h]) => h)
      )
      if (uniqueUnmatchedHashes.size === 0 && nonUniqueUnmatchedHashes.size === 0) return

      const allProjects = (await window.api.loadAllProjects()) as FootageProject[]
      const crossHash = new Map<string, ClipData>()
      const crossHashFile = new Map<string, ClipData>()
      for (const p of allProjects) {
        if (p.directory === dirPath) continue
        for (const c of p.clips) {
          if (!c.contentHash || !hasMetadata(c)) continue
          if (uniqueUnmatchedHashes.has(c.contentHash) && !crossHash.has(c.contentHash)) {
            crossHash.set(c.contentHash, c)
          }
          if (nonUniqueUnmatchedHashes.has(c.contentHash)) {
            const key = `${c.contentHash}:${c.fileName}`
            if (!crossHashFile.has(key)) crossHashFile.set(key, c)
          }
        }
      }

      if (crossHash.size === 0 && crossHashFile.size === 0) return

      set((state) => ({
        clips: state.clips.map((clip) => {
          if (!hasMetadata(clip) && !clip.missing && clip.contentHash) {
            if (crossHash.has(clip.contentHash)) {
              return { ...clip, ...copyMetadata(crossHash.get(clip.contentHash)!) }
            }
            const key = `${clip.contentHash}:${clip.fileName}`
            if (crossHashFile.has(key)) {
              return { ...clip, ...copyMetadata(crossHashFile.get(key)!) }
            }
          }
          return clip
        })
      }))

      get().saveProject()
    }, 0)
  },

  updateClip: (id, updates) => {
    set((state) => ({
      clips: state.clips.map((c) => (c.id === id ? { ...c, ...updates } : c))
    }))
    debouncedSave(get)
  },

  addTag: (clipId, category, tag) => {
    set((state) => ({
      clips: state.clips.map((c) => {
        if (c.id !== clipId) return c
        const current = c[category] as string[]
        if (current.includes(tag)) return c
        return { ...c, [category]: [...current, tag] }
      })
    }))
    debouncedSave(get)
  },

  removeTag: (clipId, category, tag) => {
    set((state) => ({
      clips: state.clips.map((c) => {
        if (c.id !== clipId) return c
        return { ...c, [category]: (c[category] as string[]).filter((t) => t !== tag) }
      })
    }))
    debouncedSave(get)
  },

  generateDescription: async (clipId: string) => {
    const clip = get().clips.find((c) => c.id === clipId)
    if (!clip) return

    try {
      const result = await window.api.generateDescription(clip.filePath, clip.duration) as {
        description: string; keywords: string[]
        visualTexture: string[]; energy: string[]; mood: string[]; lightQuality: string[]
      }
      get().updateClip(clipId, {
        sceneDescription: result.description,
        sceneKeywords: result.keywords,
        visualTexture: result.visualTexture,
        energy: result.energy,
        mood: result.mood,
        lightQuality: result.lightQuality
      })
    } catch (err) {
      console.error('Failed to generate description:', err)
      throw err
    }
  },

  generateAllDescriptions: async () => {
    const myGen = ++generateGeneration
    const clips = get().clips.filter((c) => !c.sceneDescription && !c.missing)
    if (clips.length === 0) return

    set({ isGenerating: true, aiProgress: null })

    const unsubProgress = window.api.onAIProgress((progress) => {
      if (myGen !== generateGeneration) return
      set({ aiProgress: progress as AIProgress })
    })

    const unsubResult = window.api.onAIResult((result) => {
      if (myGen !== generateGeneration) return
      const r = result as {
        id: string; description: string; keywords: string[]
        visualTexture: string[]; energy: string[]; mood: string[]; lightQuality: string[]
      }
      get().updateClip(r.id, {
        sceneDescription: r.description,
        sceneKeywords: r.keywords,
        visualTexture: r.visualTexture,
        energy: r.energy,
        mood: r.mood,
        lightQuality: r.lightQuality
      })
    })

    const unsubError = window.api.onAIError((error) => {
      if (myGen !== generateGeneration) return
      const { id, error: errMsg } = error as { id: string; error: string }
      console.error(`AI error for clip ${id}:`, errMsg)
    })

    try {
      await window.api.generateDescriptionsBatch(
        clips.map((c) => ({ filePath: c.filePath, duration: c.duration, id: c.id }))
      )
    } finally {
      unsubProgress()
      unsubResult()
      unsubError()
      if (myGen === generateGeneration) {
        set({ isGenerating: false, aiProgress: null })
      }
    }
  },

  stopGeneration: () => {
    // Invalidate the current generation so its listeners and finally block are no-ops.
    // This makes it safe to immediately start a new batch after stopping.
    generateGeneration++
    window.api.cancelGeneration()
    set({ isGenerating: false, aiProgress: null })
  },

  tagAllDescribed: async () => {
    const myGen = ++generateGeneration
    const clips = get().clips.filter(
      (c) => c.sceneDescription && !c.missing &&
        !c.visualTexture?.length && !c.energy?.length &&
        !c.mood?.length && !c.lightQuality?.length
    )
    if (clips.length === 0) return

    set({ isGenerating: true, aiProgress: null })

    const unsubProgress = window.api.onAIProgress((progress) => {
      if (myGen !== generateGeneration) return
      set({ aiProgress: progress as AIProgress })
    })

    const unsubResult = window.api.onAITagResult((result) => {
      if (myGen !== generateGeneration) return
      const r = result as { id: string; visualTexture: string[]; energy: string[]; mood: string[]; lightQuality: string[] }
      get().updateClip(r.id, {
        visualTexture: r.visualTexture,
        energy: r.energy,
        mood: r.mood,
        lightQuality: r.lightQuality
      })
    })

    const unsubError = window.api.onAIError((error) => {
      if (myGen !== generateGeneration) return
      const { id, error: errMsg } = error as { id: string; error: string }
      console.error(`Tag error for clip ${id}:`, errMsg)
    })

    try {
      await window.api.classifyDescriptionsBatch(
        clips.map((c) => ({ id: c.id, description: c.sceneDescription! }))
      )
    } finally {
      unsubProgress()
      unsubResult()
      unsubError()
      if (myGen === generateGeneration) {
        set({ isGenerating: false, aiProgress: null })
        get().saveProject()
      }
    }
  },

  addCustomTag: (category, tag) => {
    set((state) => {
      const current = state.customTags[category] || []
      if (current.includes(tag)) return state
      return {
        customTags: { ...state.customTags, [category]: [...current, tag] }
      }
    })
    debouncedSave(get)
  },

  relinkDirectory: async (oldDirPath: string, newDirPath: string) => {
    set({ isScanning: true, scanProgress: null })

    const unsub = window.api.onScanProgress((progress) => {
      set({ scanProgress: progress as ScanProgress })
    })

    try {
      const result = await window.api.relinkProject(oldDirPath, newDirPath)
      if (result) {
        set({
          pendingRelink: {
            matchCount: result.matchCount,
            totalOldClips: result.totalOldClips,
            totalNewFiles: result.totalNewFiles,
            oldDirPath,
            newDirPath
          }
        })
      }
    } finally {
      unsub()
      set({ isScanning: false, scanProgress: null })
    }
  },

  confirmRelink: async () => {
    const { pendingRelink: preview } = get()
    if (!preview) return

    const project = await window.api.commitRelink()
    if (project) {
      const typedProject = project as FootageProject
      set({
        clips: typedProject.clips,
        directory: typedProject.directory,
        customTags: typedProject.customTags || get().customTags,
        pendingRelink: null
      })
    }
  },

  cancelRelink: () => {
    set({ pendingRelink: null })
  },

  saveProject: async () => {
    const { directory, clips, customTags } = get()
    if (!directory) return

    const project: FootageProject = {
      version: 1,
      directory,
      clips,
      customTags,
      lastUpdated: new Date().toISOString()
    }

    await window.api.saveProject(directory, project)
  }
}))

function debouncedSave(get: () => ClipState): void {
  if (saveTimeout) clearTimeout(saveTimeout)
  saveTimeout = setTimeout(() => {
    get().saveProject()
  }, 500)
}

function copyMetadata(src: ClipData): Partial<ClipData> {
  return {
    sceneDescription: src.sceneDescription,
    sceneKeywords: src.sceneKeywords || [],
    visualTexture: src.visualTexture || [],
    energy: src.energy || [],
    mood: src.mood || [],
    lightQuality: src.lightQuality || [],
    location: src.location || []
  }
}

function hasMetadata(c: ClipData): boolean {
  return !!(c.sceneDescription || c.sceneKeywords?.length || c.visualTexture?.length || c.energy?.length || c.mood?.length || c.lightQuality?.length || c.location?.length)
}
