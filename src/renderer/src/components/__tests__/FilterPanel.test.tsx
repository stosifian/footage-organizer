import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import { FilterPanel } from '../FilterPanel'
import { defaultFilters } from '../../utils/filter'
import type { ClipData } from '../../types/clip'

function makeClip(overrides: Partial<ClipData> = {}): ClipData {
  return {
    id: Math.random().toString(36).slice(2),
    fileName: 'A001.mov',
    filePath: '/x/A001.mov',
    relativePath: 'A001.mov',
    folder: '',
    dateShot: '2026-01-15T10:00:00.000Z',
    duration: 30,
    resolution: '1920x1080',
    codec: 'prores',
    fileSize: 1000,
    contentHash: null,
    thumbnailPath: null,
    sceneDescription: 'x',
    sceneKeywords: [],
    visualTexture: [],
    energy: [],
    mood: [],
    lightQuality: [],
    location: [],
    ...overrides
  }
}

const clips = [
  makeClip({ codec: 'prores', mood: ['Tense'] }),
  makeClip({ codec: 'h264', mood: ['Joyful'] })
]

describe('FilterPanel', () => {
  it('renders only codecs present in the clips', () => {
    render(<FilterPanel clips={clips} filters={defaultFilters()} onChange={vi.fn()} onClear={vi.fn()} />)
    expect(screen.getByLabelText('prores')).toBeInTheDocument()
    expect(screen.getByLabelText('h264')).toBeInTheDocument()
    expect(screen.queryByLabelText('hevc')).not.toBeInTheDocument()
  })

  it('renders only tag values present for a category', () => {
    render(<FilterPanel clips={clips} filters={defaultFilters()} onChange={vi.fn()} onClear={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Tense' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Joyful' })).toBeInTheDocument()
  })

  it('ticking a codec calls onChange with that codec selected', () => {
    const onChange = vi.fn()
    render(<FilterPanel clips={clips} filters={defaultFilters()} onChange={onChange} onClear={vi.fn()} />)
    fireEvent.click(screen.getByLabelText('prores'))
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ codecs: ['prores'] }))
  })

  it('toggling a quick checkbox calls onChange', () => {
    const onChange = vi.fn()
    render(<FilterPanel clips={clips} filters={defaultFilters()} onChange={onChange} onClear={vi.fn()} />)
    fireEvent.click(screen.getByLabelText(/hide missing/i))
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ hideMissing: true }))
  })

  it('editing duration min calls onChange with the parsed number', () => {
    const onChange = vi.fn()
    render(<FilterPanel clips={clips} filters={defaultFilters()} onChange={onChange} onClear={vi.fn()} />)
    fireEvent.change(screen.getByLabelText(/duration min/i), { target: { value: '15' } })
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ durationMin: 15 }))
  })

  it('clicking a tag chip calls onChange with that value selected', () => {
    const onChange = vi.fn()
    render(<FilterPanel clips={clips} filters={defaultFilters()} onChange={onChange} onClear={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Tense' }))
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ tags: expect.objectContaining({ mood: ['Tense'] }) })
    )
  })

  it('Clear all calls onClear', () => {
    const onClear = vi.fn()
    render(<FilterPanel clips={clips} filters={defaultFilters()} onChange={vi.fn()} onClear={onClear} />)
    fireEvent.click(screen.getByRole('button', { name: /clear all/i }))
    expect(onClear).toHaveBeenCalledOnce()
  })

  it('shows a selected codec as checked', () => {
    render(
      <FilterPanel
        clips={clips}
        filters={{ ...defaultFilters(), codecs: ['prores'] }}
        onChange={vi.fn()}
        onClear={vi.fn()}
      />
    )
    expect(screen.getByLabelText('prores')).toBeChecked()
  })
})

describe('FilterPanel — empty library', () => {
  it('renders without crashing when there are no clips', () => {
    const { container } = render(
      <FilterPanel clips={[]} filters={defaultFilters()} onChange={vi.fn()} onClear={vi.fn()} />
    )
    expect(within(container).getByText(/clear all/i)).toBeInTheDocument()
  })
})
