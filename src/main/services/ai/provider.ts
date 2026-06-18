export interface SceneAnalysis {
  description: string
  keywords: string[]
  visualTexture: string[]
  energy: string[]
  mood: string[]
  lightQuality: string[]
}

export type EnumTags = Omit<SceneAnalysis, 'description' | 'keywords'>

export interface ConnectionResult {
  success: boolean
  message: string
  // Why it failed (drives the onboarding CTA). Undefined on success.
  reason?: 'unreachable' | 'model-missing'
}

export interface AIProvider {
  analyzeScene(frames: Buffer[]): Promise<SceneAnalysis>
  classifyFromDescription(description: string): Promise<EnumTags>
  extractKeywords(description: string): Promise<string[]>
  testConnection(): Promise<ConnectionResult>
}

// These arrays are the single source of truth for valid enum values.
// They mirror preset-tags.ts in the renderer — keep them in sync if presets change.
export const VISUAL_TEXTURE_VALUES = ['Smooth', 'Grainy', 'Sharp', 'Filmic', 'Soft Focus', 'Hazy', 'Saturated', 'Desaturated', 'High Contrast', 'Low Contrast', 'Muted', 'Vibrant', 'Dreamy', 'Crisp', 'Raw']
export const ENERGY_VALUES = ['Static', 'Slow', 'Calm', 'Dynamic', 'Fast', 'Frenetic', 'Building', 'Declining', 'Pulsing', 'Steady', 'Explosive', 'Floating', 'Rhythmic', 'Chaotic', 'Meditative']
export const MOOD_VALUES = ['Peaceful', 'Melancholic', 'Tense', 'Joyful', 'Mysterious', 'Nostalgic', 'Dramatic', 'Serene', 'Anxious', 'Hopeful', 'Eerie', 'Romantic', 'Playful', 'Somber', 'Euphoric']
export const LIGHT_QUALITY_VALUES = ['Golden Hour', 'Blue Hour', 'Backlit', 'Overcast', 'Diffused', 'Neon', 'Harsh', 'Soft', 'Dappled', 'Silhouette', 'Rim Light', 'Flat', 'Chiaroscuro', 'Natural', 'Artificial']

const VT = VISUAL_TEXTURE_VALUES.join(' | ')
const EN = ENERGY_VALUES.join(' | ')
const MO = MOOD_VALUES.join(' | ')
const LQ = LIGHT_QUALITY_VALUES.join(' | ')

const ENUM_LINES = `VISUAL_TEXTURE: <pick 1-2 from: ${VT}>
ENERGY: <pick 1 from: ${EN}>
MOOD: <pick 1-2 from: ${MO}>
LIGHT_QUALITY: <pick 1 from: ${LQ}>`

export const COMBINED_PROMPT = `Analyze these video frames and respond using this EXACT format — no other text:

DESCRIPTION: <1-2 sentences describing the scene: subject, action, setting, and atmosphere>
KEYWORDS: <3 to 5 single-word tags about the subject and setting>
${ENUM_LINES}`

export const CLASSIFY_PROMPT = (description: string): string =>
  `Based on this video scene description, classify it into the categories below.
Respond using this EXACT format — no other text:

${ENUM_LINES}

Description: ${description}`

export const KEYWORDS_PROMPT =
  'Extract exactly 3 to 5 keyword tags from the following scene description. Keywords should be single descriptive words capturing the key subjects, setting, and mood. Return ONLY the keywords as a comma-separated list with no other text.\n\nDescription: '

// Match a labelled field at the start of a line, capture until end of that line.
// Anchored to line start so "energy" in prose doesn't accidentally match ENERGY:.
function parseEnumField(text: string, label: string, presets: string[]): string[] {
  const match = text.match(new RegExp(`(?:^|\\n)${label}:\\s*([^\\n]+)`, 'i'))
  if (!match) return []
  return match[1]
    .split(/[,|]/)
    .map((s) => s.trim())
    .map((v) => presets.find((p) => p.toLowerCase() === v.toLowerCase()) ?? null)
    .filter((v): v is string => v !== null)
}

export function parseCombinedResponse(text: string): SceneAnalysis {
  const descMatch = text.match(/description[:\s]+(.+?)(?=\nkeywords[:\s]|\nvisual_texture[:\s]|$)/is)
  const kwMatch = text.match(/(?:^|\n)keywords:\s*([^\n]+)/i)

  return {
    description: descMatch ? descMatch[1].trim().replace(/\s+/g, ' ') : text.trim(),
    keywords: kwMatch
      ? kwMatch[1].split(',').map((k) => k.trim().toLowerCase()).filter((k) => k.length > 0 && k.length < 30).slice(0, 5)
      : [],
    visualTexture: parseEnumField(text, 'visual_texture', VISUAL_TEXTURE_VALUES),
    energy: parseEnumField(text, 'energy', ENERGY_VALUES),
    mood: parseEnumField(text, 'mood', MOOD_VALUES),
    lightQuality: parseEnumField(text, 'light_quality', LIGHT_QUALITY_VALUES),
  }
}

export function parseEnumResponse(text: string): EnumTags {
  return {
    visualTexture: parseEnumField(text, 'visual_texture', VISUAL_TEXTURE_VALUES),
    energy: parseEnumField(text, 'energy', ENERGY_VALUES),
    mood: parseEnumField(text, 'mood', MOOD_VALUES),
    lightQuality: parseEnumField(text, 'light_quality', LIGHT_QUALITY_VALUES),
  }
}
