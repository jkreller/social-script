import { useState } from 'react'
import type { Prompt } from '../types'
import styles from './YesNoInput.module.css'

interface Props {
  prompt: Prompt
  onSubmit: (value: string) => void
}

export default function YesNoInput({ prompt, onSubmit }: Props) {
  const [flashing, setFlashing] = useState<'y' | 'n' | null>(null)

  const handleTap = (value: 'y' | 'n') => {
    setFlashing(value)
    setTimeout(() => onSubmit(value), 280)
  }

  return (
    <div className={styles.root}>
      <div
        className={`${styles.zone} ${styles.zoneYes} ${flashing === 'y' ? styles.flash : ''}`}
        role="button"
        onPointerDown={() => handleTap('y')}
      >
        <span className={styles.label}>Yes</span>
        {prompt.headline && <span className={styles.headline}>{prompt.headline}</span>}
      </div>

      <div className={styles.divider} />

      <div
        className={`${styles.zone} ${styles.zoneNo} ${flashing === 'n' ? styles.flash : ''}`}
        role="button"
        onPointerDown={() => handleTap('n')}
      >
        <span className={styles.label}>No</span>
      </div>

      <div className={styles.promptArea}>
        <p className={styles.promptText}>{prompt.text}</p>
      </div>
    </div>
  )
}
