import path from 'path'
import crypto from 'crypto'
import fs from 'fs'
import { app } from 'electron'
import { extractThumbnail } from './ffmpeg-wrapper'
import { selectOrphans, selectEvictions, type ThumbFile } from './thumbnail-cleanup'

const THUMBNAIL_BUDGET_BYTES = 500 * 1024 * 1024 // 500 MB across all projects

const LRU_MAX = 50
const CONCURRENCY_LIMIT = 4

const lruCache = new Map<string, string>()

// In-flight deduplication: maps relativePath → promise resolving to base64 | null
const inFlight = new Map<string, Promise<string | null>>()

// Concurrency queue
let activeCount = 0
const waitQueue: Array<() => void> = []

function acquireSlot(): Promise<void> {
  if (activeCount < CONCURRENCY_LIMIT) {
    activeCount++
    return Promise.resolve()
  }
  return new Promise((resolve) => {
    waitQueue.push(resolve)
  })
}

function releaseSlot(): void {
  const next = waitQueue.shift()
  if (next) {
    next()
  } else {
    activeCount--
  }
}

function getThumbDir(rootDir: string): string {
  const hash = crypto.createHash('sha256').update(rootDir).digest('hex').slice(0, 12)
  return path.join(app.getPath('userData'), 'thumbnails', hash)
}

function getCachePath(rootDir: string, relativePath: string): string {
  const parsed = path.parse(relativePath)
  const thumbName = parsed.name + '.jpg'
  return path.join(getThumbDir(rootDir), parsed.dir, thumbName)
}

export async function getThumbnailBase64(
  rootDir: string,
  relativePath: string,
  filePath: string,
  duration: number
): Promise<string | null> {
  const cacheKey = relativePath

  // 1. LRU memory hit
  if (lruCache.has(cacheKey)) {
    const b64 = lruCache.get(cacheKey)!
    lruCache.delete(cacheKey)
    lruCache.set(cacheKey, b64)
    return b64
  }

  // 2. Deduplicate concurrent requests for the same clip
  if (inFlight.has(cacheKey)) {
    return inFlight.get(cacheKey)!
  }

  const work = async (): Promise<string | null> => {
    const cachePath = getCachePath(rootDir, relativePath)

    try {
      if (!fs.existsSync(cachePath)) {
        // 3. Throttle: wait for a concurrency slot before spawning ffmpeg
        await acquireSlot()
        try {
          // Re-check disk after acquiring slot — another request may have written it
          if (!fs.existsSync(cachePath)) {
            const dir = path.dirname(cachePath)
            fs.mkdirSync(dir, { recursive: true })
            const timestamp = Math.min(duration * 0.1, 2)
            await extractThumbnail(filePath, cachePath, timestamp)
          }
        } finally {
          releaseSlot()
        }
      }

      const buffer = fs.readFileSync(cachePath)
      const base64 = `data:image/jpeg;base64,${buffer.toString('base64')}`

      if (lruCache.size >= LRU_MAX) {
        const oldest = lruCache.keys().next().value!
        lruCache.delete(oldest)
      }
      lruCache.set(cacheKey, base64)

      return base64
    } catch {
      return null
    } finally {
      inFlight.delete(cacheKey)
    }
  }

  const promise = work()
  inFlight.set(cacheKey, promise)
  return promise
}

// Recursively collect all .jpg files under a directory (absolute paths).
function collectJpgFiles(dir: string): string[] {
  const out: string[] = []
  let entries: fs.Dirent[]
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true })
  } catch {
    return out
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) out.push(...collectJpgFiles(full))
    else if (entry.name.endsWith('.jpg')) out.push(full)
  }
  return out
}

// Remove thumbnails in a project's dir that no longer match a current clip
// (renamed/deleted footage). Best-effort: never throws.
export function pruneOrphanThumbnails(rootDir: string, validRelativePaths: string[]): void {
  try {
    const thumbDir = getThumbDir(rootDir)
    const diskFiles = collectJpgFiles(thumbDir)
    if (diskFiles.length === 0) return
    const valid = new Set(validRelativePaths.map((rel) => getCachePath(rootDir, rel)))
    const orphans = selectOrphans(diskFiles, valid)
    for (const file of orphans) {
      try { fs.unlinkSync(file) } catch { /* ignore */ }
    }
    if (orphans.length > 0) lruCache.clear()
  } catch { /* cleanup must never break a scan */ }
}

// Keep total thumbnail storage (all projects) under the budget, evicting the
// least-recently-modified files first. Best-effort: never throws.
export function enforceThumbnailBudget(maxBytes: number = THUMBNAIL_BUDGET_BYTES): void {
  try {
    const root = path.join(app.getPath('userData'), 'thumbnails')
    const files: ThumbFile[] = []
    for (const p of collectJpgFiles(root)) {
      try {
        const stat = fs.statSync(p)
        files.push({ path: p, size: stat.size, mtimeMs: stat.mtimeMs })
      } catch { /* file vanished — skip */ }
    }
    const evictions = selectEvictions(files, maxBytes)
    for (const file of evictions) {
      try { fs.unlinkSync(file) } catch { /* ignore */ }
    }
    if (evictions.length > 0) lruCache.clear()
  } catch { /* cleanup must never break a scan */ }
}
