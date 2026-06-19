// Convert an Ollama pull progress chunk to an integer 0–100 percent.
export function pullProgressToPercent(p: { completed: number; total: number }): number {
  if (!p.total || p.total <= 0) return 0
  const pct = Math.round((p.completed / p.total) * 100)
  return Math.max(0, Math.min(100, pct))
}
