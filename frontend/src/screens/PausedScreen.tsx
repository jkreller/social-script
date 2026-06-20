import btn from '../styles/buttons.module.css'
import styles from './PausedScreen.module.css'

interface Props {
  onResume: () => void
  onFinish: () => void
}

// Shown after a run is interrupted (lock / background / close). The footage so far is
// already saved; the human decides whether to keep going (a fresh clip) or wrap up.
export default function PausedScreen({ onResume, onFinish }: Props) {
  return (
    <div className={styles.root}>
      <span className={styles.label}>paused</span>
      <span className={styles.message}>Recording saved.</span>
      <span className={styles.hint}>Resume to keep going, or finish and download.</span>
      <button className={btn.btnPrimary} onClick={onResume}>Resume run</button>
      <button className={btn.btnSecondary} onClick={onFinish}>Finish &amp; save</button>
    </div>
  )
}
