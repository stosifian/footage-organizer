import { useTheme, THEMES } from '../hooks/useTheme'

// Segmented control for switching themes (Violet / Azure / Signal).
// Uses the Tailwind v4 utilities defined in index.css.
export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme()
  return (
    <div className="flex items-center gap-1 rounded-full border border-[var(--border-default)] bg-surface p-1">
      {THEMES.map(({ value, label }) => {
        const on = theme === value
        return (
          <button
            key={label}
            onClick={() => setTheme(value)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              on ? 'bg-accent text-accent-on' : 'text-muted hover:text-ink'
            }`}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}
