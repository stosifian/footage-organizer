import { app } from 'electron'
import { execFileWithTimeout } from './exec-timeout'

// Hard timeouts so a corrupt/stalled file fails just that call instead of hanging forever.
const PROBE_TIMEOUT_MS = 30_000
const THUMBNAIL_TIMEOUT_MS = 30_000
const FRAME_TIMEOUT_MS = 30_000

function resolveBundledBinary(packageName: string, pathKey?: string): string {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require(packageName)
    const rawPath: string = pathKey ? mod[pathKey] : mod
    if (!rawPath) throw new Error('empty path')
    return app.isPackaged ? rawPath.replace('app.asar', 'app.asar.unpacked') : rawPath
  } catch {
    return pathKey ? 'ffprobe' : 'ffmpeg'
  }
}

const ffmpegBin = resolveBundledBinary('ffmpeg-static')
const ffprobeBin = resolveBundledBinary('@ffprobe-installer/ffprobe', 'path')

export interface ProbeResult {
  duration: number
  resolution: string
  codec: string
  dateShot: string | null
}

export async function probeFile(filePath: string, signal?: AbortSignal): Promise<ProbeResult> {
  const { stdout } = await execFileWithTimeout(ffprobeBin, [
    '-v', 'quiet',
    '-print_format', 'json',
    '-show_format',
    '-show_streams',
    filePath
  ], { signal }, PROBE_TIMEOUT_MS)

  const data = JSON.parse(stdout as string)
  const videoStream = data.streams?.find((s: Record<string, string>) => s.codec_type === 'video')
  const format = data.format || {}

  const duration = parseFloat(format.duration || videoStream?.duration || '0')
  const width = videoStream?.width || 0
  const height = videoStream?.height || 0
  const codec = videoStream?.codec_name || 'unknown'

  let dateShot: string | null = null
  const tags = format.tags || {}
  const creationTime = tags.creation_time || tags.date || tags.com_apple_quicktime_creationdate
  if (creationTime) {
    dateShot = new Date(creationTime).toISOString()
  }

  return {
    duration,
    resolution: width && height ? `${width}x${height}` : 'unknown',
    codec,
    dateShot
  }
}

export async function extractThumbnail(
  filePath: string,
  outputPath: string,
  timestamp: number
): Promise<void> {
  await execFileWithTimeout(ffmpegBin, [
    '-ss', String(timestamp),
    '-i', filePath,
    '-vframes', '1',
    '-vf', 'scale=320:-1',
    '-q:v', '6',
    '-y',
    outputPath
  ], {}, THUMBNAIL_TIMEOUT_MS)
}

export async function extractFrames(
  filePath: string,
  duration: number,
  count: number = 3
): Promise<Buffer[]> {
  const positions = [0.1, 0.3, 0.5].slice(0, count)

  // Extract all frames concurrently instead of sequentially.
  return Promise.all(
    positions.map(async (pos) => {
      const timestamp = duration * pos
      const { stdout } = await execFileWithTimeout(ffmpegBin, [
        '-ss', String(timestamp),
        '-i', filePath,
        '-vframes', '1',
        '-vf', 'scale=512:-1',
        '-f', 'image2',
        '-c:v', 'mjpeg',
        '-q:v', '4',
        'pipe:1'
      ], { encoding: 'buffer', maxBuffer: 10 * 1024 * 1024 }, FRAME_TIMEOUT_MS)
      return stdout as unknown as Buffer
    })
  )
}
