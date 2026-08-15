import { useLayoutEffect, useRef, useState } from 'react'
import { t } from '../i18n/strings'
import type { Prompt } from '../types'
import styles from './TextInput.module.css'

interface Props {
  prompt: Prompt
  onSubmit: (value: string) => void
  // long_text only: fires when the field's grow-with-content height gets capped by
  // the surrounding layout (see .fieldLong's flex-shrink) and starts scrolling
  // internally instead of growing further.
  onExpandedChange?: (expanded: boolean) => void
}

export default function TextInput({ prompt, onSubmit, onExpandedChange }: Props) {
  const isLong = prompt.input_type === 'long_text'
  const [value, setValue] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const ok = value.trim().length > 0
  const submit = () => { if (ok) onSubmit(value.trim()) }
  const placeholder = prompt.placeholder ?? t('type here…')

  // Textarea grows with its content — reset to auto first so it can shrink back
  // down too (e.g. after deleting a line), not just grow.
  useLayoutEffect(() => {
    const el = textareaRef.current
    if (!el) return
    // scrollHeight excludes the border, but `height` (box-sizing:border-box) is the
    // border-box total — setting height straight to scrollHeight would leave the
    // box permanently a border's-width short of its own content, misfiring the
    // "capped" check below on every keystroke rather than only at the real cap.
    const borderY = el.offsetHeight - el.clientHeight
    el.style.height = 'auto'
    const contentHeight = el.scrollHeight
    el.style.height = `${contentHeight + borderY}px`
    // If the flex layout didn't have room for that, the actual rendered height ends
    // up smaller than what was just requested — that's "capped and scrolling".
    onExpandedChange?.(el.clientHeight < contentHeight - 1)
  }, [value, onExpandedChange])

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
          ref={textareaRef}
          className={`${styles.field} ${styles.fieldLong}`}
          value={value}
          placeholder={placeholder}
          autoFocus
          rows={1}
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
