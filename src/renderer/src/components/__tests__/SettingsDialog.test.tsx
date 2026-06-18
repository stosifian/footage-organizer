import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { SettingsDialog } from '../SettingsDialog'
import { useSettingsStore } from '../../stores/useSettingsStore'
import { defaultSettings } from '../../types/settings'

beforeEach(() => {
  useSettingsStore.setState({ settings: { ...defaultSettings }, loaded: true })
  vi.mocked(window.api.testAIConnection).mockResolvedValue({ success: true, message: 'Connected.' })
  vi.mocked(window.api.pullOllamaModel).mockResolvedValue({ success: true })
  vi.mocked(window.api.onOllamaPullProgress).mockReturnValue(() => {})
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('SettingsDialog', () => {
  it('shows the dialog content when open is true', () => {
    render(<SettingsDialog open={true} onOpenChange={vi.fn()} />)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('Settings')).toBeInTheDocument()
  })

  it('does not show the dialog content when open is false', () => {
    render(<SettingsDialog open={false} onOpenChange={vi.fn()} />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('calls onOpenChange(true) when the gear trigger is clicked (regression)', () => {
    const onOpenChange = vi.fn()
    render(<SettingsDialog open={false} onOpenChange={onOpenChange} />)
    fireEvent.click(screen.getByRole('button', { name: /settings/i }))
    expect(onOpenChange).toHaveBeenCalledWith(true)
  })

  it('calls onOpenChange(false) when closed via the X button', () => {
    const onOpenChange = vi.fn()
    render(<SettingsDialog open={true} onOpenChange={onOpenChange} />)
    const closeButtons = screen.getAllByRole('button')
    const xButton = closeButtons.find((b) => b.querySelector('.lucide-x'))
    fireEvent.click(xButton!)
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })
})

describe('SettingsDialog — provider picker steering', () => {
  it('shows the no-install subtitle for Gemini', () => {
    render(<SettingsDialog open={true} onOpenChange={vi.fn()} />)
    expect(screen.getByText(/no install · needs api key/i)).toBeInTheDocument()
  })

  it('shows the requires-install subtitle for Ollama', () => {
    render(<SettingsDialog open={true} onOpenChange={vi.fn()} />)
    expect(screen.getByText(/local · free · requires install/i)).toBeInTheDocument()
  })
})

describe('SettingsDialog — model-missing download flow', () => {
  beforeEach(() => {
    vi.mocked(window.api.testAIConnection).mockResolvedValue({
      success: false,
      reason: 'model-missing',
      message: "Connected, but model isn't downloaded yet."
    })
  })

  it('shows a Download model button', async () => {
    render(<SettingsDialog open={true} onOpenChange={vi.fn()} />)
    expect(await screen.findByRole('button', { name: /download model/i })).toBeInTheDocument()
  })

  it('calls pullOllamaModel when the Download model button is clicked', async () => {
    // Keep the pull pending so progress UI stays mounted
    vi.mocked(window.api.pullOllamaModel).mockReturnValue(new Promise(() => {}))
    render(<SettingsDialog open={true} onOpenChange={vi.fn()} />)
    fireEvent.click(await screen.findByRole('button', { name: /download model/i }))
    expect(window.api.pullOllamaModel).toHaveBeenCalled()
  })

  it('renders pull progress percent from progress events', async () => {
    vi.mocked(window.api.pullOllamaModel).mockReturnValue(new Promise(() => {}))
    let progressCb: ((p: { status: string; percent: number }) => void) | null = null
    vi.mocked(window.api.onOllamaPullProgress).mockImplementation((cb) => {
      progressCb = cb as (p: { status: string; percent: number }) => void
      return () => {}
    })
    render(<SettingsDialog open={true} onOpenChange={vi.fn()} />)
    fireEvent.click(await screen.findByRole('button', { name: /download model/i }))
    act(() => progressCb!({ status: 'pulling', percent: 42 }))
    expect(screen.getByText(/42%/)).toBeInTheDocument()
  })
})

describe('SettingsDialog — unreachable steering', () => {
  beforeEach(() => {
    vi.mocked(window.api.testAIConnection).mockResolvedValue({
      success: false,
      reason: 'unreachable',
      message: 'Cannot connect to Ollama.'
    })
  })

  it('nudges toward Gemini when Ollama is unreachable', async () => {
    render(<SettingsDialog open={true} onOpenChange={vi.fn()} />)
    expect(await screen.findByText(/switch to google gemini/i)).toBeInTheDocument()
  })
})
