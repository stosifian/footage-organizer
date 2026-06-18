import { describe, it, expect } from 'vitest'
import { filePathToFootageUrl } from '../footage-url'

// footage://localhost is used so Chromium (standard: true) parses /Users/... as
// the pathname rather than treating 'Users' as the hostname.
describe('filePathToFootageUrl', () => {
  it('converts a simple absolute path', () => {
    expect(filePathToFootageUrl('/Users/test/clip.mov'))
      .toBe('footage://localhost/Users/test/clip.mov')
  })

  it('percent-encodes spaces in directory names', () => {
    expect(filePathToFootageUrl('/Users/test/my footage/clip.mov'))
      .toBe('footage://localhost/Users/test/my%20footage/clip.mov')
  })

  it('percent-encodes spaces in filenames', () => {
    expect(filePathToFootageUrl('/Users/test/my clip.mov'))
      .toBe('footage://localhost/Users/test/my%20clip.mov')
  })

  it('handles paths on external volumes with spaces', () => {
    expect(filePathToFootageUrl('/Volumes/My SSD/footage/A001.mov'))
      .toBe('footage://localhost/Volumes/My%20SSD/footage/A001.mov')
  })

  it('leaves clean paths unchanged', () => {
    expect(filePathToFootageUrl('/Volumes/SSD/A/A001_C005.mov'))
      .toBe('footage://localhost/Volumes/SSD/A/A001_C005.mov')
  })
})
