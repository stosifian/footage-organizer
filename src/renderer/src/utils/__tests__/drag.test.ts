import { describe, it, expect } from 'vitest'
import { extractDroppedFolderPath, readDroppedDirectoryInfo } from '../drag'

// ── extractDroppedFolderPath ────────────────────────────────────────────────

function makeEvent(opts: {
  files?: Array<{ path?: string }>
  items?: Array<{ getAsFile?: () => { path?: string } | null }>
  uriList?: string
}) {
  return {
    dataTransfer: {
      files: opts.files ?? [],
      items: opts.items ?? [],
      getData: (type: string) => (type === 'text/uri-list' ? (opts.uriList ?? '') : '')
    }
  }
}

describe('extractDroppedFolderPath', () => {
  it('returns path from files[0] when populated', () => {
    expect(extractDroppedFolderPath(makeEvent({ files: [{ path: '/Volumes/SSD/footage' }] })))
      .toBe('/Volumes/SSD/footage')
  })

  it('falls back to items[0].getAsFile() when files is empty', () => {
    expect(extractDroppedFolderPath(makeEvent({
      files: [],
      items: [{ getAsFile: () => ({ path: '/Volumes/SSD/footage' }) }]
    }))).toBe('/Volumes/SSD/footage')
  })

  it('falls back to text/uri-list when files and items both fail (macOS Finder folder drop)', () => {
    expect(extractDroppedFolderPath(makeEvent({
      files: [],
      items: [{ getAsFile: () => null }],
      uriList: 'file:///Users/shawheentosifian/Movies/TEST/A'
    }))).toBe('/Users/shawheentosifian/Movies/TEST/A')
  })

  it('decodes percent-encoded characters in the uri-list path', () => {
    expect(extractDroppedFolderPath(makeEvent({ uriList: 'file:///Users/test/my%20footage%20folder' })))
      .toBe('/Users/test/my footage folder')
  })

  it('strips trailing slash from uri-list path', () => {
    expect(extractDroppedFolderPath(makeEvent({ uriList: 'file:///Users/test/footage/' })))
      .toBe('/Users/test/footage')
  })

  it('ignores comment lines in uri-list', () => {
    expect(extractDroppedFolderPath(makeEvent({ uriList: '# comment\nfile:///Users/test/footage' })))
      .toBe('/Users/test/footage')
  })

  it('returns undefined when files[0].path is missing', () => {
    expect(extractDroppedFolderPath(makeEvent({ files: [{}] }))).toBeUndefined()
  })

  it('returns undefined when all sources are empty', () => {
    expect(extractDroppedFolderPath(makeEvent({ files: [], items: [{ getAsFile: () => null }] })))
      .toBeUndefined()
  })

  it('returns undefined when dataTransfer is null', () => {
    expect(extractDroppedFolderPath({ dataTransfer: null })).toBeUndefined()
  })
})

// ── readDroppedDirectoryInfo ────────────────────────────────────────────────

function makeDirectoryEntry(
  folderName: string,
  files: Array<{ name: string; size?: number }>
): FileSystemDirectoryEntry {
  return {
    name: folderName,
    isDirectory: true,
    isFile: false,
    createReader: () => ({
      readEntries: (success: (entries: FileSystemEntry[]) => void) => {
        success(
          files.map((f) => ({
            name: f.name,
            isFile: true,
            isDirectory: false,
            file: (cb: (file: File) => void) => {
              cb(new File([new Uint8Array(f.size ?? 100)], f.name))
            }
          })) as unknown as FileSystemEntry[]
        )
      }
    })
  } as unknown as FileSystemDirectoryEntry
}

describe('readDroppedDirectoryInfo', () => {
  it('returns folder name, child file name, and child file size', async () => {
    const entry = makeDirectoryEntry('A', [{ name: 'clip.mov', size: 49668354 }])
    const info = await readDroppedDirectoryInfo(entry)
    expect(info).toEqual({ folderName: 'A', childFileName: 'clip.mov', childFileSize: 49668354 })
  })

  it('skips .DS_Store and uses the first real file', async () => {
    const entry = makeDirectoryEntry('A', [
      { name: '.DS_Store', size: 6148 },
      { name: 'A001.mov', size: 50000 }
    ])
    const info = await readDroppedDirectoryInfo(entry)
    expect(info?.childFileName).toBe('A001.mov')
  })

  it('returns undefined when directory has no non-hidden files', async () => {
    const entry = makeDirectoryEntry('A', [{ name: '.DS_Store', size: 6148 }])
    expect(await readDroppedDirectoryInfo(entry)).toBeUndefined()
  })

  it('returns undefined when directory is empty', async () => {
    const entry = makeDirectoryEntry('A', [])
    expect(await readDroppedDirectoryInfo(entry)).toBeUndefined()
  })
})
