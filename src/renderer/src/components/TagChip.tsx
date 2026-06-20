import { X } from 'lucide-react'
import { getCategoryConfig, type TagCategory } from '../constants/preset-tags'

interface Props {
  tag: string
  category: TagCategory
  onRemove?: () => void
  compact?: boolean
}

export function TagChip({ tag, category, onRemove, compact }: Props) {
  const config = getCategoryConfig(category)

  return (
    <span
      className={`group/chip inline-flex items-center gap-1 rounded-full border ${
        compact ? 'px-1.5 py-0 text-[10px]' : 'px-2 py-0.5 text-xs'
      }`}
      style={{ color: config.color, background: config.bgColor, borderColor: config.borderColor }}
    >
      {tag}
      {onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onRemove()
          }}
          className="opacity-0 group-hover/chip:opacity-100 transition-opacity hover:opacity-70"
        >
          <X size={compact ? 10 : 12} />
        </button>
      )}
    </span>
  )
}
