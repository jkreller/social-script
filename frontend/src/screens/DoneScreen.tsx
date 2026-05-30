import styles from './DoneScreen.module.css'

interface Props {
  onRestart: () => void
}

export default function DoneScreen({ onRestart }: Props) {
  return (
    <div className={styles.root} role="button" onPointerDown={onRestart}>
      <span className={styles.label}>complete</span>
      <span className={styles.message}>Script finished.</span>
      <span className={styles.hint}>tap to return home</span>
    </div>
  )
}
