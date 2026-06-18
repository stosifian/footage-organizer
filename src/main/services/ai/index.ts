import type { AIProvider } from './provider'
import { OllamaProvider } from './ollama-provider'
import { GeminiProvider } from './gemini-provider'

interface AIConfig {
  provider: 'ollama' | 'gemini'
  ollama: { baseUrl: string; model: string }
  gemini: { apiKey: string; model: string }
}

let currentProvider: AIProvider | null = null
let currentConfig: string = ''

export function getProvider(config: AIConfig): AIProvider {
  const configKey = JSON.stringify(config)
  if (currentProvider && currentConfig === configKey) {
    return currentProvider
  }

  if (config.provider === 'ollama') {
    currentProvider = new OllamaProvider(config.ollama.baseUrl, config.ollama.model)
  } else {
    currentProvider = new GeminiProvider(config.gemini.apiKey, config.gemini.model)
  }

  currentConfig = configKey
  return currentProvider
}

export type { AIProvider }
