import { describe, it, expect } from 'vitest'
import { pullProgressToPercent } from '../pull-progress'

describe('pullProgressToPercent', () => {
  it('returns 0 when total is 0', () => {
    expect(pullProgressToPercent({ completed: 0, total: 0 })).toBe(0)
  })

  it('returns 0 when total is missing/undefined', () => {
    expect(pullProgressToPercent({ completed: 5 } as { completed: number; total: number })).toBe(0)
  })

  it('returns 50 for 5 of 10', () => {
    expect(pullProgressToPercent({ completed: 5, total: 10 })).toBe(50)
  })

  it('returns 100 for 10 of 10', () => {
    expect(pullProgressToPercent({ completed: 10, total: 10 })).toBe(100)
  })

  it('rounds to the nearest integer', () => {
    expect(pullProgressToPercent({ completed: 1, total: 3 })).toBe(33)
  })

  it('clamps above 100', () => {
    expect(pullProgressToPercent({ completed: 12, total: 10 })).toBe(100)
  })

  it('clamps below 0', () => {
    expect(pullProgressToPercent({ completed: -5, total: 10 })).toBe(0)
  })
})
