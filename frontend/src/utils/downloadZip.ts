import { zipSync, strToU8 } from 'fflate'
import type { Zippable } from 'fflate'
import type { LogEntry } from '../types'
import { formatLog, safeName } from './downloadLog'

interface Params {
  userName: string
  script: string
  version: string
  tags: string[]
  log: LogEntry[]
  clips: Blob[]
}

export async function downloadZip({ userName, script, version, tags, log, clips }: Params): Promise<void> {
  const startTime = log.find(e => e.type === 'start')?.timestamp ?? Date.now()
  const dateStr = new Date(startTime).toISOString().slice(0, 10)
  const base = `${safeName(script)}_${safeName(userName)}_${dateStr}`
  const clipExt = (blob: Blob) => blob.type.includes('mp4') ? 'mp4' : 'webm'

  const clipArrays = await Promise.all(clips.map(b => b.arrayBuffer().then(a => new Uint8Array(a))))

  // Videos are already H.264-compressed — store them as-is (level 0 = STORE, no deflate overhead).
  const files: Zippable = {
    'log.txt': [strToU8(formatLog({ userName, script, version, tags, log })), { level: 6 }],
  }
  clipArrays.forEach((arr, i) => {
    files[`video_${i + 1}.${clipExt(clips[i])}`] = [arr, { level: 0 }]
  })

  const zipped = zipSync(files)
  const blob = new Blob([zipped], { type: 'application/zip' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${base}.zip`
  a.click()
  URL.revokeObjectURL(url)
}
