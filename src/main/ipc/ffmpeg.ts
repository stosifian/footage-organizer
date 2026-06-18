import { getThumbnailBase64 } from '../services/thumbnail-cache'

let rootDir: string = ''

export function setRootDir(dir: string): void {
  rootDir = dir
}

export async function handleGetThumbnail(
  _clipId: string,
  filePath: string,
  relativePath: string,
  duration: number
): Promise<string | null> {
  if (!rootDir) return null
  return getThumbnailBase64(rootDir, relativePath, filePath, duration)
}
