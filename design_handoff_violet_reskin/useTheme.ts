/* Theme switcher for the refreshed FootageOrganizer system.
 *
 * Three themes ship in index.css:
 *   • '' (default) → Graphite·Violet
 *   • 'azure'      → cooler, softer corners
 *   • 'signal'     → inky, lime accent, sharp corners
 *
 * Switching = set data-theme on <html>. This hook persists the choice
 * and applies it on load. Suggested home for the UI control: the header
 * toolbar (next to the settings gear) or the Settings dialog.
 *
 * File suggestion: src/renderer/src/hooks/useTheme.ts
 */
import { useState, useEffect, useCallback } from 'react'

export type Theme = '' | 'azure' | 'signal'
const STORAGE_KEY = 'fo-theme'

export const THEMES: { value: Theme; label: string }[] = [
  { value: '', label: 'Violet' },
  { value: 'azure', label: 'Azure' },
  { value: 'signal', label: 'Signal' }
]

export function applyTheme(theme: Theme): void {
  const root = document.documentElement
  if (theme) root.setAttribute('data-theme', theme)
  else root.removeAttribute('data-theme')
}

export function useTheme(): { theme: Theme; setTheme: (t: Theme) => void } {
  const [theme, setThemeState] = useState<Theme>(
    () => (localStorage.getItem(STORAGE_KEY) as Theme) || ''
  )

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  const setTheme = useCallback((t: Theme) => {
    localStorage.setItem(STORAGE_KEY, t)
    setThemeState(t)
  }, [])

  return { theme, setTheme }
}

/* ---- Example segmented control (Tailwind v4 utilities from index.css) ----

import { useTheme, THEMES } from '../hooks/useTheme'

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
*/
