import { describe, it, expect } from 'vitest'
import { clipsToCsv, clipsToJson } from '../export'
import type { ClipData } from '../../types/clip'

function makeClip(overrides: Partial<ClipData> = {}): ClipData {
  return {
    id: 'id-1',
    fileName: 'A001.mov',
    filePath: '/Volumes/SSD/A/A001.mov',
    relativePath: 'A001.mov',
    folder: '',
    dateShot: '2026-01-01T10:00:00.000Z',
    duration: 12.5,
    resolution: '1920x1080',
    codec: 'prores',
    fileSize: 49668354,
    contentHash: 'abc123',
    thumbnailPath: null,
    sceneDescription: 'A wide shot of a city street.',
    sceneKeywords: ['city', 'street'],
    visualTexture: ['grainy'],
    energy: ['calm'],
    mood: ['nostalgic'],
    lightQuality: ['golden hour'],
    location: ['London'],
    ...overrides
  }
}

const HEADER =
  'fileName,relativePath,folder,dateShot,duration,resolution,codec,fileSize,' +
  'sceneDescription,sceneKeywords,visualTexture,energy,mood,lightQuality,location,missing'

describe('clipsToCsv', () => {
  it('starts with the exact header row', () => {
    const csv = clipsToCsv([makeClip()])
    expect(csv.split('\n')[0]).toBe(HEADER)
  })

  it('emits one data row per clip plus the header', () => {
    const csv = clipsToCsv([makeClip(), makeClip(), makeClip()])
    expect(csv.trim().split('\n')).toHaveLength(4)
  })

  it('joins array fields with "; "', () => {
    const csv = clipsToCsv([makeClip({ sceneKeywords: ['a', 'b', 'c'] })])
    expect(csv).toContain('a; b; c')
  })

  it('quote-escapes fields containing commas', () => {
    const csv = clipsToCsv([makeClip({ sceneDescription: 'wide, slow pan' })])
    expect(csv).toContain('"wide, slow pan"')
  })

  it('quote-escapes and doubles internal double-quotes', () => {
    const csv = clipsToCsv([makeClip({ sceneDescription: 'a "quoted" word' })])
    expect(csv).toContain('"a ""quoted"" word"')
  })

  it('quote-escapes fields containing newlines', () => {
    const csv = clipsToCsv([makeClip({ sceneDescription: 'line one\nline two' })])
    expect(csv).toContain('"line one\nline two"')
  })

  it('renders missing as yes/no', () => {
    const present = clipsToCsv([makeClip({ missing: false })]).trim().split('\n')[1]
    const gone = clipsToCsv([makeClip({ missing: true })]).trim().split('\n')[1]
    expect(present.endsWith(',no')).toBe(true)
    expect(gone.endsWith(',yes')).toBe(true)
  })

  it('defaults missing to no when undefined', () => {
    const row = clipsToCsv([makeClip({ missing: undefined })]).trim().split('\n')[1]
    expect(row.endsWith(',no')).toBe(true)
  })

  it('renders null dateShot and sceneDescription as empty strings', () => {
    const csv = clipsToCsv([makeClip({ dateShot: null, sceneDescription: null })])
    const row = csv.trim().split('\n')[1]
    // fileName,relativePath,folder,dateShot -> 4th column empty
    const cols = row.split(',')
    expect(cols[3]).toBe('')
  })
})

describe('clipsToJson', () => {
  it('produces valid parseable JSON', () => {
    const json = clipsToJson([makeClip()])
    expect(() => JSON.parse(json)).not.toThrow()
  })

  it('includes clipCount matching the number of clips', () => {
    const parsed = JSON.parse(clipsToJson([makeClip(), makeClip()]))
    expect(parsed.clipCount).toBe(2)
  })

  it('includes an exportedAt timestamp', () => {
    const parsed = JSON.parse(clipsToJson([makeClip()]))
    expect(typeof parsed.exportedAt).toBe('string')
    expect(Number.isNaN(Date.parse(parsed.exportedAt))).toBe(false)
  })

  it('preserves array fields as arrays', () => {
    const parsed = JSON.parse(clipsToJson([makeClip({ sceneKeywords: ['x', 'y'] })]))
    expect(parsed.clips[0].sceneKeywords).toEqual(['x', 'y'])
  })

  it('includes missing clips', () => {
    const parsed = JSON.parse(clipsToJson([makeClip({ missing: true })]))
    expect(parsed.clips[0].missing).toBe(true)
  })
})
