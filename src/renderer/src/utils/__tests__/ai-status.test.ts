import { describe, it, expect } from 'vitest'
import { isProviderConfigured, notConfiguredHint } from '../ai-status'
import { defaultSettings, type AppSettings } from '../../types/settings'

function withSettings(overrides: Partial<AppSettings>): AppSettings {
  return { ...defaultSettings, ...overrides }
}

describe('isProviderConfigured', () => {
  it('Ollama with default baseUrl + model is configured', () => {
    expect(isProviderConfigured(withSettings({ aiProvider: 'ollama' }))).toBe(true)
  })

  it('Ollama with empty baseUrl is not configured', () => {
    const s = withSettings({ aiProvider: 'ollama', ollama: { baseUrl: '', model: 'gemma3' } })
    expect(isProviderConfigured(s)).toBe(false)
  })

  it('Ollama with empty model is not configured', () => {
    const s = withSettings({ aiProvider: 'ollama', ollama: { baseUrl: 'http://x', model: '' } })
    expect(isProviderConfigured(s)).toBe(false)
  })

  it('Gemini with empty apiKey is not configured', () => {
    const s = withSettings({ aiProvider: 'gemini', gemini: { apiKey: '', model: 'gemini-2.5-flash' } })
    expect(isProviderConfigured(s)).toBe(false)
  })

  it('Gemini with whitespace-only apiKey is not configured', () => {
    const s = withSettings({ aiProvider: 'gemini', gemini: { apiKey: '   ', model: 'gemini-2.5-flash' } })
    expect(isProviderConfigured(s)).toBe(false)
  })

  it('Gemini with a real apiKey is configured', () => {
    const s = withSettings({ aiProvider: 'gemini', gemini: { apiKey: 'AIzaABC', model: 'gemini-2.5-flash' } })
    expect(isProviderConfigured(s)).toBe(true)
  })
})

describe('notConfiguredHint', () => {
  it('returns null when configured', () => {
    expect(notConfiguredHint(withSettings({ aiProvider: 'ollama' }))).toBeNull()
  })

  it('mentions the API key for an unconfigured Gemini', () => {
    const s = withSettings({ aiProvider: 'gemini', gemini: { apiKey: '', model: 'gemini-2.5-flash' } })
    expect(notConfiguredHint(s)).toMatch(/api key/i)
  })

  it('mentions Ollama for an unconfigured Ollama', () => {
    const s = withSettings({ aiProvider: 'ollama', ollama: { baseUrl: '', model: '' } })
    expect(notConfiguredHint(s)).toMatch(/ollama/i)
  })
})
