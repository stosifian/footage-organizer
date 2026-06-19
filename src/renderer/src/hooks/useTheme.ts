/* Theme switcher for the refreshed FootageOrganizer system.
 *
 * Three themes ship in index.css:
 *   • '' (default) → Graphite·Violet
 *   • 'azure'      → cooler, softer corners
 *   • 'signal'     → inky, lime accent, sharp corners
 *
 * Switching = set data-theme on <html>. This hook persists the choice
 * and applies it on load.
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
