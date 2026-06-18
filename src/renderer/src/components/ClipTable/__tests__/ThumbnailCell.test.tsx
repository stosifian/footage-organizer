import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ThumbnailCell } from '../ThumbnailCell'
import type { ClipData } from '../../../types/clip'

const baseClip: ClipData = {
  id: 'clip-1',
  fileName: 'A001.mov',
  filePath: '/test/A001.mov',
  relativePath: 'A001.mov',
  folder: '',
  dateShot: null,
  duration: 60,
  resolution: '1920x1080',
  codec: 'prores',
  fileSize: 50000,
  contentHash: null,
  thumbnailPath: null,
  sceneDescription: null,
  sceneKeywords: [],
  visualTexture: [],
  energy: [],
  mood: [],
  lightQuality: [],
  location: []
}

describe('ThumbnailCell', () => {
  it('renders a play button for a normal clip', () => {
    render(<ThumbnailCell clip={baseClip} directory="/test" onPreview={vi.fn()} />)
    expect(screen.getByRole('button', { name: /preview/i })).toBeInTheDocument()
  })

  it('calls onPreview when the play button is clicked', () => {
    const onPreview = vi.fn()
    render(<ThumbnailCell clip={baseClip} directory="/test" onPreview={onPreview} />)
    fireEvent.click(screen.getByRole('button', { name: /preview/i }))
    expect(onPreview).toHaveBeenCalledOnce()
  })

  it('does not render a play button for missing clips', () => {
    render(
      <ThumbnailCell
        clip={{ ...baseClip, missing: true }}
        directory="/test"
        onPreview={vi.fn()}
      />
    )
    expect(screen.queryByRole('button', { name: /preview/i })).not.toBeInTheDocument()
  })
})
