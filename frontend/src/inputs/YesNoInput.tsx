import { useState } from 'react'
import { motion } from 'framer-motion'
import { Check, Close, HEX } from '../icons'
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
      <motion.div
        className={`${styles.zone} ${styles.zoneYes} ${flashing === 'y' ? styles.flash : ''}`}
        role="button"
        onClick={() => handleTap('y')}
        whileTap={{ scale: 0.96 }}
      >
        <Check size={40} color={HEX.ink} />
        <span className={styles.label}>Yes</span>
      </motion.div>

      <motion.div
        className={`${styles.zone} ${styles.zoneNo} ${flashing === 'n' ? styles.flash : ''}`}
        role="button"
        onClick={() => handleTap('n')}
        whileTap={{ scale: 0.96 }}
      >
        <Close size={40} color={HEX.fg} />
        <span className={styles.label}>No</span>
      </motion.div>

      <div className={styles.promptArea}>
        <div className={styles.promptCard}>
          {prompt.headline && <span className={styles.headline}>{prompt.headline}</span>}
          <p className={styles.promptText}>{prompt.text}</p>
        </div>
      </div>
    </div>
  )
}
