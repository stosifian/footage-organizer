// On macOS in Electron 33, dropping a folder from Finder may leave dataTransfer.files
// empty and getAsFile() returns null for directories. We try three sources in order:
// 1. dataTransfer.files[0].path  (Electron File extension — works for file drops)
// 2. items[0].getAsFile().path   (sometimes populated for folder drops)
// 3. text/uri-list               (macOS Finder always includes a file:// URL here — most reliable)
export function extractDroppedFolderPath(e: {
  dataTransfer: {
    files: FileList | Array<unknown>
    items: DataTransferItemList | Array<{ getAsFile?: () => unknown }>
    getData?: (type: string) => string
  } | null
}): string | undefined {
  if (!e.dataTransfer) return undefined

  const fromFiles = Array.from(e.dataTransfer.files)[0] as { path?: string } | undefined
  if (fromFiles?.path) return fromFiles.path

  const fromItems = e.dataTransfer.items[0]?.getAsFile?.() as { path?: string } | null | undefined
  if (fromItems?.path) return fromItems.path

  // file:// URL provided by the OS — strip hostname and decode percent-encoding
  const uriList = e.dataTransfer.getData?.('text/uri-list') ?? ''
  const url = uriList.split(/\r?\n/).find((line) => !line.startsWith('#') && line.trim())
  if (url?.startsWith('file://')) {
    const decoded = decodeURIComponent(url.replace(/^file:\/\/[^/]*/, '').replace(/\/$/, ''))
    if (decoded) return decoded
  }

  return undefined
}

export interface DroppedDirectoryInfo {
  folderName: string
  childFileName: string
  childFileSize: number
}

// Electron 33 does not set File.path on objects from FileSystemFileEntry.file(), so
// we can't derive the folder path from the drop event at all. This function reads a
// child file's name and size from the directory entry so the main process can find the
// folder on disk without relying on the path property.
export async function readDroppedDirectoryInfo(
  entry: FileSystemDirectoryEntry
): Promise<DroppedDirectoryInfo | undefined> {
  const entries = await new Promise<FileSystemEntry[]>((resolve, reject) => {
    entry.createReader().readEntries(resolve, reject)
  })

  // Skip hidden files (.DS_Store etc.)
  const fileEntry = entries.find((e) => e.isFile && !e.name.startsWith('.')) as FileSystemFileEntry | undefined
  if (!fileEntry) return undefined

  const file = await new Promise<File>((resolve, reject) => fileEntry.file(resolve, reject))

  return {
    folderName: entry.name,
    childFileName: file.name,
    childFileSize: file.size
  }
}
