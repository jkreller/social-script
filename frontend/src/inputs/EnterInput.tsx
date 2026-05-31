import type { Prompt } from '../types'
import styles from './EnterInput.module.css'

interface Props {
  prompt: Prompt
  onSubmit: (value: string) => void
}

export default function EnterInput({ prompt, onSubmit }: Props) {
  return (
    <div className={styles.root} role="button" onClick={() => onSubmit('')}>
      {prompt.headline && <span className={styles.headline}>{prompt.headline}</span>}
      <p className={styles.text}>{prompt.text}</p>
      <span className={styles.hint}>tap to continue</span>
    </div>
  )
}
