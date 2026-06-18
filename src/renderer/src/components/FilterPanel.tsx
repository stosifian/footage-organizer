import type { ClipData } from '../types/clip'
import type { ClipFilters } from '../utils/filter'
import { availableCodecs, availableTagValues } from '../utils/filter'
import { TAG_CATEGORIES, type TagCategory } from '../constants/preset-tags'

interface Props {
  clips: ClipData[]
  filters: ClipFilters
  onChange: (filters: ClipFilters) => void
  onClear: () => void
}

export function FilterPanel({ clips, filters, onChange, onClear }: Props) {
  const codecs = availableCodecs(clips)

  const toggleCodec = (codec: string) => {
    const next = filters.codecs.includes(codec)
      ? filters.codecs.filter((c) => c !== codec)
      : [...filters.codecs, codec]
    onChange({ ...filters, codecs: next })
  }

  const toggleTag = (category: TagCategory, value: string) => {
    const current = filters.tags[category] ?? []
    const next = current.includes(value)
      ? current.filter((t) => t !== value)
      : [...current, value]
    onChange({ ...filters, tags: { ...filters.tags, [category]: next } })
  }

  const parseNum = (v: string): number | null => {
    if (v.trim() === '') return null
    const n = Number(v)
    return Number.isNaN(n) ? null : n
  }

  return (
    <div className="absolute right-0 mt-1 z-50 w-[320px] max-h-[70vh] overflow-y-auto bg-[#1a1a1a] border border-[#333] rounded-lg shadow-xl p-3 text-xs text-[#e5e5e5]">
      {/* Quick toggles */}
      <div className="mb-3">
        <div className="text-[#888] font-medium mb-1.5">Quick</div>
        <div className="space-y-1">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              aria-label="Needs description"
              checked={filters.needsDescription}
              onChange={(e) => onChange({ ...filters, needsDescription: e.target.checked })}
            />
            Needs description
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              aria-label="Needs tags"
              checked={filters.needsTags}
              onChange={(e) => onChange({ ...filters, needsTags: e.target.checked })}
            />
            Needs tags
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              aria-label="Hide missing"
              checked={filters.hideMissing}
              onChange={(e) => onChange({ ...filters, hideMissing: e.target.checked })}
            />
            Hide missing
          </label>
        </div>
      </div>

      {/* Codec */}
      {codecs.length > 0 && (
        <div className="mb-3">
          <div className="text-[#888] font-medium mb-1.5">Codec</div>
          <div className="flex flex-wrap gap-x-3 gap-y-1">
            {codecs.map((codec) => (
              <label key={codec} className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  aria-label={codec}
                  checked={filters.codecs.includes(codec)}
                  onChange={() => toggleCodec(codec)}
                />
                {codec}
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Duration */}
      <div className="mb-3">
        <div className="text-[#888] font-medium mb-1.5">Duration (sec)</div>
        <div className="flex items-center gap-2">
          <input
            type="number"
            aria-label="Duration min"
            placeholder="min"
            value={filters.durationMin ?? ''}
            onChange={(e) => onChange({ ...filters, durationMin: parseNum(e.target.value) })}
            className="w-20 bg-[#252525] border border-[#333] rounded px-2 py-1 outline-none focus:border-[#555]"
          />
          <span className="text-[#666]">–</span>
          <input
            type="number"
            aria-label="Duration max"
            placeholder="max"
            value={filters.durationMax ?? ''}
            onChange={(e) => onChange({ ...filters, durationMax: parseNum(e.target.value) })}
            className="w-20 bg-[#252525] border border-[#333] rounded px-2 py-1 outline-none focus:border-[#555]"
          />
        </div>
      </div>

      {/* Date shot */}
      <div className="mb-3">
        <div className="text-[#888] font-medium mb-1.5">Date shot</div>
        <div className="flex items-center gap-2">
          <input
            type="date"
            aria-label="Date from"
            value={filters.dateFrom ?? ''}
            onChange={(e) => onChange({ ...filters, dateFrom: e.target.value || null })}
            className="bg-[#252525] border border-[#333] rounded px-2 py-1 outline-none focus:border-[#555]"
          />
          <span className="text-[#666]">–</span>
          <input
            type="date"
            aria-label="Date to"
            value={filters.dateTo ?? ''}
            onChange={(e) => onChange({ ...filters, dateTo: e.target.value || null })}
            className="bg-[#252525] border border-[#333] rounded px-2 py-1 outline-none focus:border-[#555]"
          />
        </div>
      </div>

      {/* Tag categories */}
      {TAG_CATEGORIES.map((cat) => {
        const values = availableTagValues(clips, cat.key)
        if (values.length === 0) return null
        const selected = filters.tags[cat.key] ?? []
        return (
          <div key={cat.key} className="mb-3">
            <div className="text-[#888] font-medium mb-1.5">{cat.label}</div>
            <div className="flex flex-wrap gap-1.5">
              {values.map((value) => {
                const isOn = selected.includes(value)
                return (
                  <button
                    key={value}
                    onClick={() => toggleTag(cat.key, value)}
                    className={`px-2 py-0.5 rounded-full border transition-colors ${
                      isOn
                        ? `${cat.bgColor} ${cat.borderColor} ${cat.color}`
                        : 'bg-[#252525] border-[#333] text-[#999] hover:border-[#555]'
                    }`}
                  >
                    {value}
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}

      {/* Footer */}
      <div className="flex justify-between items-center pt-2 border-t border-[#333]">
        <button
          onClick={onClear}
          className="px-2 py-1 text-[#999] hover:text-[#e5e5e5] transition-colors"
        >
          Clear all
        </button>
      </div>
    </div>
  )
}
