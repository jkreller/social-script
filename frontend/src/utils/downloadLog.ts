import type { LogEntry } from '../types'

interface Params {
  userName: string
  script: string
  startTime: number
  finishTime: number
  log: LogEntry[]
}

function formatElapsed(ms: number): string {
  const total = Math.floor(ms / 1000)
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  return `+${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function truncate(s: string): string {
  return s.length > 50 ? s.slice(0, 47) + '…' : s
}

function resolveAnswer(entry: LogEntry): string {
  const { prompt, answer } = entry
  if (prompt.input_type === 'enter') return '(continue)'
  if (prompt.input_type === 'yn') return answer === 'y' ? 'Yes' : 'No'
  if (prompt.input_type === 'choice' && prompt.choices) {
    const idx = parseInt(answer, 10) - 1
    const label = prompt.choices[idx]
    return label !== undefined ? `${answer} (${label})` : answer
  }
  return answer
}

export function downloadLog({ userName, script, startTime, finishTime, log }: Params): void {
  const lines: string[] = [
    'Social Script Session Log',
    '=========================',
    `User:     ${userName}`,
    `Script:   ${script}`,
    `Started:  ${new Date(startTime).toISOString()}`,
    `Finished: ${new Date(finishTime).toISOString()}`,
    '',
    '--- Log ---',
    '',
  ]

  let lineNum = 1
  let prevTimestamp = startTime

  for (const entry of log) {
    const elapsed = formatElapsed(entry.timestamp - startTime)

    if (entry.decision === 'continue') {
      const s1 = String(lineNum).padStart(2, ' ')
      const s2 = String(lineNum + 1).padStart(2, ' ')
      const type = entry.prompt.input_type.padEnd(9, ' ')
      const text = truncate(entry.prompt.text)
      const normal = entry.prompt.input_type === 'enter' ? '(continue)' : '(interrupted)'
      const exc = truncate(entry.answer)
      const elapsed1 = formatElapsed(prevTimestamp - startTime)
      lines.push(`[${elapsed1}]  Step ${s1}  |  ${type}  |  "${text}"  →  ${normal}`)
      lines.push(`[${elapsed}]  Step ${s2}  |  exception  |  "${exc}"  →  (continue)`)
      lineNum += 2

    } else if (entry.decision === 'stop') {
      const s = String(lineNum).padStart(2, ' ')
      const exc = truncate(entry.answer)
      lines.push(`[${elapsed}]  Step ${s}  |  exception  |  "${exc}"  →  (stop)`)
      lineNum += 1

    } else {
      const s = String(lineNum).padStart(2, ' ')
      const type = entry.prompt.input_type.padEnd(9, ' ')
      const text = truncate(entry.prompt.text)
      const answer = resolveAnswer(entry)
      lines.push(`[${elapsed}]  Step ${s}  |  ${type}  |  "${text}"  →  ${answer}`)
      lineNum += 1
    }

    prevTimestamp = entry.timestamp
  }

  const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  const safeUser = userName.replace(/[^a-z0-9]/gi, '_').toLowerCase()
  const safeScript = script.replace(/[^a-z0-9]/gi, '_').toLowerCase()
  const dateStr = new Date(startTime).toISOString().slice(0, 10)
  a.href = url
  a.download = `log_${safeScript}_${safeUser}_${dateStr}.txt`
  a.click()
  URL.revokeObjectURL(url)
}
