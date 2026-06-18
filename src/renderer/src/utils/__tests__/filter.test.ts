import { describe, it, expect } from 'vitest'
import {
  defaultFilters,
  filterClips,
  activeFilterCount,
  availableCodecs,
  availableTagValues
} from '../filter'
import type { ClipData } from '../../types/clip'

function makeClip(overrides: Partial<ClipData> = {}): ClipData {
  return {
    id: Math.random().toString(36).slice(2),
    fileName: 'A001.mov',
    filePath: '/Volumes/SSD/A/A001.mov',
    relativePath: 'A001.mov',
    folder: '',
    dateShot: '2026-01-15T10:00:00.000Z',
    duration: 30,
    resolution: '1920x1080',
    codec: 'prores',
    fileSize: 1000,
    contentHash: null,
    thumbnailPath: null,
    sceneDescription: 'A scene.',
    sceneKeywords: [],
    visualTexture: [],
    energy: [],
    mood: [],
    lightQuality: [],
    location: [],
    ...overrides
  }
}

describe('defaultFilters', () => {
  it('matches every clip (no-op)', () => {
    const clips = [makeClip(), makeClip({ codec: 'h264' })]
    expect(filterClips(clips, defaultFilters())).toHaveLength(2)
  })

  it('reports zero active filters', () => {
    expect(activeFilterCount(defaultFilters())).toBe(0)
  })
})

describe('filterClips — codec', () => {
  it('keeps only clips whose codec is selected', () => {
    const clips = [makeClip({ codec: 'prores' }), makeClip({ codec: 'h264' }), makeClip({ codec: 'hevc' })]
    const out = filterClips(clips, { ...defaultFilters(), codecs: ['prores', 'hevc'] })
    expect(out.map((c) => c.codec).sort()).toEqual(['hevc', 'prores'])
  })

  it('empty codec list means no codec filtering', () => {
    const clips = [makeClip({ codec: 'prores' }), makeClip({ codec: 'h264' })]
    expect(filterClips(clips, { ...defaultFilters(), codecs: [] })).toHaveLength(2)
  })
})

describe('filterClips — duration', () => {
  const clips = [makeClip({ duration: 5 }), makeClip({ duration: 30 }), makeClip({ duration: 120 })]

  it('filters by min only (inclusive)', () => {
    expect(filterClips(clips, { ...defaultFilters(), durationMin: 30 }).map((c) => c.duration)).toEqual([30, 120])
  })

  it('filters by max only (inclusive)', () => {
    expect(filterClips(clips, { ...defaultFilters(), durationMax: 30 }).map((c) => c.duration)).toEqual([5, 30])
  })

  it('filters by both bounds', () => {
    expect(filterClips(clips, { ...defaultFilters(), durationMin: 10, durationMax: 60 }).map((c) => c.duration)).toEqual([30])
  })
})

describe('filterClips — date range', () => {
  const clips = [
    makeClip({ dateShot: '2026-01-01T00:00:00.000Z' }),
    makeClip({ dateShot: '2026-06-15T00:00:00.000Z' }),
    makeClip({ dateShot: null })
  ]

  it('filters between from and to (inclusive of date portion)', () => {
    const out = filterClips(clips, { ...defaultFilters(), dateFrom: '2026-01-01', dateTo: '2026-03-01' })
    expect(out).toHaveLength(1)
    expect(out[0].dateShot).toBe('2026-01-01T00:00:00.000Z')
  })

  it('excludes clips with null dateShot when a date bound is set', () => {
    const out = filterClips(clips, { ...defaultFilters(), dateFrom: '2025-01-01' })
    expect(out.every((c) => c.dateShot !== null)).toBe(true)
  })
})

