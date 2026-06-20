import { describe, it, expect } from 'vitest'
import { clipsToFcpxml, frameDurationFromRate, framesDuration } from '../fcpxml'
import type { ClipData } from '../../types/clip'

function makeClip(overrides: Partial<ClipData> = {}): ClipData {
  return {
    id: Math.random().toString(36).slice(2),
    fileName: 'A001.mov',
    filePath: '/Volumes/SSD/A/A001.mov',
    relativePath: 'A001.mov',
    folder: '',
    dateShot: '2026-01-15T10:00:00.000Z',
    duration: 10,
    resolution: '1920x1080',
    codec: 'prores',
    fileSize: 1000,
    contentHash: null,
    thumbnailPath: null,
    frameRate: '30000/1001',
    sceneDescription: 'A wide shot.',
    sceneKeywords: ['city', 'street'],
    visualTexture: ['Grainy'],
    energy: ['Calm'],
    mood: ['Nostalgic'],
    lightQuality: ['Golden Hour'],
    location: ['London'],
    ...overrides
  }
}

function parse(xml: string): Document {
  return new DOMParser().parseFromString(xml, 'application/xml')
}

describe('frameDurationFromRate', () => {
  it('inverts a rational rate into a frame duration', () => {
    expect(frameDurationFromRate('30000/1001')).toBe('1001/30000s')
    expect(frameDurationFromRate('25/1')).toBe('1/25s')
    expect(frameDurationFromRate('24/1')).toBe('1/24s')
  })

  it('falls back to 30fps for null / 0 / malformed', () => {
    expect(frameDurationFromRate(null)).toBe('1/30s')
    expect(frameDurationFromRate('0/0')).toBe('1/30s')
    expect(frameDurationFromRate('garbage')).toBe('1/30s')
  })
})

describe('framesDuration', () => {
  it('expresses whole-frame duration as a rational matching the rate', () => {
    // 10s at 30000/1001 fps → 299.7 → 300 frames → 300*1001/30000 s
    expect(framesDuration(10, '30000/1001')).toBe('300300/30000s')
  })
  it('handles integer rates', () => {
    expect(framesDuration(2, '25/1')).toBe('50/25s') // 50 frames
  })
})

describe('clipsToFcpxml', () => {
  it('produces well-formed XML (no parser error)', () => {
    const doc = parse(clipsToFcpxml([makeClip()]))
    expect(doc.querySelector('parsererror')).toBeNull()
    expect(doc.querySelector('fcpxml')).not.toBeNull()
  })

  it('emits one asset and one asset-clip per present clip', () => {
    const doc = parse(clipsToFcpxml([makeClip(), makeClip({ fileName: 'B.mov', filePath: '/x/B.mov' })]))
    expect(doc.querySelectorAll('resources > asset').length).toBe(2)
    expect(doc.querySelectorAll('asset-clip').length).toBe(2)
  })

  it('reuses one format per distinct fps+resolution', () => {
    const clips = [
      makeClip({ filePath: '/x/a.mov' }),
      makeClip({ filePath: '/x/b.mov' }), // same fps+res → shared format
      makeClip({ filePath: '/x/c.mov', resolution: '3840x2160' })
    ]
    const doc = parse(clipsToFcpxml(clips))
    expect(doc.querySelectorAll('resources > format').length).toBe(2)
  })

  it('skips missing clips', () => {
    const doc = parse(clipsToFcpxml([makeClip(), makeClip({ missing: true, filePath: '' })]))
    expect(doc.querySelectorAll('resources > asset').length).toBe(1)
  })

  it('maps scene keywords AND all tag categories to <keyword> values', () => {
    const xml = clipsToFcpxml([makeClip()])
    for (const v of ['city', 'street', 'Grainy', 'Calm', 'Nostalgic', 'Golden Hour', 'London']) {
      expect(xml).toContain(`value="${v}"`)
    }
  })

  it('puts the scene description in a <note>', () => {
    const doc = parse(clipsToFcpxml([makeClip({ sceneDescription: 'Mist over pines.' })]))
    expect(doc.querySelector('note')?.textContent).toBe('Mist over pines.')
  })

  it('uses the frame rate to set frameDuration', () => {
    const xml = clipsToFcpxml([makeClip({ frameRate: '30000/1001' })])
    expect(xml).toContain('frameDuration="1001/30000s"')
  })

  it('falls back to 30fps when frameRate is null', () => {
    const xml = clipsToFcpxml([makeClip({ frameRate: null })])
    expect(xml).toContain('frameDuration="1/30s"')
  })

  it('XML-escapes special characters in names and descriptions', () => {
    const xml = clipsToFcpxml([makeClip({ fileName: 'A & B <x>.mov', sceneDescription: 'a "quote" & <tag>' })])
    const doc = parse(xml)
    expect(doc.querySelector('parsererror')).toBeNull()
    expect(xml).toContain('A &amp; B &lt;x&gt;.mov')
    expect(xml).not.toContain('<x>.mov')
  })

  it('builds a file:// src URL, encoding spaces', () => {
    const xml = clipsToFcpxml([makeClip({ filePath: '/Volumes/My SSD/A001.mov' })])
    expect(xml).toContain('src="file:///Volumes/My%20SSD/A001.mov"')
  })
})
