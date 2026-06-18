export type TagCategory = 'visualTexture' | 'energy' | 'mood' | 'lightQuality' | 'location'

export interface TagCategoryConfig {
  key: TagCategory
  label: string
  color: string
  bgColor: string
  borderColor: string
  presets: string[]
}

export const TAG_CATEGORIES: TagCategoryConfig[] = [
  {
    key: 'visualTexture',
    label: 'Visual Texture',
    color: 'text-blue-400',
    bgColor: 'bg-blue-950',
    borderColor: 'border-blue-800',
    presets: [
      'Smooth', 'Grainy', 'Sharp', 'Filmic', 'Soft Focus', 'Hazy',
      'Saturated', 'Desaturated', 'High Contrast', 'Low Contrast',
      'Muted', 'Vibrant', 'Dreamy', 'Crisp', 'Raw'
    ]
  },
  {
    key: 'energy',
    label: 'Energy',
    color: 'text-orange-400',
    bgColor: 'bg-orange-950',
    borderColor: 'border-orange-800',
    presets: [
      'Static', 'Slow', 'Calm', 'Dynamic', 'Fast', 'Frenetic',
      'Building', 'Declining', 'Pulsing', 'Steady', 'Explosive',
      'Floating', 'Rhythmic', 'Chaotic', 'Meditative'
    ]
  },
  {
    key: 'mood',
    label: 'Mood',
    color: 'text-purple-400',
    bgColor: 'bg-purple-950',
    borderColor: 'border-purple-800',
    presets: [
      'Peaceful', 'Melancholic', 'Tense', 'Joyful', 'Mysterious',
      'Nostalgic', 'Dramatic', 'Serene', 'Anxious', 'Hopeful',
      'Eerie', 'Romantic', 'Playful', 'Somber', 'Euphoric'
    ]
  },
  {
    key: 'lightQuality',
    label: 'Light Quality',
    color: 'text-amber-400',
    bgColor: 'bg-amber-950',
    borderColor: 'border-amber-800',
    presets: [
      'Golden Hour', 'Blue Hour', 'Backlit', 'Overcast', 'Diffused',
      'Neon', 'Harsh', 'Soft', 'Dappled', 'Silhouette',
      'Rim Light', 'Flat', 'Chiaroscuro', 'Natural', 'Artificial'
    ]
  },
  {
    key: 'location',
    label: 'Location',
    color: 'text-teal-400',
    bgColor: 'bg-teal-950',
    borderColor: 'border-teal-800',
    presets: [
      'London', 'Sydney', 'Montreal', 'Copenhagen'
    ]
  }
]

export function getCategoryConfig(key: TagCategory): TagCategoryConfig {
  return TAG_CATEGORIES.find((c) => c.key === key)!
}
