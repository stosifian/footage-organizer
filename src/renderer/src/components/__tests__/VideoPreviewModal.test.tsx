import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { VideoPreviewModal } from '../VideoPreviewModal'
import type { ClipData } from '../../types/clip'

const mockClip: ClipData = {
  id: 'clip-1',
  fileName: 'A001_C005.mov',
  filePath: '/Users/test/footage/A001_C005.mov',
  relativePath: 'A001_C005.mov',
  folder: '',
  dateShot: null,
  duration: 120,
  resolution: '1920x1080',
  codec: 'prores',
  fileSize: 49668354,
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

describe('VideoPreviewModal', () => {
  it('renders nothing when clip is null', () => {
    const { container } = render(<VideoPreviewModal clip={null} onClose={vi.fn()} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('renders a dialog when a clip is provided', () => {
    render(<VideoPreviewModal clip={mockClip} onClose={vi.fn()} />)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('displays the clip filename', () => {
    render(<VideoPreviewModal clip={mockClip} onClose={vi.fn()} />)
    expect(screen.getByText('A001_C005.mov')).toBeInTheDocument()
  })

  it('renders a video element with a footage:// src', () => {
    render(<VideoPreviewModal clip={mockClip} onClose={vi.fn()} />)
    const video = screen.getByTestId('preview-video') as HTMLVideoElement
    expect(video.tagName).toBe('VIDEO')
    expect(video).toHaveAttribute('src', 'footage://localhost/Users/test/footage/A001_C005.mov')
  })

  it('calls onClose when the close button is clicked', () => {
    const onClose = vi.fn()
    render(<VideoPreviewModal clip={mockClip} onClose={onClose} />)
    fireEvent.click(screen.getByRole('button', { name: /close/i }))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('calls onClose when the backdrop is clicked', () => {
    const onClose = vi.fn()
    render(<VideoPreviewModal clip={mockClip} onClose={onClose} />)
    fireEvent.click(screen.getByTestId('preview-backdrop'))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('calls onClose when Escape is pressed', () => {
    const onClose = vi.fn()
    render(<VideoPreviewModal clip={mockClip} onClose={onClose} />)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledOnce()
  })
})

describe('VideoPreviewModal — onError fallback', () => {
  it('shows an "Open in system player" button when the video errors', () => {
    render(<VideoPreviewModal clip={mockClip} onClose={vi.fn()} />)
    fireEvent.error(screen.getByTestId('preview-video'))
    expect(screen.getByRole('button', { name: /open in system player/i })).toBeInTheDocument()
  })

  it('hides the video element after an error', () => {
    render(<VideoPreviewModal clip={mockClip} onClose={vi.fn()} />)
    fireEvent.error(screen.getByTestId('preview-video'))
    expect(screen.queryByTestId('preview-video')).not.toBeInTheDocument()
  })

  it('calls window.api.openInPlayer with the file path when the fallback button is clicked', () => {
    render(<VideoPreviewModal clip={mockClip} onClose={vi.fn()} />)
    fireEvent.error(screen.getByTestId('preview-video'))
    fireEvent.click(screen.getByRole('button', { name: /open in system player/i }))
    expect(window.api.openInPlayer).toHaveBeenCalledWith('/Users/test/footage/A001_C005.mov')
  })
})

describe('VideoPreviewModal — stall timeout fallback', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('shows the fallback button if the video has not loaded within 5 seconds', () => {
    render(<VideoPreviewModal clip={mockClip} onClose={vi.fn()} />)
    // jsdom video readyState stays 0 (HAVE_NOTHING) — simulates a stalled/unsupported load
    act(() => { vi.advanceTimersByTime(5001) })
    expect(screen.getByRole('button', { name: /open in system player/i })).toBeInTheDocument()
  })

  it('does not show the fallback if the video loads normally', () => {
    render(<VideoPreviewModal clip={mockClip} onClose={vi.fn()} />)
    const video = screen.getByTestId('preview-video') as HTMLVideoElement
    // Simulate successful buffering: readyState HAVE_ENOUGH_DATA = 4
    Object.defineProperty(video, 'readyState', { value: 4, configurable: true })
    act(() => { vi.advanceTimersByTime(5001) })
    expect(screen.queryByRole('button', { name: /open in system player/i })).not.toBeInTheDocument()
  })
})
