import type { AppSettings } from '../types/settings'

export type AIStatus = 'checking' | 'ready' | 'not-ready'

// Synchronous check: is the selected provider's config complete enough to attempt
// a connection? (No network — used to short-circuit the common empty-key case.)
export function isProviderConfigured(settings: AppSettings): boolean {
  if (settings.aiProvider === 'gemini') {
    return settings.gemini.apiKey.trim().length > 0
  }
  return settings.ollama.baseUrl.trim().length > 0 && settings.ollama.model.trim().length > 0
}

// A short, actionable hint when the provider isn't configured; null when it is.
export function notConfiguredHint(settings: AppSettings): string | null {
  if (isProviderConfigured(settings)) return null
  if (settings.aiProvider === 'gemini') {
    return 'Add your Gemini API key in Settings to generate descriptions and tags.'
  }
  return 'Set an Ollama server URL and model in Settings to generate descriptions and tags.'
}
