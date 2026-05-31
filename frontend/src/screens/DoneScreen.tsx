import type { LogEntry } from '../types'
import { downloadLog } from '../utils/downloadLog'
import btn from '../styles/buttons.module.css'
import styles from './DoneScreen.module.css'

interface Props {
  userName: string
  script: string
  log: LogEntry[]
  onRestart: () => void
}

export default function DoneScreen({ userName, script, log, onRestart }: Props) {
  return (
    <div className={styles.root}>
      <span className={styles.label}>complete</span>
      <span className={styles.message}>Script finished.</span>
      <button
        className={btn.btnPrimary}
        onPointerDown={() => downloadLog({ userName, script, log })}
      >
        Download Log
      </button>
      <button className={btn.btnSecondary} onPointerDown={onRestart}>
        Return Home
      </button>
    </div>
  )
}
