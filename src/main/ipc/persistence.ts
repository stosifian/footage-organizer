import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { app } from 'electron'

interface FootageProject {
  version: number
  directory: string
  clips: unknown[]
  customTags: Record<string, string[]>
  lastUpdated: string
}

export function getProjectPath(dirPath: string): string {
  const hash = crypto.createHash('sha256').update(dirPath).digest('hex').slice(0, 12)
  return path.join(app.getPath('userData'), 'projects', `${hash}.json`)
}

export function saveProject(dirPath: string, project: FootageProject): void {
  const filePath = getProjectPath(dirPath)
  const dir = path.dirname(filePath)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }

  const tmpPath = filePath + '.tmp'
  const data = JSON.stringify(project, null, 2)
  fs.writeFileSync(tmpPath, data, 'utf-8')
  fs.renameSync(tmpPath, filePath)
}

export function loadProject(dirPath: string): FootageProject | null {
  const filePath = getProjectPath(dirPath)

  if (!fs.existsSync(filePath)) {
    return null
  }

  const data = fs.readFileSync(filePath, 'utf-8')
  return JSON.parse(data)
}

export function loadAllProjects(): FootageProject[] {
  const projectsDir = path.join(app.getPath('userData'), 'projects')
  if (!fs.existsSync(projectsDir)) return []

  const files = fs.readdirSync(projectsDir).filter((f) => f.endsWith('.json'))
  const projects: FootageProject[] = []

  for (const file of files) {
    try {
      const data = fs.readFileSync(path.join(projectsDir, file), 'utf-8')
      projects.push(JSON.parse(data))
    } catch {
      // skip corrupt project files
    }
  }

  return projects
}

export async function findDroppedFolder(
  folderName: string,
  childFileName: string,
  childFileSize: number
): Promise<string | null> {
  const homeDir = app.getPath('home')

  // Build search roots: project parents first (most likely for re-opened footage),
  // then common home subdirectories, then mounted external volumes.
  const projectParents = [...new Set(loadAllProjects().map((p) => path.dirname(p.directory)))]
  const searchRoots: string[] = [
    ...projectParents,
    path.join(homeDir, 'Movies'),
    path.join(homeDir, 'Desktop'),
    path.join(homeDir, 'Documents'),
    app.getPath('downloads'),
  ]

  try {
    const volumes = await fs.promises.readdir('/Volumes', { withFileTypes: true })
    for (const v of volumes) {
      if (v.isDirectory() && !v.name.startsWith('.')) {
        searchRoots.push(path.join('/Volumes', v.name))
      }
    }
  } catch { /* /Volumes unavailable */ }

  const unique = [...new Set(searchRoots)]

  async function search(dir: string, depth: number): Promise<string | null> {
    if (depth > 5) return null
    let entries: fs.Dirent[]
    try {
      entries = await fs.promises.readdir(dir, { withFileTypes: true })
    } catch {
      return null
    }

    const subdirs: string[] = []
    for (const entry of entries) {
      if (!entry.isDirectory() || entry.name.startsWith('.')) continue
      const fullPath = path.join(dir, entry.name)
      if (entry.name === folderName) {
        try {
          const stat = await fs.promises.stat(path.join(fullPath, childFileName))
          if (stat.size === childFileSize) return fullPath
        } catch { /* file not in this candidate */ }
      }
      subdirs.push(fullPath)
    }

    for (const subdir of subdirs) {
      const result = await search(subdir, depth + 1)
      if (result) return result
    }

    return null
  }

  for (const root of unique) {
    const result = await search(root, 0)
    if (result) return result
  }

  return null
}

export function getSettingsPath(): string {
  return path.join(app.getPath('userData'), 'settings.json')
}

export function loadSettings(): Record<string, unknown> | null {
  const settingsPath = getSettingsPath()
  if (!fs.existsSync(settingsPath)) {
    return null
  }
  const data = fs.readFileSync(settingsPath, 'utf-8')
  return JSON.parse(data)
}

export function saveSettings(settings: Record<string, unknown>): void {
  const settingsPath = getSettingsPath()
  const tmpPath = settingsPath + '.tmp'
  const data = JSON.stringify(settings, null, 2)
  fs.writeFileSync(tmpPath, data, 'utf-8')
  fs.renameSync(tmpPath, settingsPath)
}

interface ClipLike {
  relativePath: string
  contentHash?: string | null
  [key: string]: unknown
}

const PRESERVED_FIELDS = [
  'sceneDescription',
  'sceneKeywords',
  'visualTexture',
  'energy',
  'mood',
  'lightQuality',
  'location'
] as const

function preservedFields(oldClip: ClipLike): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const field of PRESERVED_FIELDS) {
    if (oldClip[field] !== undefined) {
      result[field] = oldClip[field]
    }
  }
  return result
}

export interface RelinkPreview {
  matchCount: number
  totalOldClips: number
  totalNewFiles: number
  mergedProject: FootageProject
}

export function computeRelinkPreview(
  oldDirPath: string,
  newDirPath: string,
  newClips: ClipLike[]
): RelinkPreview | null {
  const oldProject = loadProject(oldDirPath)
  if (!oldProject) return null

  const oldClips = oldProject.clips as ClipLike[]

  // Build lookup maps for old clips
  const byRelPath = new Map<string, ClipLike>()
  const byHash = new Map<string, ClipLike>()
  for (const clip of oldClips) {
    byRelPath.set(clip.relativePath, clip)
    if (clip.contentHash) {
      byHash.set(clip.contentHash as string, clip)
    }
  }

  const matchedOldPaths = new Set<string>()
  let matchCount = 0

  // Merge new clips with old metadata
  const mergedClips = newClips.map((newClip) => {
    // Pass 1: match by relativePath
    let oldClip = byRelPath.get(newClip.relativePath)
    if (oldClip) {
      matchedOldPaths.add(oldClip.relativePath)
      matchCount++
      return { ...newClip, ...preservedFields(oldClip) }
    }

    // Pass 2: match by contentHash
    if (newClip.contentHash) {
      oldClip = byHash.get(newClip.contentHash as string)
      if (oldClip && !matchedOldPaths.has(oldClip.relativePath)) {
        matchedOldPaths.add(oldClip.relativePath)
        matchCount++
        return { ...newClip, ...preservedFields(oldClip) }
      }
    }

    return newClip
  })

  // Unmatched old clips become missing
  const missingClips = oldClips
    .filter((c) => !matchedOldPaths.has(c.relativePath))
    .map((c) => ({
      ...c,
      missing: true,
      filePath: ''
    }))

  const mergedProject: FootageProject = {
    version: oldProject.version,
    directory: newDirPath,
    clips: [...mergedClips, ...missingClips] as unknown[],
    customTags: oldProject.customTags,
    lastUpdated: new Date().toISOString()
  }

  return {
    matchCount,
    totalOldClips: oldClips.length,
    totalNewFiles: newClips.length,
    mergedProject
  }
}
