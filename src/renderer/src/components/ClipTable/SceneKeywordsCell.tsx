import { useState } from 'react'
import { X, Plus } from 'lucide-react'
import { useClipStore } from '../../stores/useClipStore'

interface Props {
  clipId: string
  keywords: string[]
}

export function SceneKeywordsCell({ clipId, keywords }: Props) {
  const [adding, setAdding] = useState(false)
  const [input, setInput] = useState('')
  const updateClip = useClipStore((s) => s.updateClip)

  const handleRemove = (kw: string) => {
    updateClip(clipId, { sceneKeywords: keywords.filter((k) => k !== kw) })
  }

  const handleAdd = () => {
    const tag = input.trim().toLowerCase()
    if (tag && !keywords.includes(tag)) {
      updateClip(clipId, { sceneKeywords: [...keywords, tag] })
    }
    setInput('')
    setAdding(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAdd()
    } else if (e.key === 'Escape') {
      setInput('')
      setAdding(false)
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-1">
      {keywords.map((kw) => (
        <span
          key={kw}
          className="inline-flex items-center gap-0.5 px-1.5 py-0 rounded-full text-[10px] bg-emerald-950 border border-emerald-800 text-emerald-400 group/kw"
        >
          {kw}
          <button
            onClick={() => handleRemove(kw)}
            className="opacity-0 group-hover/kw:opacity-100 transition-opacity hover:text-emerald-200"
          >
            <X size={9} />
          </button>
        </span>
      ))}
      {adding ? (
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleAdd}
          autoFocus
          placeholder="keyword"
          className="w-16 bg-[var(--bg-elevated)] border border-emerald-700 rounded-full px-1.5 py-0 text-[10px] text-[var(--text-primary)] outline-none placeholder-[var(--text-label)]"
        />
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="text-[var(--text-label)] hover:text-[var(--text-secondary)] transition-colors"
        >
          <Plus size={12} />
        </button>
      )}
    </div>
  )
}
