import { useState, useEffect } from 'react'
import { Film, FileX, Play } from 'lucide-react'
import type { ClipData } from '../../types/clip'

interface Props {
  clip: ClipData
  directory: string
  onPreview: () => void
}

export function ThumbnailCell({ clip, directory, onPreview }: Props) {
  const [src, setSrc] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (!directory || clip.missing) return
    let cancelled = false

    const timer = setTimeout(() => {
      window.api.getThumbnail(clip.id, clip.filePath, clip.relativePath, clip.duration).then((b64) => {
        if (!cancelled && b64) {
          setSrc(b64)
        }
      })
    }, 150)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [clip.id, clip.filePath, clip.relativePath, clip.duration, clip.missing, directory])

  if (clip.missing) {
    return (
      <div className="w-[80px] h-[45px] bg-[var(--bg-elevated)] rounded flex items-center justify-center">
        <FileX size={16} className="text-red-400/60" />
      </div>
    )
  }

  return (
    <div className="relative w-[80px] h-[45px] group">
      {src ? (
        <img
          src={src}
          alt={clip.fileName}
          className={`w-full h-full object-cover rounded transition-opacity ${loaded ? 'opacity-100' : 'opacity-0'}`}
          onLoad={() => setLoaded(true)}
        />
      ) : (
        <div className="w-full h-full bg-[var(--bg-elevated)] rounded flex items-center justify-center">
          <Film size={16} className="text-[var(--text-label)]" />
        </div>
      )}

      <button
        onClick={onPreview}
        aria-label="Preview clip"
        className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded"
      >
        <Play size={14} className="text-white fill-white" />
      </button>
    </div>
  )
}
