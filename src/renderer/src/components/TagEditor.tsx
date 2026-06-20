import { useState } from 'react'
import * as Popover from '@radix-ui/react-popover'
import { Plus, Search } from 'lucide-react'
import { TagChip } from './TagChip'
import { getCategoryConfig, type TagCategory } from '../constants/preset-tags'
import { useClipStore } from '../stores/useClipStore'

interface Props {
  clipId: string
  category: TagCategory
  selectedTags: string[]
}

export function TagEditor({ clipId, category, selectedTags }: Props) {
  const [search, setSearch] = useState('')
  const [customInput, setCustomInput] = useState('')
  const { addTag, removeTag, addCustomTag, customTags } = useClipStore()

  const config = getCategoryConfig(category)
  const allTags = [...config.presets, ...(customTags[category] || [])]
  const filtered = allTags.filter(
    (t) => t.toLowerCase().includes(search.toLowerCase()) && !selectedTags.includes(t)
  )

  const handleAddCustom = () => {
    const tag = customInput.trim()
    if (!tag) return
    if (!allTags.includes(tag)) {
      addCustomTag(category, tag)
    }
    addTag(clipId, category, tag)
    setCustomInput('')
  }

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button className="flex items-center gap-1 min-h-[28px] w-full text-left group">
          <div className="flex flex-wrap gap-1 flex-1">
            {selectedTags.map((tag) => (
              <TagChip
                key={tag}
                tag={tag}
                category={category}
                compact
                onRemove={() => removeTag(clipId, category, tag)}
              />
            ))}
            <span className="inline-flex items-center text-[var(--text-label)] hover:text-[var(--text-secondary)] transition-colors">
              <Plus size={12} />
            </span>
          </div>
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          className="w-64 bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-[var(--radius-lg)] shadow-2xl p-3 z-50"
          sideOffset={5}
          align="start"
        >
          <div className="text-xs font-medium text-[var(--text-secondary)] mb-2">{config.label}</div>

          <div className="relative mb-2">
            <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-[var(--text-label)]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter tags..."
              className="w-full bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded px-2 py-1 pl-6 text-xs text-[var(--text-primary)] placeholder-[var(--text-label)] outline-none focus:border-[var(--border-focus)]"
            />
          </div>

          <div className="flex flex-wrap gap-1 max-h-[160px] overflow-y-auto mb-2">
            {filtered.map((tag) => (
              <button
                key={tag}
                onClick={() => addTag(clipId, category, tag)}
                className="px-2 py-0.5 rounded-full text-xs border hover:opacity-80 transition-opacity"
                style={{ color: config.color, background: config.bgColor, borderColor: config.borderColor }}
              >
                {tag}
              </button>
            ))}
            {filtered.length === 0 && (
              <span className="text-xs text-[var(--text-label)]">No matching tags</span>
            )}
          </div>

          <div className="flex gap-1 border-t border-[var(--border-default)] pt-2">
            <input
              type="text"
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddCustom()}
              placeholder="Create custom tag..."
              className="flex-1 bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded px-2 py-1 text-xs text-[var(--text-primary)] placeholder-[var(--text-label)] outline-none focus:border-[var(--border-focus)]"
            />
            <button
              onClick={handleAddCustom}
              className="px-2 py-1 text-xs bg-[var(--border-default)] hover:bg-[var(--border-strong)] rounded transition-colors"
            >
              Add
            </button>
          </div>

          <Popover.Arrow className="fill-[var(--border-default)]" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
