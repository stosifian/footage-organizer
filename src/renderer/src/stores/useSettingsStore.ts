import { create } from 'zustand'
import type { AppSettings, AIProviderType } from '../types/settings'
import { defaultSettings } from '../types/settings'

interface SettingsState {
  settings: AppSettings
  loaded: boolean
  loadSettings: () => Promise<void>
  updateSettings: (partial: Partial<AppSettings>) => Promise<void>
  setAIProvider: (provider: AIProviderType) => Promise<void>
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: defaultSettings,
  loaded: false,

  loadSettings: async () => {
    const saved = await window.api.loadSettings()
    if (saved) {
      set({ settings: { ...defaultSettings, ...saved } as AppSettings, loaded: true })
    } else {
      set({ loaded: true })
    }
  },

  updateSettings: async (partial) => {
    const newSettings = { ...get().settings, ...partial }
    set({ settings: newSettings })
    await window.api.saveSettings(newSettings)
  },

  setAIProvider: async (provider) => {
    await get().updateSettings({ aiProvider: provider })
  }
}))
