/* Drop-in replacement for src/renderer/src/constants/preset-tags.ts
 *
 * WHAT CHANGED: the three color fields no longer hold Tailwind class
 * strings (e.g. 'text-blue-400'). They now hold CSS-variable values from
 * the re-harmonized tag family in index.css. Apply them with inline
 * `style`, not `className` — see the chip-render snippet in README.md.
 *
 * A sixth category, `keyword` (emerald), is added for free-form scene
 * keywords. Drop it if your data model has no keyword field.
 */

export type TagCategory =
  | 'visualTexture'
  | 'energy'
  | 'mood'
  | 'lightQuality'
  | 'location'
  | 'keyword'

export interface TagCategoryConfig {
  key: TagCategory
  label: string
  color: string        // CSS value → use as style={{ color }}
  bgColor: string      // CSS value → use as style={{ background: bgColor }}
  borderColor: string  // CSS value → use as style={{ borderColor }}
  presets: string[]
}

export const TAG_CATEGORIES: TagCategoryConfig[] = [
  {
    key: 'visualTexture',
    label: 'Visual Texture',
    color: 'var(--tag-texture-text)',
    bgColor: 'var(--tag-texture-bg)',
    borderColor: 'var(--tag-texture-border)',
    presets: [
      'Smooth', 'Grainy', 'Sharp', 'Filmic', 'Soft Focus', 'Hazy',
      'Saturated', 'Desaturated', 'High Contrast', 'Low Contrast',
      'Muted', 'Vibrant', 'Dreamy', 'Crisp', 'Raw'
    ]
  },
  {
    key: 'energy',
    label: 'Energy',
    color: 'var(--tag-energy-text)',
    bgColor: 'var(--tag-energy-bg)',
    borderColor: 'var(--tag-energy-border)',
    presets: [
      'Static', 'Slow', 'Calm', 'Dynamic', 'Fast', 'Frenetic',
      'Building', 'Declining', 'Pulsing', 'Steady', 'Explosive',
      'Floating', 'Rhythmic', 'Chaotic', 'Meditative'
    ]
  },
  {
    key: 'mood',
    label: 'Mood',
    color: 'var(--tag-mood-text)',
    bgColor: 'var(--tag-mood-bg)',
    borderColor: 'var(--tag-mood-border)',
    presets: [
      'Peaceful', 'Melancholic', 'Tense', 'Joyful', 'Mysterious',
      'Nostalgic', 'Dramatic', 'Serene', 'Anxious', 'Hopeful',
      'Eerie', 'Romantic', 'Playful', 'Somber', 'Euphoric'
    ]
  },
  {
    key: 'lightQuality',
    label: 'Light Quality',
    color: 'var(--tag-light-text)',
    bgColor: 'var(--tag-light-bg)',
    borderColor: 'var(--tag-light-border)',
    presets: [
      'Golden Hour', 'Blue Hour', 'Backlit', 'Overcast', 'Diffused',
      'Neon', 'Harsh', 'Soft', 'Dappled', 'Silhouette',
      'Rim Light', 'Flat', 'Chiaroscuro', 'Natural', 'Artificial'
    ]
  },
  {
    key: 'location',
    label: 'Location',
    color: 'var(--tag-location-text)',
    bgColor: 'var(--tag-location-bg)',
    borderColor: 'var(--tag-location-border)',
    presets: [
      'London', 'Sydney', 'Montreal', 'Copenhagen'
    ]
  },
  {
    key: 'keyword',
    label: 'Scene Keywords',
    color: 'var(--tag-keyword-text)',
    bgColor: 'var(--tag-keyword-bg)',
    borderColor: 'var(--tag-keyword-border)',
    presets: []
  }
]

export function getCategoryConfig(key: TagCategory): TagCategoryConfig {
  return TAG_CATEGORIES.find((c) => c.key === key)!
}
