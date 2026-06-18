import { useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { Settings, X, Loader2, CheckCircle, XCircle } from 'lucide-react'
import { useSettingsStore } from '../stores/useSettingsStore'
import type { AIProviderType } from '../types/settings'

interface SettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const { settings, updateSettings } = useSettingsStore()
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)

  const handleTestConnection = async () => {
    setTesting(true)
    setTestResult(null)
    try {
      const result = await window.api.testAIConnection()
      setTestResult(result)
    } catch (err) {
      setTestResult({ success: false, message: String(err) })
    } finally {
      setTesting(false)
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Trigger asChild>
        <button className="p-2 rounded-lg hover:bg-[#252525] transition-colors" title="Settings">
          <Settings size={18} className="text-[#999]" />
        </button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 z-40" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[480px] bg-[#1a1a1a] border border-[#333] rounded-xl shadow-2xl p-6 z-50">
          <div className="flex items-center justify-between mb-6">
            <Dialog.Title className="text-lg font-semibold">Settings</Dialog.Title>
            <Dialog.Close asChild>
              <button className="p-1 hover:bg-[#252525] rounded">
                <X size={18} className="text-[#999]" />
              </button>
            </Dialog.Close>
          </div>

          <div className="space-y-5">
            <div>
              <label className="text-sm font-medium text-[#999] block mb-2">AI Provider</label>
              <div className="flex gap-2">
                {(['ollama', 'gemini'] as AIProviderType[]).map((p) => (
                  <button
                    key={p}
                    onClick={() => updateSettings({ aiProvider: p })}
                    className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                      settings.aiProvider === p
                        ? 'bg-blue-600 border-blue-500 text-white'
                        : 'bg-[#252525] border-[#333] text-[#999] hover:border-[#555]'
                    }`}
                  >
                    {p === 'ollama' ? 'Ollama (Local)' : 'Google Gemini'}
                  </button>
                ))}
              </div>
            </div>

            {settings.aiProvider === 'ollama' ? (
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-[#999] block mb-1">Base URL</label>
                  <input
                    type="text"
                    value={settings.ollama.baseUrl}
                    onChange={(e) =>
                      updateSettings({ ollama: { ...settings.ollama, baseUrl: e.target.value } })
                    }
                    className="w-full bg-[#252525] border border-[#333] rounded-lg px-3 py-2 text-sm text-[#e5e5e5] outline-none focus:border-[#555]"
                  />
                </div>
                <div>
                  <label className="text-xs text-[#999] block mb-1">Model</label>
                  <input
                    type="text"
                    value={settings.ollama.model}
                    onChange={(e) =>
                      updateSettings({ ollama: { ...settings.ollama, model: e.target.value } })
                    }
                    className="w-full bg-[#252525] border border-[#333] rounded-lg px-3 py-2 text-sm text-[#e5e5e5] outline-none focus:border-[#555]"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-[#999] block mb-1">API Key</label>
                  <input
                    type="password"
                    value={settings.gemini.apiKey}
                    onChange={(e) =>
                      updateSettings({ gemini: { ...settings.gemini, apiKey: e.target.value } })
                    }
                    placeholder="Enter your Gemini API key"
                    className="w-full bg-[#252525] border border-[#333] rounded-lg px-3 py-2 text-sm text-[#e5e5e5] placeholder-[#666] outline-none focus:border-[#555]"
                  />
                </div>
                <div>
                  <label className="text-xs text-[#999] block mb-1">Model</label>
                  <input
                    type="text"
                    value={settings.gemini.model}
                    onChange={(e) =>
                      updateSettings({ gemini: { ...settings.gemini, model: e.target.value } })
                    }
                    className="w-full bg-[#252525] border border-[#333] rounded-lg px-3 py-2 text-sm text-[#e5e5e5] outline-none focus:border-[#555]"
                  />
                </div>
              </div>
            )}

            <div className="flex items-center gap-3">
              <button
                onClick={handleTestConnection}
                disabled={testing}
                className="flex items-center gap-2 px-4 py-2 bg-[#252525] hover:bg-[#333] border border-[#333] rounded-lg text-sm transition-colors disabled:opacity-50"
              >
                {testing ? <Loader2 size={14} className="animate-spin" /> : null}
                Test Connection
              </button>

              {testResult && (
                <div className={`flex items-center gap-1 text-xs ${testResult.success ? 'text-green-400' : 'text-red-400'}`}>
                  {testResult.success ? <CheckCircle size={14} /> : <XCircle size={14} />}
                  <span className="max-w-[250px] truncate">{testResult.message}</span>
                </div>
              )}
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
