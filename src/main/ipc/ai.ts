import type { BrowserWindow } from 'electron'
import { extractFrames } from '../services/ffmpeg-wrapper'
import { getProvider } from '../services/ai'
import { OllamaProvider } from '../services/ai/ollama-provider'
import { loadSettings } from './persistence'

// Ollama runs on a single GPU/CPU thread — no benefit to >1 concurrent AI call.
// Gemini is a cloud API that handles concurrency well.
const CONCURRENCY: Record<string, number> = { gemini: 3, ollama: 1 }
// Text-only classification has no image payload so higher concurrency is safe.
const CLASSIFY_CONCURRENCY: Record<string, number> = { gemini: 10, ollama: 2 }

// Per-operation timeouts in ms. Generous for local models that can be slow.
const FRAME_TIMEOUT_MS = 30_000
const AI_TIMEOUT_MS: Record<string, number> = { gemini: 60_000, ollama: 180_000 }

let batchCancelled = false

export function cancelGeneration(): void {
  batchCancelled = true
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`Timed out after ${ms / 1000}s: ${label}`)), ms)
    )
  ])
}

function getAIConfig() {
  const settings = loadSettings() as Record<string, unknown> | null
  return {
    provider: (settings?.aiProvider as 'ollama' | 'gemini') || 'ollama',
    ollama: (settings?.ollama as { baseUrl: string; model: string }) || {
      baseUrl: 'http://127.0.0.1:11434',
      model: 'gemma3'
    },
    gemini: (settings?.gemini as { apiKey: string; model: string }) || {
      apiKey: '',
      model: 'gemini-2.5-flash'
    }
  }
}

export async function handleGenerateDescription(
  filePath: string,
  duration: number
): Promise<{ description: string; keywords: string[] }> {
  const config = getAIConfig()
  const provider = getProvider(config)
  const frames = await extractFrames(filePath, duration)
  return provider.analyzeScene(frames)
}

export async function handleGenerateDescriptionsBatch(
  clips: { filePath: string; duration: number; id: string }[],
  window: BrowserWindow
): Promise<void> {
  batchCancelled = false

  const config = getAIConfig()
  const provider = getProvider(config)
  const concurrency = CONCURRENCY[config.provider] ?? 1
  const aiTimeout = AI_TIMEOUT_MS[config.provider] ?? 180_000
  const total = clips.length

  let clipIndex = 0
  let started = 0

  async function processClip(clip: { filePath: string; duration: number; id: string }): Promise<void> {
    try {
      const frames = await withTimeout(
        extractFrames(clip.filePath, clip.duration),
        FRAME_TIMEOUT_MS,
        'frame extraction'
      )
      if (batchCancelled) return

      const { description, keywords, visualTexture, energy, mood, lightQuality } = await withTimeout(
        provider.analyzeScene(frames),
        aiTimeout,
        'analyze scene'
      )

      window.webContents.send('ai-result', { id: clip.id, description, keywords, visualTexture, energy, mood, lightQuality })
    } catch (err) {
      window.webContents.send('ai-error', {
        id: clip.id,
        error: err instanceof Error ? err.message : String(err)
      })
    }
  }

  async function worker(): Promise<void> {
    while (true) {
      if (batchCancelled) break
      const i = clipIndex++
      if (i >= clips.length) break
      const clip = clips[i]

      window.webContents.send('ai-progress', {
        current: ++started,
        total,
        fileName: clip.filePath.split('/').pop() || clip.filePath
      })

      await processClip(clip)
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()))
}

export async function handleClassifyBatch(
  clips: { id: string; description: string }[],
  window: BrowserWindow
): Promise<void> {
  batchCancelled = false

  const config = getAIConfig()
  const provider = getProvider(config)
  const concurrency = CLASSIFY_CONCURRENCY[config.provider] ?? 2
  const aiTimeout = AI_TIMEOUT_MS[config.provider] ?? 180_000
  const total = clips.length

  let clipIndex = 0
  let started = 0

  async function worker(): Promise<void> {
    while (true) {
      if (batchCancelled) break
      const i = clipIndex++
      if (i >= clips.length) break
      const clip = clips[i]

      window.webContents.send('ai-progress', {
        current: ++started,
        total,
        fileName: clip.description.slice(0, 40) + '…'
      })

      try {
        const tags = await withTimeout(
          provider.classifyFromDescription(clip.description),
          aiTimeout,
          'classify'
        )
        if (!batchCancelled) {
          window.webContents.send('ai-tag-result', { id: clip.id, ...tags })
        }
      } catch (err) {
        window.webContents.send('ai-error', {
          id: clip.id,
          error: err instanceof Error ? err.message : String(err)
        })
      }
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()))
}

export async function handleExtractKeywords(description: string): Promise<string[]> {
  const config = getAIConfig()
  const provider = getProvider(config)
  return provider.extractKeywords(description)
}

export async function handleTestConnection(): Promise<{ success: boolean; message: string; reason?: string }> {
  const config = getAIConfig()
  const provider = getProvider(config)
  return provider.testConnection()
}

export async function handlePullModel(
  window: BrowserWindow
): Promise<{ success: boolean; message?: string }> {
  const config = getAIConfig()
  if (config.provider !== 'ollama') {
    return { success: false, message: 'Model download is only available for Ollama.' }
  }
  const provider = getProvider(config)
  if (!(provider instanceof OllamaProvider)) {
    return { success: false, message: 'Ollama provider unavailable.' }
  }
  try {
    await provider.pullModel((p) => window.webContents.send('ollama-pull-progress', p))
    return { success: true }
  } catch (err) {
    // Includes user-initiated abort — the renderer treats cancel as its own path.
    return { success: false, message: err instanceof Error ? err.message : String(err) }
  }
}

export function cancelOllamaPull(): void {
  const config = getAIConfig()
  if (config.provider !== 'ollama') return
  const provider = getProvider(config)
  if (provider instanceof OllamaProvider) provider.cancelPull()
}
