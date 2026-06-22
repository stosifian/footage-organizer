import type { ClipData } from '../types/clip'

// FCPXML interchange export (targets v1.9 — broadly importable by DaVinci Resolve
// and Final Cut). Clips become assets with searchable keywords (scene keywords +
// all tag categories) and a note (scene description). Pure / no I/O.

const DEFAULT_RATE = '30/1' // fallback fps when ffprobe didn't report one

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function fileUrl(filePath: string): string {
  return 'file://' + encodeURI(filePath)
}

// Parse an ffprobe rational like "30000/1001" → [num, den]; null on garbage/zero.
function parseRate(rate: string | null): [number, number] | null {
  if (!rate) return null
  const m = /^(\d+)\/(\d+)$/.exec(rate.trim())
  if (!m) return null
  const num = Number(m[1])
  const den = Number(m[2])
  if (!num || !den) return null
  return [num, den]
}

// Frame duration (seconds-per-frame) as an FCPXML rational time: invert the fps.
export function frameDurationFromRate(rate: string | null): string {
  const parsed = parseRate(rate) ?? parseRate(DEFAULT_RATE)!
  const [num, den] = parsed
  return `${den}/${num}s`
}

// Whole frames for a duration at the given rate (>=1 frame).
function frameCount(seconds: number, rate: string | null): number {
  const [num, den] = parseRate(rate) ?? parseRate(DEFAULT_RATE)!
  return Math.max(1, Math.round(seconds * (num / den)))
}

// A frame count rendered as an FCPXML rational time in the rate's timebase.
// 0 → "0s" (FCPXML convention).
function framesToTime(frames: number, rate: string | null): string {
  if (frames === 0) return '0s'
  const [num, den] = parseRate(rate) ?? parseRate(DEFAULT_RATE)!
  return `${frames * den}/${num}s`
}

// Whole-frame clip duration as a rational matching the rate, so the clip imports
// at exactly the right length: round(seconds * fps) frames, expressed over the rate.
export function framesDuration(seconds: number, rate: string | null): string {
  return framesToTime(frameCount(seconds, rate), rate)
}

const KEYWORD_FIELDS: (keyof ClipData)[] = [
  'sceneKeywords',
  'visualTexture',
  'energy',
  'mood',
  'lightQuality',
  'location'
]

function keywordsFor(clip: ClipData): string[] {
  const all = KEYWORD_FIELDS.flatMap((f) => (clip[f] as string[] | undefined) ?? [])
  return [...new Set(all)]
}

function parseResolution(resolution: string): { width: number; height: number } {
  const m = /^(\d+)x(\d+)$/.exec(resolution)
  return m ? { width: Number(m[1]), height: Number(m[2]) } : { width: 1920, height: 1080 }
}

export function clipsToFcpxml(clips: ClipData[]): string {
  const usable = clips.filter((c) => !c.missing && c.filePath)

  // Deduplicate <format> by (frameDuration, width, height).
  const formats = new Map<string, { id: string; frameDuration: string; width: number; height: number }>()
  const formatIdFor = (clip: ClipData): string => {
    const frameDuration = frameDurationFromRate(clip.frameRate ?? null)
    const { width, height } = parseResolution(clip.resolution)
    const key = `${frameDuration}|${width}|${height}`
    let fmt = formats.get(key)
    if (!fmt) {
      fmt = { id: `r${formats.size + 1}`, frameDuration, width, height }
      formats.set(key, fmt)
    }
    return fmt.id
  }

  // Assets keep their native duration; the spine lays them out on one timebase.
  const assets = usable.map((clip, i) => {
    const formatId = formatIdFor(clip)
    const duration = framesDuration(clip.duration, clip.frameRate ?? null)
    return { clip, id: `a${i + 1}`, formatId, duration }
  })

  // The sequence/timeline runs at one rate (first usable clip's, else default).
  // Resolve imports the spine as a timeline; offsets accumulate in this timebase.
  const seqRate = usable[0]?.frameRate ?? DEFAULT_RATE
  // Ensure the sequence has a format to reference (even with zero clips).
  const seqFormatId =
    usable.length > 0
      ? formatIdFor(usable[0])
      : (() => {
          const { width, height } = { width: 1920, height: 1080 }
          const frameDuration = frameDurationFromRate(seqRate)
          const id = `r${formats.size + 1}`
          formats.set(`${frameDuration}|${width}|${height}`, { id, frameDuration, width, height })
          return id
        })()

  let offsetFrames = 0
  const spineClips = assets.map(({ clip, id }) => {
    const durFrames = frameCount(clip.duration, seqRate)
    const offset = framesToTime(offsetFrames, seqRate)
    const duration = framesToTime(durFrames, seqRate)
    offsetFrames += durFrames
    const note = clip.sceneDescription
      ? `\n          <note>${escapeXml(clip.sceneDescription)}</note>`
      : ''
    const keywords = keywordsFor(clip)
      .map((k) => `\n          <keyword start="0s" duration="${duration}" value="${escapeXml(k)}"/>`)
      .join('')
    return (
      `        <asset-clip ref="${id}" name="${escapeXml(clip.fileName)}" ` +
      `offset="${offset}" duration="${duration}">${note}${keywords}\n        </asset-clip>`
    )
  })
  const sequenceDuration = framesToTime(offsetFrames, seqRate)

  const formatEls = [...formats.values()]
    .map(
      (f) =>
        `    <format id="${f.id}" frameDuration="${f.frameDuration}" width="${f.width}" height="${f.height}"/>`
    )
    .join('\n')

  const assetEls = assets
    .map(
      ({ clip, id, formatId, duration }) =>
        `    <asset id="${id}" name="${escapeXml(clip.fileName)}" src="${fileUrl(clip.filePath)}" ` +
        `start="0s" duration="${duration}" hasVideo="1" format="${formatId}"/>`
    )
    .join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE fcpxml>
<fcpxml version="1.9">
  <resources>
${formatEls}
${assetEls}
  </resources>
  <library>
    <event name="FootageOrganizer Export">
      <project name="FootageOrganizer Export">
        <sequence format="${seqFormatId}" duration="${sequenceDuration}" tcStart="0s" tcFormat="NDF">
          <spine>
${spineClips.join('\n')}
          </spine>
        </sequence>
      </project>
    </event>
  </library>
</fcpxml>
`
}
