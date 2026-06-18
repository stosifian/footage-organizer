import { GoogleGenAI } from '@google/genai'
import type { AIProvider } from './provider'
import { COMBINED_PROMPT, CLASSIFY_PROMPT, KEYWORDS_PROMPT, parseCombinedResponse, parseEnumResponse } from './provider'
import type { EnumTags } from './provider'

export class GeminiProvider implements AIProvider {
  private client: GoogleGenAI
  private model: string

  constructor(apiKey: string, model: string) {
    this.client = new GoogleGenAI({ apiKey })
    this.model = model
  }

  async analyzeScene(frames: Buffer[]): Promise<{ description: string; keywords: string[] }> {
    const imageParts = frames.map((f) => ({
      inlineData: {
        mimeType: 'image/jpeg' as const,
        data: f.toString('base64')
      }
    }))

    const response = await this.client.models.generateContent({
      model: this.model,
      contents: [
        {
          role: 'user',
          parts: [{ text: COMBINED_PROMPT }, ...imageParts]
        }
      ]
    })

    return parseCombinedResponse(response.text?.trim() || '')
  }

  async classifyFromDescription(description: string): Promise<EnumTags> {
    const response = await this.client.models.generateContent({
      model: this.model,
      contents: CLASSIFY_PROMPT(description)
    })
    return parseEnumResponse(response.text?.trim() || '')
  }

  async extractKeywords(description: string): Promise<string[]> {
    const response = await this.client.models.generateContent({
      model: this.model,
      contents: KEYWORDS_PROMPT + description
    })

    return (response.text || '')
      .trim()
      .split(',')
      .map((k) => k.trim().toLowerCase())
      .filter((k) => k.length > 0 && k.length < 30)
      .slice(0, 5)
  }

  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      const response = await this.client.models.generateContent({
        model: this.model,
        contents: 'Reply with "OK" if you can read this.'
      })
      const text = response.text || ''
      return { success: true, message: `Connected to Gemini. Response: ${text.slice(0, 50)}` }
    } catch (err) {
      return {
        success: false,
        message: `Cannot connect to Gemini: ${err instanceof Error ? err.message : String(err)}`
      }
    }
  }
}
