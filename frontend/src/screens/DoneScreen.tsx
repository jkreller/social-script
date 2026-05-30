import type { LogEntry } from '../types'
import { downloadLog } from '../utils/downloadLog'
import styles from './DoneScreen.module.css'

interface Props {
  userName: string
  script: string
  startTime: number
  finishTime: number
  log: LogEntry[]
  onRestart: () => void
}

export default function DoneScreen({ userName, script, startTime, finishTime, log, onRestart }: Props) {
  return (
    <div className={styles.root} role="button" onPointerDown={onRestart}>
      <span className={styles.label}>complete</span>
      <span className={styles.message}>Script finished.</span>
      <button
        className={styles.downloadBtn}
        onPointerDown={e => {
          e.stopPropagation()
          downloadLog({ userName, script, startTime, finishTime, log })
        }}
      >
        Download Log
      </button>
      <span className={styles.hint}>tap to return home</span>
    </div>
  )
}
