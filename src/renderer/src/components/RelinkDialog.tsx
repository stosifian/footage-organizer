import { useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { FolderSearch, AlertTriangle, CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { useClipStore } from '../stores/useClipStore'
import { useSettingsStore } from '../stores/useSettingsStore'

interface Props {
  open: boolean
  missingPath: string
  onClose: () => void
}

export function RelinkDialog({ open, missingPath, onClose }: Props) {
  const [screen, setScreen] = useState<'intro' | 'review'>('intro')
  const [scanning, setScanning] = useState(false)
  const { pendingRelink, relinkDirectory, confirmRelink, cancelRelink } = useClipStore()
  const { updateSettings } = useSettingsStore()

  const handlePickDirectory = async () => {
    const newDir = await window.api.selectDirectory()
    if (!newDir) return

    setScanning(true)
    try {
      await relinkDirectory(missingPath, newDir)
      setScreen('review')
    } finally {
      setScanning(false)
    }
  }

  const handleConfirm = async () => {
    if (!pendingRelink) return
    await confirmRelink()
    await updateSettings({ lastOpenedDirectory: pendingRelink.newDirPath })
    onClose()
  }

  const handleCancel = () => {
    cancelRelink()
    setScreen('intro')
    onClose()
  }

  const matchPercent = pendingRelink
    ? Math.round((pendingRelink.matchCount / Math.max(pendingRelink.totalOldClips, 1)) * 100)
    : 0

  const matchColor =
    matchPercent > 80 ? 'text-green-400' : matchPercent >= 20 ? 'text-amber-400' : 'text-red-400'
  const MatchIcon = matchPercent > 80 ? CheckCircle : matchPercent >= 20 ? AlertTriangle : XCircle
  const matchLabel =
    matchPercent > 80
      ? 'Good match'
      : matchPercent >= 20
        ? 'Partial match — consider reviewing'
        : 'Poor match — may be wrong directory'

  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && handleCancel()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 z-40" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[480px] bg-[#1a1a1a] border border-[#333] rounded-xl shadow-2xl p-6 z-50">
          {screen === 'intro' && (
            <>
              <Dialog.Title className="text-lg font-semibold mb-2 flex items-center gap-2">
                <FolderSearch size={20} className="text-amber-400" />
                Directory Not Found
              </Dialog.Title>
              <Dialog.Description className="text-sm text-[#999] mb-4">
                The previously opened directory no longer exists at:
              </Dialog.Description>
              <div className="bg-[#252525] border border-[#333] rounded-lg px-3 py-2 mb-6 text-xs text-[#ccc] font-mono break-all">
                {missingPath}
              </div>
              <p className="text-sm text-[#999] mb-6">
                If you moved or renamed the directory, pick the new location to relink your clip
                metadata (tags, descriptions, keywords).
              </p>
              <div className="flex justify-end gap-2">
                <button
                  onClick={handleCancel}
                  className="px-4 py-2 text-sm bg-[#252525] hover:bg-[#333] border border-[#333] rounded-lg transition-colors"
                >
                  Dismiss
                </button>
                <button
                  onClick={handlePickDirectory}
                  disabled={scanning}
                  className="flex items-center gap-2 px-4 py-2 text-sm bg-accent hover:bg-accent-hover rounded-lg transition-colors disabled:opacity-50 font-medium"
                >
                  {scanning ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <FolderSearch size={14} />
                  )}
                  Pick New Location
                </button>
              </div>
            </>
          )}

          {screen === 'review' && pendingRelink && (
            <>
              <Dialog.Title className="text-lg font-semibold mb-4">
                Review Matched Clips
              </Dialog.Title>

              <div className="space-y-3 mb-6">
                <div className={`flex items-center gap-2 ${matchColor}`}>
                  <MatchIcon size={18} />
                  <span className="text-sm font-medium">{matchPercent}% matched — {matchLabel}</span>
                </div>

                <div className="bg-[#252525] border border-[#333] rounded-lg p-4 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-[#999]">Old clips with metadata</span>
                    <span className="text-[#e5e5e5]">{pendingRelink.totalOldClips}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#999]">New files found</span>
                    <span className="text-[#e5e5e5]">{pendingRelink.totalNewFiles}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#999]">Matched</span>
                    <span className="text-green-400 font-medium">{pendingRelink.matchCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#999]">Unmatched (will be marked missing)</span>
                    <span className="text-amber-400">
                      {pendingRelink.totalOldClips - pendingRelink.matchCount}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-[#999] font-mono break-all">
                  New path: {pendingRelink.newDirPath}
                </p>
              </div>

              <div className="flex justify-end gap-2">
                <button
                  onClick={handleCancel}
                  className="px-4 py-2 text-sm bg-[#252525] hover:bg-[#333] border border-[#333] rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirm}
                  className="px-4 py-2 text-sm bg-accent hover:bg-accent-hover rounded-lg transition-colors font-medium"
                >
                  Confirm Relink
                </button>
              </div>
            </>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
