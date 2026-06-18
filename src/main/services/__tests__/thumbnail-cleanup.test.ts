import { describe, it, expect } from 'vitest'
import { selectOrphans, selectEvictions } from '../thumbnail-cleanup'

describe('selectOrphans', () => {
  it('returns disk files not in the valid set', () => {
    const disk = ['/t/a.jpg', '/t/b.jpg', '/t/c.jpg']
    const valid = new Set(['/t/a.jpg', '/t/c.jpg'])
    expect(selectOrphans(disk, valid)).toEqual(['/t/b.jpg'])
  })

  it('returns empty when all disk files are valid', () => {
    const disk = ['/t/a.jpg', '/t/b.jpg']
    expect(selectOrphans(disk, new Set(disk))).toEqual([])
  })

  it('returns all disk files when none are valid', () => {
    const disk = ['/t/a.jpg', '/t/b.jpg']
    expect(selectOrphans(disk, new Set())).toEqual(disk)
  })
})

describe('selectEvictions', () => {
  const f = (path: string, size: number, mtimeMs: number) => ({ path, size, mtimeMs })

  it('returns nothing when total is within budget', () => {
    const files = [f('/a', 100, 1), f('/b', 100, 2)]
    expect(selectEvictions(files, 500)).toEqual([])
  })

  it('returns nothing at exactly the budget boundary', () => {
    const files = [f('/a', 250, 1), f('/b', 250, 2)]
    expect(selectEvictions(files, 500)).toEqual([])
  })

  it('evicts the oldest files first until under budget', () => {
    // newest (mtime 3) kept; total 300 over budget 150 → evict oldest until <=150
    const files = [f('/old', 100, 1), f('/mid', 100, 2), f('/new', 100, 3)]
    // keep /new (100) <=150; adding /mid would be 200 >150 → evict /mid and /old
    expect(selectEvictions(files, 150).sort()).toEqual(['/mid', '/old'])
  })

  it('keeps the newest file even if a single file exceeds the budget', () => {
    const files = [f('/old', 100, 1), f('/huge', 1000, 2)]
    // newest /huge kept (we never evict everything); /old evicted
    expect(selectEvictions(files, 50)).toEqual(['/old'])
  })
})
