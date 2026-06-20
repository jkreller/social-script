import { useEffect, useMemo } from 'react'
import type { LogEntry } from '../types'
import { downloadLog, safeName } from '../utils/downloadLog'
import btn from '../styles/buttons.module.css'
import styles from './DoneScreen.module.css'

interface Props {
  userName: string
  script: string
  version: string
  tags: string[]
  log: LogEntry[]
  clips: Blob[]
  onRestart: () => void
}

export default function DoneScreen({ userName, script, version, tags, log, clips, onRestart }: Props) {
  const dateStr = new Date(log.find(e => e.type === 'start')?.timestamp ?? Date.now()).toISOString().slice(0, 10)

  // One object URL per clip; revoke them when the screen goes away. A run yields more than
  // one clip only when it was interrupted (one per segment between interruptions).
  const urls = useMemo(() => clips.map(c => URL.createObjectURL(c)), [clips])
  useEffect(() => () => urls.forEach(u => URL.revokeObjectURL(u)), [urls])

  const downloadVideo = (blob: Blob, url: string, index: number) => {
    const ext = blob.type.includes('mp4') ? 'mp4' : 'webm'
    const suffix = clips.length > 1 ? `_${index + 1}` : ''
    const a = document.createElement('a')
    a.href = url
    a.download = `video_${safeName(script)}_${safeName(userName)}_${dateStr}${suffix}.${ext}`
    a.click()
  }

  return (
    <div className={styles.root}>
      <span className={styles.label}>complete</span>
      <span className={styles.message}>Script finished.</span>
      <button
        className={btn.btnPrimary}
        onClick={() => downloadLog({ userName, script, version, tags, log })}
      >
        Download Log
      </button>
      {urls.map((url, i) => (
        <button key={url} className={btn.btnSecondary} onClick={() => downloadVideo(clips[i], url, i)}>
          {clips.length > 1 ? `Download Video ${i + 1}` : 'Download Video'}
        </button>
      ))}
      <button className={btn.btnSecondary} onClick={onRestart}>
        Return Home
      </button>
    </div>
  )
}
