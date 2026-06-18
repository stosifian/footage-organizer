import type { ScanProgress, AIProgress } from '../types/ipc'

interface Props {
  scanProgress: ScanProgress | null
  aiProgress: AIProgress | null
}

export function ProgressBar({ scanProgress, aiProgress }: Props) {
  const progress = scanProgress || aiProgress
  if (!progress) return null

  const current = 'phase' in progress ? progress.current : progress.current
  const total = 'phase' in progress ? progress.total : progress.total
  const pct = total > 0 ? (current / total) * 100 : 0

  let label = ''
  if ('phase' in progress) {
    const sp = progress as ScanProgress
    if (sp.phase === 'scanning') label = 'Scanning for video files...'
    else if (sp.phase === 'metadata') label = `Extracting metadata (${sp.current}/${sp.total})`
    else if (sp.phase === 'complete') label = 'Scan complete'
  } else {
    const ap = progress as AIProgress
    label = `Generating descriptions (${ap.current}/${ap.total}): ${ap.fileName}`
  }

  return (
    <div className="px-4 py-2 bg-[#1a1a1a] border-b border-[#333]">
      <div className="flex items-center gap-3">
        <div className="flex-1 bg-[#252525] rounded-full h-2 overflow-hidden">
          <div
            className="h-full bg-blue-500 rounded-full transition-all duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="text-xs text-[#999] whitespace-nowrap">{label}</span>
      </div>
    </div>
  )
}
