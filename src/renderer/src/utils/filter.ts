import type { ClipData } from '../types/clip'
import type { TagCategory } from '../constants/preset-tags'

export interface ClipFilters {
  codecs: string[] // OR; empty = all
  durationMin: number | null
  durationMax: number | null // seconds, inclusive
  dateFrom: string | null
  dateTo: string | null // 'YYYY-MM-DD'
  tags: Partial<Record<TagCategory, string[]>> // OR within a category, AND across categories
  needsDescription: boolean
  needsTags: boolean
  hideMissing: boolean
}

// The four AI tag categories (location is user-managed, not part of "needs tags").
const AI_TAG_CATEGORIES: TagCategory[] = ['visualTexture', 'energy', 'mood', 'lightQuality']

export function defaultFilters(): ClipFilters {
  return {
    codecs: [],
    durationMin: null,
    durationMax: null,
    dateFrom: null,
    dateTo: null,
    tags: {},
    needsDescription: false,
    needsTags: false,
    hideMissing: false
  }
}

// Local 'YYYY-MM-DD' for the clip's timestamp — must match what DateCell shows
// (it formats in local time), so date-range filtering lines up with the visible date.
function localDateString(iso: string): string {
  const d = new Date(iso)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function matchesDate(clip: ClipData, filters: ClipFilters): boolean {
  if (!filters.dateFrom && !filters.dateTo) return true
  if (!clip.dateShot) return false
  const date = localDateString(clip.dateShot)
  if (filters.dateFrom && date < filters.dateFrom) return false
  if (filters.dateTo && date > filters.dateTo) return false
  return true
}

function matchesTags(clip: ClipData, filters: ClipFilters): boolean {
  for (const [category, selected] of Object.entries(filters.tags) as [TagCategory, string[]][]) {
    if (!selected || selected.length === 0) continue
    const clipTags = clip[category] ?? []
    const hasAny = selected.some((t) => clipTags.includes(t))
    if (!hasAny) return false
  }
  return true
}

export function filterClips(clips: ClipData[], filters: ClipFilters): ClipData[] {
  return clips.filter((clip) => {
    if (filters.hideMissing && clip.missing) return false
    if (filters.codecs.length > 0 && !filters.codecs.includes(clip.codec)) return false
    if (filters.durationMin !== null && clip.duration < filters.durationMin) return false
    if (filters.durationMax !== null && clip.duration > filters.durationMax) return false
    if (!matchesDate(clip, filters)) return false
    if (filters.needsDescription && (clip.sceneDescription || clip.missing)) return false
    if (filters.needsTags && AI_TAG_CATEGORIES.some((c) => (clip[c] ?? []).length > 0)) return false
    if (!matchesTags(clip, filters)) return false
    return true
  })
}

// Number of active facet groups, for the badge.
export function activeFilterCount(filters: ClipFilters): number {
  let count = 0
  if (filters.codecs.length > 0) count++
  if (filters.durationMin !== null || filters.durationMax !== null) count++
  if (filters.dateFrom || filters.dateTo) count++
  for (const selected of Object.values(filters.tags)) {
    if (selected && selected.length > 0) count++
  }
  if (filters.needsDescription) count++
  if (filters.needsTags) count++
  if (filters.hideMissing) count++
  return count
}

export function availableCodecs(clips: ClipData[]): string[] {
  return [...new Set(clips.map((c) => c.codec).filter(Boolean))].sort()
}

export function availableTagValues(clips: ClipData[], category: TagCategory): string[] {
  const all = clips.flatMap((c) => c[category] ?? [])
  return [...new Set(all)].sort()
}
