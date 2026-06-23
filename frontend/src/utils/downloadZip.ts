import { zipSync, strToU8 } from 'fflate'
import type { Zippable } from 'fflate'
import type { LogEntry } from '../types'
import { safeName } from './downloadLog'

interface Params {
  userName: string
  script: string
  version: string
  tags: string[]
  answers: string[]
  seed: number
  cameraOn: boolean
  log: LogEntry[]
  clips: Blob[]
}

export async function downloadZip({ userName, script, version, tags, answers, seed, cameraOn, log, clips }: Params): Promise<void> {
  const startTime = log.find(e => e.type === 'start')?.timestamp ?? Date.now()
  const d = new Date(startTime)
  const dateTimeStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}_${String(d.getHours()).padStart(2, '0')}-${String(d.getMinutes()).padStart(2, '0')}`
  const base = `${dateTimeStr}_${safeName(script)}_${safeName(userName)}`
  const clipExt = (blob: Blob) => blob.type.includes('mp4') ? 'mp4' : 'webm'

  const clipArrays = await Promise.all(clips.map(b => b.arrayBuffer().then(a => new Uint8Array(a))))

  // Videos are already H.264-compressed — store them as-is (level 0 = STORE, no deflate overhead).
  const files: Zippable = {
    'log.json': [strToU8(JSON.stringify({ screen: 'done', script, version, commit: __GIT_COMMIT__, tags, userName, seed, cameraOn, answers, log }, null, 2)), { level: 6 }],
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
