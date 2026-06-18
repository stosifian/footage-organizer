import { execFile, type ExecFileOptions } from 'child_process'

interface ExecResult {
  stdout: string | Buffer
  stderr: string | Buffer
}

// execFile with a hard timeout that KILLS the child (SIGKILL) rather than just
// abandoning the promise — so a hung/corrupt input can't tie up a process forever.
export function execFileWithTimeout(
  file: string,
  args: string[],
  options: ExecFileOptions,
  timeoutMs: number
): Promise<ExecResult> {
  return new Promise((resolve, reject) => {
    execFile(
      file,
      args,
      { ...options, timeout: timeoutMs, killSignal: 'SIGKILL' },
      (err, stdout, stderr) => {
        if (err) reject(err)
        else resolve({ stdout, stderr })
      }
    )
  })
}

// True when an execFile error was caused by the timeout kill above.
export function isTimeoutError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false
  const e = err as NodeJS.ErrnoException & { killed?: boolean }
  return e.killed === true && e.signal === 'SIGKILL'
}
