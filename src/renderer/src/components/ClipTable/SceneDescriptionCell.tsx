import { useState, useRef, useEffect } from 'react'
import { Sparkles, Loader2, Pencil } from 'lucide-react'
import { useClipStore } from '../../stores/useClipStore'

interface Props {
  clipId: string
  description: string | null
  missing?: boolean
}

export function SceneDescriptionCell({ clipId, description, missing }: Props) {
  const [generating, setGenerating] = useState(false)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const [error, setError] = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const generateDescription = useClipStore((s) => s.generateDescription)
  const updateClip = useClipStore((s) => s.updateClip)

  useEffect(() => {
    if (editing && textareaRef.current) {
      textareaRef.current.focus()
      textareaRef.current.selectionStart = textareaRef.current.value.length
    }
  }, [editing])

  const handleGenerate = async () => {
    setGenerating(true)
    setError(null)
    try {
      await generateDescription(clipId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed')
    } finally {
      setGenerating(false)
    }
  }

  const handleStartEdit = () => {
    setDraft(description || '')
    setEditing(true)
  }

  const handleSave = () => {
    const trimmed = draft.trim()
    updateClip(clipId, { sceneDescription: trimmed || null })
    setEditing(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setEditing(false)
    } else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleSave()
    }
  }

  if (missing) {
    return description ? (
      <p className="text-xs text-[#999] leading-relaxed whitespace-pre-wrap break-words italic">
        {description}
      </p>
    ) : null
  }

  if (editing) {
    return (
      <div className="flex flex-col gap-1">
        <textarea
          ref={textareaRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleSave}
          rows={3}
          className="w-full bg-[#252525] border border-accent rounded px-2 py-1 text-xs text-[#e5e5e5] outline-none resize-y leading-relaxed"
        />
        <span className="text-[10px] text-[#666]">Cmd+Enter to save, Esc to cancel</span>
      </div>
    )
  }

  if (description) {
    return (
      <div className="group relative">
        <p
          className="text-xs text-[#ccc] leading-relaxed whitespace-pre-wrap break-words cursor-pointer"
          onClick={handleStartEdit}
        >
          {description}
        </p>
        <button
          onClick={handleStartEdit}
          className="absolute top-0 right-0 p-0.5 opacity-0 group-hover:opacity-100 transition-opacity text-[#666] hover:text-[#999]"
        >
          <Pencil size={10} />
        </button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleGenerate}
        disabled={generating}
        className="flex items-center gap-1 px-2 py-1 text-xs bg-[#252525] hover:bg-[#333] border border-[#333] rounded transition-colors disabled:opacity-50"
      >
        {generating ? (
          <Loader2 size={12} className="animate-spin" />
        ) : (
          <Sparkles size={12} />
        )}
        Generate
      </button>
      <button
        onClick={handleStartEdit}
        className="flex items-center gap-1 px-2 py-1 text-xs bg-[#252525] hover:bg-[#333] border border-[#333] rounded transition-colors"
      >
        <Pencil size={12} />
        Write
      </button>
      {error && <span className="text-xs text-red-400 truncate max-w-[120px]">{error}</span>}
    </div>
  )
}
