import { useState } from 'react'
import { t } from '../i18n/strings'
import type { Prompt } from '../types'
import styles from './TextInput.module.css'

interface Props {
  prompt: Prompt
  onSubmit: (value: string) => void
}

export default function TextInput({ prompt, onSubmit }: Props) {
  const isLong = prompt.input_type === 'long_text'
  const [value, setValue] = useState('')
  const ok = value.trim().length > 0
  const submit = () => { if (ok) onSubmit(value.trim()) }
  return (
    <div className={styles.root}>
      {prompt.headline && <span className={styles.headline}>{prompt.headline}</span>}
      {prompt.intro && (
        <div className={styles.intro}>
          <span className={styles.introLabel}>{t('the story so far')}:</span>
          <p className={styles.introText}>{prompt.intro}</p>
        </div>
      )}
      <p className={styles.promptText}>{prompt.text}</p>
      {isLong ? (
        <textarea
          className={`${styles.field} ${styles.fieldLong}`}
          value={value}
          placeholder={t('type here…')}
          autoFocus
          rows={4}
          onChange={e => setValue(e.target.value)}
        />
      ) : (
        <input
          className={styles.field}
          type="text"
          value={value}
          placeholder={t('type here…')}
          autoFocus
          maxLength={120}
          onChange={e => setValue(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') submit() }}
        />
      )}
      <button
        className={`${styles.confirmBtn}${!ok ? ` ${styles.hidden}` : ''}`}
        onClick={submit}
      >
        {t('Confirm')}
      </button>
    </div>
  )
}
