import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { AIStatusPill } from '../AIStatusPill'

describe('AIStatusPill', () => {
  it('shows a ready label when status is ready', () => {
    render(<AIStatusPill status="ready" onClick={vi.fn()} />)
    expect(screen.getByText(/ai ready/i)).toBeInTheDocument()
  })

  it('shows a not-set-up label when status is not-ready', () => {
    render(<AIStatusPill status="not-ready" onClick={vi.fn()} />)
    expect(screen.getByText(/not set up/i)).toBeInTheDocument()
  })

  it('shows a checking label when status is checking', () => {
    render(<AIStatusPill status="checking" onClick={vi.fn()} />)
    expect(screen.getByText(/checking/i)).toBeInTheDocument()
  })

  it('calls onClick when clicked', () => {
    const onClick = vi.fn()
    render(<AIStatusPill status="not-ready" onClick={onClick} />)
    fireEvent.click(screen.getByRole('button'))
    expect(onClick).toHaveBeenCalledOnce()
  })
})
