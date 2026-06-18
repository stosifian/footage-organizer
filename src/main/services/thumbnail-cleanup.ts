// Pure selection logic for thumbnail disk cleanup (no I/O — unit-testable).

export interface ThumbFile {
  path: string
  size: number
  mtimeMs: number
}

// Disk thumbnail paths that no longer correspond to a current clip.
export function selectOrphans(diskFiles: string[], validFiles: Set<string>): string[] {
  return diskFiles.filter((f) => !validFiles.has(f))
}

// Files to delete so total stays within maxBytes, evicting oldest (by mtime) first.
// The single newest file is always kept (we never evict everything).
export function selectEvictions(files: ThumbFile[], maxBytes: number): string[] {
  const newestFirst = [...files].sort((a, b) => b.mtimeMs - a.mtimeMs)
  const evict: string[] = []
  let total = 0
  newestFirst.forEach((file, i) => {
    if (i === 0 || total + file.size <= maxBytes) {
      total += file.size
    } else {
      evict.push(file.path)
    }
  })
  return evict
}
