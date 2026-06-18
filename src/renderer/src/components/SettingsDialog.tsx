import { useState, useEffect, useCallback } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { Settings, X, Loader2, CheckCircle, XCircle, ExternalLink, Download } from 'lucide-react'
import { useSettingsStore } from '../stores/useSettingsStore'
import type { AIProviderType } from '../types/settings'

interface SettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface TestResult {
  success: boolean
  message: string
  reason?: 'unreachable' | 'model-missing'
}

const PROVIDER_SUBTITLE: Record<AIProviderType, string> = {
  ollama: 'Local · free · requires install',
  gemini: 'No install · needs API key'
}

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const { settings, updateSettings } = useSettingsStore()
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<TestResult | null>(null)
  const [pulling, setPulling] = useState(false)
  const [pullStatus, setPullStatus] = useState('')
  const [pullPercent, setPullPercent] = useState(0)

  const handleTestConnection = useCallback(async () => {
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
  }, [])

  // Auto-test the connection when the dialog opens, and again whenever the
  // selected provider changes while open (so the reason-based CTAs stay current).
  useEffect(() => {
    if (open) handleTestConnection()
  }, [open, settings.aiProvider, handleTestConnection])

  const handleDownloadModel = async () => {
    setPulling(true)
    setPullStatus('Starting…')
    setPullPercent(0)
    const unsub = window.api.onOllamaPullProgress((p) => {
      setPullStatus(p.status)
      setPullPercent(p.percent)
    })
    try {
      await window.api.pullOllamaModel()
      await handleTestConnection() // flips to ready once the model is present
    } finally {
      unsub()
      setPulling(false)
    }
  }

  const handleCancelPull = () => {
    window.api.cancelOllamaPull()
    setPulling(false)
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
                    className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium border transition-colors text-left ${
                      settings.aiProvider === p
                        ? 'bg-blue-600 border-blue-500 text-white'
                        : 'bg-[#252525] border-[#333] text-[#999] hover:border-[#555]'
                    }`}
                  >
                    <div>{p === 'ollama' ? 'Ollama (Local)' : 'Google Gemini'}</div>
                    <div className={`text-[10px] font-normal mt-0.5 ${settings.aiProvider === p ? 'text-blue-100' : 'text-[#777]'}`}>
                      {PROVIDER_SUBTITLE[p]}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {settings.aiProvider === 'ollama' ? (
              <div className="space-y-3">
                <div className="text-xs text-[#888] bg-[#202020] border border-[#333] rounded-lg p-3 leading-relaxed">
                  <div className="text-[#aaa] font-medium mb-1">Local setup</div>
                  <ol className="list-decimal list-inside space-y-0.5">
                    <li>Install Ollama from <a href="https://ollama.com" target="_blank" rel="noreferrer" className="text-blue-400 hover:underline">ollama.com</a></li>
                    <li>Pull the model: <code className="text-[#ccc]">ollama pull {settings.ollama.model || 'gemma3'}</code></li>
                    <li>Make sure it's running at the URL below</li>
                  </ol>
                </div>
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

                {/* Server running but model not downloaded → one-click pull */}
                {testResult?.reason === 'model-missing' && !pulling && (
                  <button
                    onClick={handleDownloadModel}
                    className="flex items-center gap-2 px-3 py-2 w-full justify-center bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium transition-colors"
                  >
                    <Download size={14} />
                    Download model ({settings.ollama.model || 'gemma3'})
                  </button>
                )}

                {pulling && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs text-[#999]">
                      <span className="truncate">{pullStatus || 'Downloading…'}</span>
                      <span>{pullPercent}%</span>
                    </div>
                    <div className="h-1.5 bg-[#252525] rounded-full overflow-hidden">
                      <div className="h-full bg-blue-600 transition-all" style={{ width: `${pullPercent}%` }} />
                    </div>
                    <button
                      onClick={handleCancelPull}
                      className="text-xs text-[#999] hover:text-[#e5e5e5] transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                )}

                {/* Ollama not reachable → nudge toward the no-install option */}
                {testResult?.reason === 'unreachable' && (
                  <div className="text-xs text-[#888] bg-[#202020] border border-[#333] rounded-lg p-2.5">
                    Don’t want to install Ollama? Switch to Google Gemini above — it needs no install, just an API key.
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs text-[#999]">API Key</label>
                    <a
                      href="https://aistudio.google.com/apikey"
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1 text-xs text-blue-400 hover:underline"
                    >
                      Get an API key <ExternalLink size={11} />
                    </a>
                  </div>
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