describe('filterClips — tags', () => {
  it('matches clips containing any selected value within a category (OR)', () => {
    const clips = [
      makeClip({ mood: ['Nostalgic'] }),
      makeClip({ mood: ['Tense'] }),
      makeClip({ mood: ['Joyful'] })
    ]
    const out = filterClips(clips, { ...defaultFilters(), tags: { mood: ['Nostalgic', 'Tense'] } })
    expect(out).toHaveLength(2)
  })

  it('requires a match in every selected category (AND across categories)', () => {
    const clips = [
      makeClip({ mood: ['Nostalgic'], energy: ['Calm'] }),
      makeClip({ mood: ['Nostalgic'], energy: ['Fast'] })
    ]
    const out = filterClips(clips, { ...defaultFilters(), tags: { mood: ['Nostalgic'], energy: ['Calm'] } })
    expect(out).toHaveLength(1)
  })

  it('ignores categories with empty selections', () => {
    const clips = [makeClip({ mood: ['Nostalgic'] })]
    expect(filterClips(clips, { ...defaultFilters(), tags: { mood: [] } })).toHaveLength(1)
  })
})

describe('filterClips — quick toggles', () => {
  it('needsDescription keeps clips without a description that are not missing', () => {
    const clips = [
      makeClip({ sceneDescription: 'has one' }),
      makeClip({ sceneDescription: null }),
      makeClip({ sceneDescription: null, missing: true })
    ]
    const out = filterClips(clips, { ...defaultFilters(), needsDescription: true })
    expect(out).toHaveLength(1)
    expect(out[0].sceneDescription).toBeNull()
    expect(out[0].missing).toBeFalsy()
  })

  it('needsTags keeps clips with no AI tag categories populated', () => {
    const clips = [
      makeClip({ mood: ['Tense'] }),
      makeClip({ visualTexture: [], energy: [], mood: [], lightQuality: [] })
    ]
    const out = filterClips(clips, { ...defaultFilters(), needsTags: true })
    expect(out).toHaveLength(1)
  })

  it('hideMissing drops missing clips', () => {
    const clips = [makeClip(), makeClip({ missing: true })]
    expect(filterClips(clips, { ...defaultFilters(), hideMissing: true })).toHaveLength(1)
  })
})

describe('filterClips — combined (AND)', () => {
  it('applies all active conditions together', () => {
    const clips = [
      makeClip({ codec: 'prores', duration: 40, mood: ['Tense'] }),
      makeClip({ codec: 'prores', duration: 5, mood: ['Tense'] }),
      makeClip({ codec: 'h264', duration: 40, mood: ['Tense'] })
    ]
    const out = filterClips(clips, {
      ...defaultFilters(),
      codecs: ['prores'],
      durationMin: 10,
      tags: { mood: ['Tense'] }
    })
    expect(out).toHaveLength(1)
    expect(out[0].codec).toBe('prores')
    expect(out[0].duration).toBe(40)
  })
})

describe('activeFilterCount', () => {
  it('counts each active facet group', () => {
    const f = {
      ...defaultFilters(),
      codecs: ['prores'],           // 1
      durationMin: 10,              // 1 (duration group)
      dateFrom: '2026-01-01',       // 1 (date group)
      tags: { mood: ['Tense'], energy: ['Calm'] }, // 2
      needsDescription: true,       // 1
      hideMissing: true             // 1
    }
    expect(activeFilterCount(f)).toBe(7)
  })

  it('counts duration as one group even with both bounds', () => {
    expect(activeFilterCount({ ...defaultFilters(), durationMin: 5, durationMax: 50 })).toBe(1)
  })
})

describe('availableCodecs / availableTagValues', () => {
  it('returns distinct codecs present, sorted', () => {
    const clips = [makeClip({ codec: 'prores' }), makeClip({ codec: 'h264' }), makeClip({ codec: 'prores' })]
    expect(availableCodecs(clips)).toEqual(['h264', 'prores'])
  })

  it('returns distinct tag values present for a category, sorted', () => {
    const clips = [makeClip({ mood: ['Tense', 'Joyful'] }), makeClip({ mood: ['Joyful'] })]
    expect(availableTagValues(clips, 'mood')).toEqual(['Joyful', 'Tense'])
  })
})
