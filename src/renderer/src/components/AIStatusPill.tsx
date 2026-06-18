import { Loader2, Sparkles, AlertTriangle } from 'lucide-react'
import type { AIStatus } from '../utils/ai-status'

interface Props {
  status: AIStatus
  onClick: () => void
}

export function AIStatusPill({ status, onClick }: Props) {
  const config = {
    checking: {
      label: 'Checking…',
      className: 'bg-[#252525] border-[#333] text-[#999]',
      icon: <Loader2 size={11} className="animate-spin" />
    },
    ready: {
      label: 'AI ready',
      className: 'bg-green-600/15 border-green-700 text-green-400',
      icon: <Sparkles size={11} />
    },
    'not-ready': {
      label: 'AI not set up',
      className: 'bg-amber-600/15 border-amber-700 text-amber-400',
      icon: <AlertTriangle size={11} />
    }
  }[status]

  return (
    <button
      onClick={onClick}
      title="AI provider status — click to open Settings"
      className={`flex items-center gap-1.5 px-2 py-1 text-[11px] rounded-full border transition-colors ${config.className}`}
    >
      {config.icon}
      {config.label}
    </button>
  )
}
