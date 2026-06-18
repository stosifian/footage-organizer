import { useEffect, useRef, useState } from 'react'
import { X, ExternalLink } from 'lucide-react'
import type { ClipData } from '../types/clip'
import { filePathToFootageUrl } from '../utils/footage-url'

const STALL_TIMEOUT_MS = 5000

interface Props {
  clip: ClipData | null
  onClose: () => void
}

export function VideoPreviewModal({ clip, onClose }: Props) {
  const [videoError, setVideoError] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)

  // Reset error state when clip changes
  useEffect(() => {
    setVideoError(false)
  }, [clip])

  // Escape key to close
  useEffect(() => {
    if (!clip) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [clip, onClose])

  // Stall timeout: if the video hasn't buffered enough to play after 5 s, show fallback.
  // onError alone is insufficient — Chromium sometimes silently stalls on unsupported codecs
  // without firing an error event.
  useEffect(() => {
    if (videoError || !clip) return
    const timer = setTimeout(() => {
      if (videoRef.current && videoRef.current.readyState < 2) {
        setVideoError(true)
      }
    }, STALL_TIMEOUT_MS)
    return () => clearTimeout(timer)
  }, [clip, videoError])

  if (!clip) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Video preview"
      className="fixed inset-0 z-50 flex items-center justify-center"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80"
        onClick={onClose}
        data-testid="preview-backdrop"
      />

      {/* Panel */}
      <div className="relative z-10 flex flex-col w-[82vw] max-h-[88vh] bg-[#111] rounded-xl overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-[#1a1a1a] border-b border-[#333] shrink-0">
          <span className="text-sm text-[#ccc] truncate max-w-[90%]">{clip.fileName}</span>
          <button
            onClick={onClose}
            aria-label="Close preview"
            className="p-1 rounded hover:bg-[#333] transition-colors text-[#999] hover:text-white shrink-0"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        {videoError ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 bg-black py-12">
            <p className="text-sm text-[#666]">This format cannot be played inline.</p>
            <button
              onClick={() => window.api.openInPlayer(clip.filePath)}
              aria-label="Open in system player"
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#252525] hover:bg-[#333] border border-[#444] text-sm text-[#ccc] transition-colors"
            >
              <ExternalLink size={14} />
              Open in system player
            </button>
          </div>
        ) : (
          <video
            ref={videoRef}
            key={clip.id}
            src={filePathToFootageUrl(clip.filePath)}
            controls
            autoPlay
            className="w-full flex-1 bg-black min-h-0"
            data-testid="preview-video"
            onError={() => setVideoError(true)}
          />
        )}
      </div>
    </div>
  )
}
