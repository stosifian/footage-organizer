import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { AISetupBanner } from '../AISetupBanner'

describe('AISetupBanner', () => {
  it('renders the provided message', () => {
    render(<AISetupBanner message="Add your Gemini API key." onConfigure={vi.fn()} onDismiss={vi.fn()} />)
    expect(screen.getByText('Add your Gemini API key.')).toBeInTheDocument()
  })

  it('calls onConfigure when the Set up AI button is clicked', () => {
    const onConfigure = vi.fn()
    render(<AISetupBanner message="x" onConfigure={onConfigure} onDismiss={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /set up ai/i }))
    expect(onConfigure).toHaveBeenCalledOnce()
  })

  it('calls onDismiss when the dismiss button is clicked', () => {
    const onDismiss = vi.fn()
    render(<AISetupBanner message="x" onConfigure={vi.fn()} onDismiss={onDismiss} />)
    fireEvent.click(screen.getByRole('button', { name: /dismiss/i }))
    expect(onDismiss).toHaveBeenCalledOnce()
  })
})
