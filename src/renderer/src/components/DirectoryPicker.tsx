import { FolderOpen, RefreshCw } from 'lucide-react'
import { useClipStore } from '../stores/useClipStore'

export function DirectoryPicker() {
  const { directory, openDirectory, scanDirectory, isScanning } = useClipStore()

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={openDirectory}
        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#252525] hover:bg-[#333] border border-[#333] text-sm font-medium transition-colors"
      >
        <FolderOpen size={16} />
        {directory ? 'Change Directory' : 'Open Directory'}
      </button>

      {directory && (
        <>
          <button
            onClick={() => scanDirectory(directory)}
            disabled={isScanning}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#252525] hover:bg-[#333] border border-[#333] text-sm transition-colors disabled:opacity-50"
            title="Re-scan directory"
          >
            <RefreshCw size={14} className={isScanning ? 'animate-spin' : ''} />
          </button>
          <span className="text-xs text-[#999] truncate max-w-[300px]" title={directory}>
            {directory}
          </span>
        </>
      )}
    </div>
  )
}
