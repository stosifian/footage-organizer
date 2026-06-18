import { describe, it, expect } from 'vitest'
import { execFileWithTimeout, isTimeoutError } from '../exec-timeout'

describe('execFileWithTimeout', () => {
  it('resolves normally for a fast command', async () => {
    const { stdout } = await execFileWithTimeout('node', ['-e', 'process.stdout.write("ok")'], {}, 5000)
    expect(stdout.toString()).toBe('ok')
  })

  it('rejects with a timeout error when the command runs too long', async () => {
    await expect(
      execFileWithTimeout('sleep', ['5'], {}, 100)
    ).rejects.toMatchObject({ killed: true })
  })

  it('isTimeoutError is true for a killed-on-timeout error', async () => {
    let caught: unknown
    try {
      await execFileWithTimeout('sleep', ['5'], {}, 100)
    } catch (err) {
      caught = err
    }
    expect(isTimeoutError(caught)).toBe(true)
  })

  it('isTimeoutError is false for a normal non-zero exit (not a timeout)', async () => {
    let caught: unknown
    try {
      // exits 1 immediately — a failure, but not a timeout
      await execFileWithTimeout('node', ['-e', 'process.exit(1)'], {}, 5000)
    } catch (err) {
      caught = err
    }
    expect(caught).toBeDefined()
    expect(isTimeoutError(caught)).toBe(false)
  })

  it('isTimeoutError is false for non-error values', () => {
    expect(isTimeoutError(null)).toBe(false)
    expect(isTimeoutError(new Error('plain'))).toBe(false)
  })
})
