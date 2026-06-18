import { Ollama, type AbortableAsyncIterator, type ProgressResponse } from 'ollama'
import type { AIProvider, ConnectionResult } from './provider'
import { COMBINED_PROMPT, CLASSIFY_PROMPT, KEYWORDS_PROMPT, parseCombinedResponse, parseEnumResponse } from './provider'
import type { EnumTags } from './provider'
import { pullProgressToPercent } from './pull-progress'

export class OllamaProvider implements AIProvider {
  private client: Ollama
  private model: string
  private activePull: AbortableAsyncIterator<ProgressResponse> | null = null

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

  async testConnection(): Promise<ConnectionResult> {
    try {
      const models = await this.client.list()
      const available = models.models.map((m) => m.name)
      const hasModel = available.some((n) => n.startsWith(this.model))

      if (hasModel) {
        return { success: true, message: `Connected. Model "${this.model}" available.` }
      }
      return {
        success: false,
        reason: 'model-missing',
        message: `Connected, but model "${this.model}" isn't downloaded yet.`
      }
    } catch (err) {
      return {
        success: false,
        reason: 'unreachable',
        message: `Cannot connect to Ollama: ${err instanceof Error ? err.message : String(err)}`
      }
    }
  }

  // Download the configured model via the streaming pull API. Reports integer
  // percent progress; cancellable through cancelPull().
  async pullModel(onProgress: (p: { status: string; percent: number }) => void): Promise<void> {
    const iterator = await this.client.pull({ model: this.model, stream: true })
    this.activePull = iterator
    try {
      for await (const part of iterator) {
        onProgress({ status: part.status, percent: pullProgressToPercent(part) })
      }
    } finally {
      this.activePull = null
    }
  }

  cancelPull(): void {
    this.activePull?.abort()
    this.activePull = null
  }
}
