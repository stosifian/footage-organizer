import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { SettingsDialog } from '../SettingsDialog'

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
    // The close (X) button inside the dialog header
    const closeButtons = screen.getAllByRole('button')
    const xButton = closeButtons.find((b) => b.querySelector('.lucide-x'))
    fireEvent.click(xButton!)
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })
})
