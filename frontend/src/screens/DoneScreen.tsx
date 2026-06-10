import type { LogEntry } from '../types'
import type { Recording } from '../hooks/useRecorder'
import { downloadLog, safeName } from '../utils/downloadLog'
import btn from '../styles/buttons.module.css'
import styles from './DoneScreen.module.css'

interface Props {
  userName: string
  script: string
  log: LogEntry[]
  recording: Recording | null
  onRestart: () => void
}

export default function DoneScreen({ userName, script, log, recording, onRestart }: Props) {
  const dateStr = new Date(log.find(e => e.type === 'start')?.timestamp ?? Date.now()).toISOString().slice(0, 10)

  const downloadVideo = (r: Recording) => {
    const ext = r.blob.type.includes('mp4') ? 'mp4' : 'webm'
    const a = document.createElement('a')
    a.href = r.url
    a.download = `video_${safeName(script)}_${safeName(userName)}_${dateStr}.${ext}`
    a.click()
  }

  return (
    <div className={styles.root}>
      <span className={styles.label}>complete</span>
      <span className={styles.message}>Script finished.</span>
      <button
        className={btn.btnPrimary}
        onClick={() => downloadLog({ userName, script, log })}
      >
        Download Log
      </button>
      {recording && (
        <button className={btn.btnSecondary} onClick={() => downloadVideo(recording)}>
          Download Video
        </button>
      )}
      <button className={btn.btnSecondary} onClick={onRestart}>
        Return Home
      </button>
    </div>
  )
}
