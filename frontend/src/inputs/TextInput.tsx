import { useState } from 'react'
import type { Prompt } from '../types'
import styles from './TextInput.module.css'

interface Props {
  prompt: Prompt
  onSubmit: (value: string) => void
}

export default function TextInput({ prompt, onSubmit }: Props) {
  const [value, setValue] = useState('')
  const ok = value.trim().length > 0
  const submit = () => { if (ok) onSubmit(value.trim()) }
  return (
    <div className={styles.root}>
      {prompt.headline && <span className={styles.headline}>{prompt.headline}</span>}
      <p className={styles.promptText}>{prompt.text}</p>
      <input
        className={styles.field}
        type="text"
        value={value}
        autoFocus
        maxLength={120}
        onChange={e => setValue(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') submit() }}
      />
      <button className={`${styles.confirmBtn}${!ok ? ` ${styles.hidden}` : ''}`} onClick={submit}>
        Confirm
      </button>
    </div>
  )
}
