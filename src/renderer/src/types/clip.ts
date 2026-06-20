export interface ClipData {
  id: string
  fileName: string
  filePath: string
  relativePath: string
  folder: string
  dateShot: string | null
  duration: number
  resolution: string
  codec: string
  frameRate?: string | null
  fileSize: number
  contentHash: string | null
  thumbnailPath: string | null
  sceneDescription: string | null
  sceneKeywords: string[]
  visualTexture: string[]
  energy: string[]
  mood: string[]
  lightQuality: string[]
  location: string[]
  missing?: boolean
}

export interface FootageProject {
  version: number
  directory: string
  clips: ClipData[]
  customTags: {
    visualTexture: string[]
    energy: string[]
    mood: string[]
    lightQuality: string[]
  }
  lastUpdated: string
}
