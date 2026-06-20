import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { setMaxListeners } from 'events'
import { v4 as uuid } from 'uuid'
import { isVideoFile } from '../utils/file-filters'
import { probeFile } from '../services/ffmpeg-wrapper'
import type { BrowserWindow } from 'electron'

interface ClipData {
  id: string
  fileName: string
  filePath: string
  relativePath: string
  folder: string
  dateShot: string | null
  duration: number
  resolution: string
  codec: string
  frameRate: string | null
  fileSize: number
  thumbnailPath: string | null
  sceneDescription: string | null
  sceneKeywords: string[]
  visualTexture: string[]
  energy: string[]
  mood: string[]
  lightQuality: string[]
  location: string[]
  contentHash: string | null
  missing?: boolean
}

const HASH_BYTES = 65536
const SCAN_CONCURRENCY = 16

// Monotonically increasing ID. cancelScan() and each new scanDirectory() call
// increment this so any in-flight scan can detect it is stale.
let activeScanId = 0
// AbortController for the currently running scan. Aborting it kills all
// in-flight ffprobe child processes immediately rather than waiting for them
// to finish their current file.
let activeAbortController: AbortController | null = null

export function cancelScan(): void {
  activeAbortController?.abort()
  activeScanId++
}

async function computeContentHash(filePath: string): Promise<string | null> {
  try {
    const fd = await fs.promises.open(filePath, 'r')
    const buf = Buffer.alloc(HASH_BYTES)
    const { bytesRead } = await fd.read(buf, 0, HASH_BYTES, 0)
    await fd.close()
    return crypto.createHash('sha256').update(buf.subarray(0, bytesRead)).digest('hex')
  } catch {
    return null
  }
}

function walkDir(dir: string, rootDir: string): { filePath: string; relativePath: string }[] {
  const results: { filePath: string; relativePath: string }[] = []

  const entries = fs.readdirSync(dir, { withFileTypes: true })
  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue
    const fullPath = path.join(dir, entry.name)

    if (entry.isDirectory()) {
      results.push(...walkDir(fullPath, rootDir))
    } else if (isVideoFile(entry.name)) {
      results.push({
        filePath: fullPath,
        relativePath: path.relative(rootDir, fullPath)
      })
    }
  }

  return results
}

export async function scanDirectory(
  dirPath: string,
  window: BrowserWindow
): Promise<ClipData[]> {
  const myScanId = ++activeScanId
  const abort = new AbortController()
  activeAbortController = abort
  const { signal } = abort
  // Each concurrent worker passes this signal to execFileAsync, which adds one
  // abort listener per call. Raise the limit to silence the Node warning.
  // setMaxListeners() from 'events' works with EventTarget (AbortSignal) from Node 15.4+.
  setMaxListeners(SCAN_CONCURRENCY + 5, signal)

  const isCancelled = () => signal.aborted || activeScanId !== myScanId

  window.webContents.send('scan-progress', {
    phase: 'scanning',
    current: 0,
    total: 0
  })

  const files = walkDir(dirPath, dirPath)
  const total = files.length
  const clips: ClipData[] = []
  let completed = 0

  // Process a single file and emit its clip to the renderer.
  async function processFile(filePath: string, relativePath: string): Promise<void> {
    if (isCancelled()) return

    const fileName = path.basename(filePath)
    const folder = path.dirname(relativePath)

    try {
      // Run stat, ffprobe, and content hash concurrently for each file.
      // probeFile receives the AbortSignal so it is killed immediately on cancel.
      const [stats, probe, contentHash] = await Promise.all([
        fs.promises.stat(filePath),
        probeFile(filePath, signal),
        computeContentHash(filePath)
      ])

      if (isCancelled()) return

      const clip: ClipData = {
        id: uuid(),
        fileName,
        filePath,
        relativePath,
        folder: folder === '.' ? '' : folder,
        dateShot: probe.dateShot,
        duration: probe.duration,
        resolution: probe.resolution,
        codec: probe.codec,
        frameRate: probe.frameRate,
        fileSize: stats.size,
        contentHash,
        thumbnailPath: null,
        sceneDescription: null,
        sceneKeywords: [],
        visualTexture: [],
        energy: [],
        mood: [],
        lightQuality: [],
        location: []
      }

      clips.push(clip)
      completed++

      window.webContents.send('scan-progress', {
        phase: 'metadata',
        current: completed,
        total,
        fileName
      })
      window.webContents.send('scan-clip', clip)
    } catch (err) {
      const isAbort = (err as NodeJS.ErrnoException).code === 'ABORT_ERR' ||
                      (err as Error).name === 'AbortError'
      if (!isAbort) {
        console.error(`Failed to probe ${filePath}:`, err)
        completed++
      }
    }
  }

  // Worker pool: SCAN_CONCURRENCY workers pull from a shared index.
  // JavaScript is single-threaded so fileIndex++ is race-free across workers.
  let fileIndex = 0

  async function worker(): Promise<void> {
    while (fileIndex < files.length) {
      if (isCancelled()) break
      const i = fileIndex++
      if (i >= files.length) break
      const { filePath, relativePath } = files[i]
      await processFile(filePath, relativePath)
    }
  }

  const workerCount = Math.min(SCAN_CONCURRENCY, files.length)
  if (workerCount > 0) {
    await Promise.all(Array.from({ length: workerCount }, () => worker()))
  }

  if (!isCancelled()) {
    window.webContents.send('scan-progress', {
      phase: 'complete',
      current: total,
      total
    })
  }

  return clips
}
