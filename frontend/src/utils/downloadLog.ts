import type { LogEntry, Prompt } from '../types'

interface Params {
  userName: string
  script: string
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

function resolveAnswer(prompt: Prompt, answer: string): string {
  if (prompt.input_type === 'enter') return '(continue)'
  if (prompt.input_type === 'yn') return answer === 'y' ? 'Yes' : 'No'
  if (prompt.input_type === 'choice' && prompt.choices) {
    const idx = parseInt(answer, 10) - 1
    const label = prompt.choices[idx]
    return label !== undefined ? `${answer} (${label})` : answer
  }
  return answer
}

export function downloadLog({ userName, script, log }: Params): void {
  const startTime = log.find(e => e.type === 'start')?.timestamp ?? Date.now()
  const finishTime = log.findLast(e => e.type === 'finish')?.timestamp ?? Date.now()

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

  for (const entry of log) {
    const elapsed = formatElapsed(entry.timestamp - startTime)

    if (entry.type === 'start') {
      lines.push(`[${elapsed}]  START`)

    } else if (entry.type === 'step_show') {
      const s = String(entry.stepIndex + 1).padStart(2, ' ')
      const type = entry.prompt.input_type.padEnd(9, ' ')
      const text = truncate(entry.prompt.text)
      lines.push(`[${elapsed}]  Step ${s} appeared  |  ${type}  |  "${text}"`)

    } else if (entry.type === 'step_answer') {
      const s = String(entry.stepIndex + 1).padStart(2, ' ')
      const type = entry.prompt.input_type.padEnd(9, ' ')
      const text = truncate(entry.prompt.text)
      const answer = resolveAnswer(entry.prompt, entry.answer)
      lines.push(`[${elapsed}]  Step ${s} answered  |  ${type}  |  "${text}"  →  ${answer}`)

    } else if (entry.type === 'exception_select') {
      const label = truncate(entry.exceptionLabel)
      lines.push(`[${elapsed}]  Exception selected: ${entry.exceptionName}  |  exception  |  "${label}"`)

    } else if (entry.type === 'exception') {
      const noteStr = truncate(entry.note)
      lines.push(`[${elapsed}]  Exception raised: ${entry.exceptionName}  |  exception  |  "${noteStr}"  →  (${entry.decision})`)

    } else if (entry.type === 'finish') {
      lines.push(`[${elapsed}]  DONE`)
    }
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
