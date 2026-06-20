import { AlertTriangle, X } from 'lucide-react'

interface Props {
  message: string
  onConfigure: () => void
  onDismiss: () => void
}

export function AISetupBanner({ message, onConfigure, onDismiss }: Props) {
  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-amber-600/10 border-b border-amber-700/40 text-xs text-amber-200">
      <AlertTriangle size={14} className="shrink-0 text-amber-400" />
      <span className="flex-1">{message}</span>
      <button
        onClick={onConfigure}
        className="px-3 py-1 rounded-[var(--radius-md)] bg-amber-600 hover:bg-amber-500 text-white font-medium transition-colors"
      >
        Set up AI
      </button>
      <button
        onClick={onDismiss}
        aria-label="Dismiss"
        className="p-1 rounded hover:bg-amber-600/20 text-amber-300/70 hover:text-amber-200 transition-colors"
      >
        <X size={14} />
      </button>
    </div>
  )
}
