import type { LogEntry } from '../types'

interface Params {
  userName: string
  script: string
  version: string
  tags: string[]
  answers: string[]
  seed: number
  cameraOn: boolean
  log: LogEntry[]
}

export function safeName(s: string): string {
  return s.replace(/[^a-z0-9]/gi, '_').toLowerCase()
}

export function downloadLog({ userName, script, version, tags, answers, seed, cameraOn, log }: Params): void {
  const startTime = log.find(e => e.type === 'start')?.timestamp ?? Date.now()
  const blob = new Blob(
    [JSON.stringify({ screen: 'done', script, version, commit: __GIT_COMMIT__, tags, userName, seed, cameraOn, answers, log }, null, 2)],
    { type: 'application/json' },
  )
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  const dateStr = new Date(startTime).toISOString().slice(0, 10)
  a.href = url
  a.download = `log_${safeName(script)}_${safeName(userName)}_${dateStr}.json`
  a.click()
  URL.revokeObjectURL(url)
}
