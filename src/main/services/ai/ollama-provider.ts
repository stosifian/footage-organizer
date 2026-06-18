import { Ollama } from 'ollama'
import type { AIProvider } from './provider'
import { COMBINED_PROMPT, CLASSIFY_PROMPT, KEYWORDS_PROMPT, parseCombinedResponse, parseEnumResponse } from './provider'
import type { EnumTags } from './provider'

export class OllamaProvider implements AIProvider {
  private client: Ollama
  private model: string

  constructor(baseUrl: string, model: string) {
    this.client = new Ollama({ host: baseUrl })
    this.model = model
  }

  async analyzeScene(frames: Buffer[]): Promise<{ description: string; keywords: string[] }> {
    const images = frames.map((f) => f.toString('base64'))

    const response = await this.client.chat({
      model: this.model,
      messages: [
        {
          role: 'user',
          content: COMBINED_PROMPT,
          images
        }
      ]
    })

    return parseCombinedResponse(response.message.content.trim())
  }

  async classifyFromDescription(description: string): Promise<EnumTags> {
    const response = await this.client.chat({
      model: this.model,
      messages: [{ role: 'user', content: CLASSIFY_PROMPT(description) }]
    })
    return parseEnumResponse(response.message.content.trim())
  }

  async extractKeywords(description: string): Promise<string[]> {
    const response = await this.client.chat({
      model: this.model,
      messages: [
        {
          role: 'user',
          content: KEYWORDS_PROMPT + description
        }
      ]
    })

    return response.message.content
      .trim()
      .split(',')
      .map((k) => k.trim().toLowerCase())
      .filter((k) => k.length > 0 && k.length < 30)
      .slice(0, 5)
  }

  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      const models = await this.client.list()
      const available = models.models.map((m) => m.name)
      const hasModel = available.some((n) => n.startsWith(this.model))

      if (hasModel) {
        return { success: true, message: `Connected. Model "${this.model}" available.` }
      }
      return {
        success: false,
        message: `Connected but model "${this.model}" not found. Available: ${available.join(', ')}`
      }
    } catch (err) {
      return {
        success: false,
        message: `Cannot connect to Ollama: ${err instanceof Error ? err.message : String(err)}`
      }
    }
  }
}
