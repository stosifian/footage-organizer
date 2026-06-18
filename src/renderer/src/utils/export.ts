import type { ClipData } from '../types/clip'

// CSV columns in order. Array fields are joined with '; '; missing → yes/no.
const CSV_COLUMNS: (keyof ClipData)[] = [
  'fileName',
  'relativePath',
  'folder',
  'dateShot',
  'duration',
  'resolution',
  'codec',
  'fileSize',
  'sceneDescription',
  'sceneKeywords',
  'visualTexture',
  'energy',
  'mood',
  'lightQuality',
  'location',
  'missing'
]

// Wrap in double quotes (doubling internal quotes) when the value contains a
// comma, quote, or newline — standard RFC 4180 escaping.
function escapeCsv(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

function cellFor(clip: ClipData, column: keyof ClipData): string {
  const raw = clip[column]
  if (column === 'missing') return raw ? 'yes' : 'no'
  if (raw === null || raw === undefined) return ''
  if (Array.isArray(raw)) return raw.join('; ')
  return String(raw)
}

export function clipsToCsv(clips: ClipData[]): string {
  const header = CSV_COLUMNS.join(',')
  const rows = clips.map((clip) =>
    CSV_COLUMNS.map((col) => escapeCsv(cellFor(clip, col))).join(',')
  )
  return [header, ...rows].join('\n') + '\n'
}

export function clipsToJson(clips: ClipData[]): string {
  return JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      clipCount: clips.length,
      clips
    },
    null,
    2
  )
}
