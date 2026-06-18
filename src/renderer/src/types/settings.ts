export type AIProviderType = 'ollama' | 'gemini'

export interface OllamaConfig {
  baseUrl: string
  model: string
}

export interface GeminiConfig {
  apiKey: string
  model: string
}

export interface AppSettings {
  aiProvider: AIProviderType
  ollama: OllamaConfig
  gemini: GeminiConfig
  lastOpenedDirectory: string | null
}

export const defaultSettings: AppSettings = {
  aiProvider: 'ollama',
  ollama: {
    baseUrl: 'http://127.0.0.1:11434',
    model: 'gemma3'
  },
  gemini: {
    apiKey: '',
    model: 'gemini-2.5-flash'
  },
  lastOpenedDirectory: null
}
