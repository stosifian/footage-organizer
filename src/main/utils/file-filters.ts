const VIDEO_EXTENSIONS = new Set([
  '.mp4', '.mov', '.avi', '.mkv', '.wmv', '.flv', '.webm',
  '.m4v', '.mpg', '.mpeg', '.3gp', '.mts', '.m2ts',
  '.ts', '.vob', '.ogv', '.mxf', '.r3d', '.braw', '.ari',
  '.dng', '.cr3', '.prores'
])

export function isVideoFile(fileName: string): boolean {
  const ext = fileName.substring(fileName.lastIndexOf('.')).toLowerCase()
  return VIDEO_EXTENSIONS.has(ext)
}
