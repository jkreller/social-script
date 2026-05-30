import { useEffect, useRef, useState } from 'react'
import { postStep } from '../api'
import type { Prompt } from '../types'
import EnterInput from '../inputs/EnterInput'
import YesNoInput from '../inputs/YesNoInput'
import ScaleInput from '../inputs/ScaleInput'
import ChoiceInput from '../inputs/ChoiceInput'
import styles from './RunnerScreen.module.css'

interface Props {
  script: string
  answers: string[]
  onAnswer: (value: string, prompt: Prompt) => void
  onDone: () => void
  onExit: () => void
}

export default function RunnerScreen({ script, answers, onAnswer, onDone, onExit }: Props) {
  const [prompt, setPrompt] = useState<Prompt | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showConfirm, setShowConfirm] = useState(false)
  const [promptKey, setPromptKey] = useState(0)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    abortRef.current?.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl

    setLoading(true)
    setError(null)

    postStep({ script, answers }, ctrl.signal)
      .then(res => {
        if (ctrl.signal.aborted) return
        if (res.error) {
          setError(res.error)
          setLoading(false)
          return
        }
        if (res.done) {
          onDone()
          return
        }
        setPrompt(res.prompt)
        setPromptKey(k => k + 1)
        setLoading(false)
      })
      .catch(err => {
        if (ctrl.signal.aborted) return
        setError(err instanceof Error ? err.message : String(err))
        setLoading(false)
      })

    return () => ctrl.abort()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answers])

  const handleSubmit = (value: string) => {
    if (prompt) onAnswer(value, prompt)
  }

  const handleRetry = () => {
    setError(null)
    setLoading(true)
    abortRef.current?.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl

    postStep({ script, answers }, ctrl.signal)
      .then(res => {
        if (ctrl.signal.aborted) return
        if (res.error) { setError(res.error); setLoading(false); return }
        if (res.done) { onDone(); return }
        setPrompt(res.prompt)
        setPromptKey(k => k + 1)
        setLoading(false)
      })
      .catch(err => {
        if (ctrl.signal.aborted) return
        setError(err instanceof Error ? err.message : String(err))
        setLoading(false)
      })
  }

  return (
    <div className={styles.root}>
      <div className={styles.topBar}>
        <button className={styles.exitBtn} onPointerDown={() => setShowConfirm(true)} aria-label="Exit">
          ×
        </button>
      </div>

      {error ? (
        <div className={styles.errorState}>
          <span className={styles.errorText}>{error}</span>
          <button className={styles.retryBtn} onPointerDown={handleRetry}>Retry</button>
        </div>
      ) : loading ? (
        <div className={styles.loadingOverlay}>
          <div className={styles.pulse} />
        </div>
      ) : prompt ? (
        <div key={promptKey} className={styles.inputArea}>
          {prompt.input_type === 'enter' && (
            <EnterInput prompt={prompt} onSubmit={handleSubmit} />
          )}
          {prompt.input_type === 'yn' && (
            <YesNoInput prompt={prompt} onSubmit={handleSubmit} />
          )}
          {prompt.input_type === 'scale' && (
            <ScaleInput prompt={prompt} onSubmit={handleSubmit} />
          )}
          {prompt.input_type === 'choice' && (
            <ChoiceInput prompt={prompt} onSubmit={handleSubmit} />
          )}
        </div>
      ) : null}

      {showConfirm && (
        <div className={styles.confirmModal}>
          <span className={styles.confirmText}>Abandon this script?</span>
          <div className={styles.confirmActions}>
            <button className={styles.confirmBtn} onPointerDown={() => setShowConfirm(false)}>
              Keep going
            </button>
            <button className={`${styles.confirmBtn} ${styles.danger}`} onPointerDown={onExit}>
              Quit
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
