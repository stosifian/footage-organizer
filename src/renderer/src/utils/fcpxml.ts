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

// Whole-frame clip duration as a rational matching the rate, so the clip imports
// at exactly the right length: round(seconds * fps) frames, expressed over the rate.
export function framesDuration(seconds: number, rate: string | null): string {
  const [num, den] = parseRate(rate) ?? parseRate(DEFAULT_RATE)!
  const fps = num / den
  const frames = Math.max(1, Math.round(seconds * fps))
  return `${frames * den}/${num}s`
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

  const assets = usable.map((clip, i) => {
    const formatId = formatIdFor(clip)
    const duration = framesDuration(clip.duration, clip.frameRate ?? null)
    return { clip, id: `a${i + 1}`, formatId, duration }
  })

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

  const clipEls = assets
    .map(({ clip, id, formatId, duration }) => {
      const note = clip.sceneDescription
        ? `\n        <note>${escapeXml(clip.sceneDescription)}</note>`
        : ''
      const keywords = keywordsFor(clip)
        .map((k) => `\n        <keyword start="0s" duration="${duration}" value="${escapeXml(k)}"/>`)
        .join('')
      return (
        `      <asset-clip ref="${id}" name="${escapeXml(clip.fileName)}" ` +
        `offset="0s" duration="${duration}" format="${formatId}">${note}${keywords}\n      </asset-clip>`
      )
    })
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
${clipEls}
    </event>
  </library>
</fcpxml>
`
}
