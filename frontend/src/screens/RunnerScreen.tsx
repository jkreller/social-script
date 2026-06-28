import { useCallback, useEffect, useRef, useState } from 'react'
import { getExceptions, postStep } from '../api'
import type { ExceptionInfo, ExceptionType, Prompt } from '../types'
import { useRecorder } from '../hooks/useRecorder'
import CameraLayer from '../components/CameraLayer'
import EnterInput from '../inputs/EnterInput'
import YesNoInput from '../inputs/YesNoInput'
import ScaleInput from '../inputs/ScaleInput'
import ChoiceInput from '../inputs/ChoiceInput'
import TextInput from '../inputs/TextInput'
import btn from '../styles/buttons.module.css'
import styles from './RunnerScreen.module.css'

interface Props {
  script: string
  answers: string[]
  seed: number
  cameraOn: boolean
  onAnswer: (value: string, prompt: Prompt, stepIndex: number) => void
  onDone: () => void
  onPaused: () => void
  onRollback: () => void
  onStepShow: (stepIndex: number, prompt: Prompt) => void
  onExceptionSelect: (name: string, label: string) => void
  onException: (name: string, label: string, note: string, decision: 'continue' | 'stop', exceptionStr: string) => void
  onClipStart: (timestamp: number) => void
  onClipEnd: (timestamp: number) => void
}

export default function RunnerScreen({ script, answers, seed, cameraOn, onAnswer, onDone, onPaused, onRollback, onStepShow, onExceptionSelect, onException, onClipStart, onClipEnd }: Props) {
  const [execReady, setExecReady] = useState(!cameraOn)
  const { videoRef, stop: stopRecording } = useRecorder(
    cameraOn,
    onPaused,
    (ts) => { setExecReady(true); onClipStart(ts) },
    onClipEnd,
  )
  const finish = useCallback(async () => { await stopRecording(); onDone() }, [onDone, stopRecording])
  const [prompt, setPrompt] = useState<Prompt | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showConfirm, setShowConfirm] = useState(false)
  const [promptKey, setPromptKey] = useState(0)
  const abortRef = useRef<AbortController | null>(null)

  const [exceptions, setExceptions] = useState<ExceptionType[]>([])
  const [showException, setShowException] = useState(false)
  const [selected, setSelected] = useState<ExceptionType | null>(null)
  const [note, setNote] = useState('')
  const [uncaught, setUncaught] = useState<ExceptionInfo | null>(null)

  useEffect(() => {
    getExceptions().then(setExceptions).catch(() => {})
  }, [])

  useEffect(() => {
    if (!execReady) return
    abortRef.current?.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl

    setLoading(true)
    setError(null)
    setUncaught(null)

    postStep({ script, answers, seed }, ctrl.signal)
      .then(res => {
        if (ctrl.signal.aborted) return
        if (res.error) {
          setError(res.error)
          setLoading(false)
          return
        }
        if (res.exception) {
          setUncaught(res.exception)
          setLoading(false)
          return
        }
        if (res.done) {
          finish()
          return
        }
        setPrompt(res.prompt)
        setPromptKey(k => k + 1)
        setLoading(false)
        onStepShow(answers.length, res.prompt!)
      })
      .catch(err => {
        if (ctrl.signal.aborted) return
        setError(err instanceof Error ? err.message : String(err))
        setLoading(false)
      })

    return () => ctrl.abort()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answers, execReady])

  useEffect(() => {
    if (!uncaught) return
    const t = setTimeout(() => onRollback(), 1800)
    return () => clearTimeout(t)
  }, [uncaught, onRollback])

  const handleSubmit = (value: string) => {
    if (prompt) onAnswer(value, prompt, answers.length)
  }

  const handleRetry = () => {
    setError(null)
    setLoading(true)
    abortRef.current?.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl

    postStep({ script, answers, seed }, ctrl.signal)
      .then(res => {
        if (ctrl.signal.aborted) return
        if (res.error) { setError(res.error); setLoading(false); return }
        if (res.exception) { setUncaught(res.exception); setLoading(false); return }
        if (res.done) { finish(); return }
        setPrompt(res.prompt)
        setPromptKey(k => k + 1)
        setLoading(false)
        onStepShow(answers.length, res.prompt!)
      })
      .catch(err => {
        if (ctrl.signal.aborted) return
        setError(err instanceof Error ? err.message : String(err))
        setLoading(false)
      })
  }

  const exceptionString = () => {
    if (!selected) return ''
    const clean = note.trim().replace(/[()\n]/g, ' ').trim()
    return `${selected.name}(${clean})`
  }

  const raise = () => {
    if (!selected || !prompt) return
    onException(selected.name, selected.label, note, 'continue', exceptionString())
    setShowException(false)
    setSelected(null)
    setNote('')
  }

  const stop = () => {
    if (!selected || !prompt) return
    onException(selected.name, selected.label, note, 'stop', '')
    closeException()
    finish()
  }

  const closeException = () => {
    setShowException(false)
    setSelected(null)
    setNote('')
  }

  const interactive = exceptions.length > 0 && prompt && !loading && !error && !uncaught

  return (
    <div className={styles.root}>
      {cameraOn && <CameraLayer videoRef={videoRef} />}
      <div className={styles.topBar}>
        <div className={styles.topLeft}>
          <button className={styles.exitBtn} onClick={() => setShowConfirm(true)} aria-label="Exit">
            ×
          </button>
        </div>
        <div className={styles.topRight}>
          {interactive && (
            <button className={styles.exceptionBtn} onClick={() => setShowException(true)} aria-label="Raise exception">
              ⚑
            </button>
          )}
        </div>
      </div>

      {error ? (
        <div className={styles.errorState}>
          <span className={styles.errorText}>{error}</span>
          <button className={btn.btnSecondary} onClick={handleRetry}>Retry</button>
        </div>
      ) : uncaught ? (
        <div className={styles.uncaughtNotice}>
          <span className={styles.uncaughtLabel}>{uncaught.label}</span>
          {uncaught.note && <span className={styles.uncaughtNote}>{uncaught.note}</span>}
          <span className={styles.uncaughtHint}>Continuing script…</span>
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
          {prompt.input_type === 'text' && (
            <TextInput prompt={prompt} onSubmit={handleSubmit} />
          )}
        </div>
      ) : null}

      {showConfirm && (
        <div className={styles.confirmModal}>
          <span className={styles.confirmText}>Abandon this script?</span>
          <div className={styles.confirmActions}>
            <button className={btn.btnSecondary} onClick={() => setShowConfirm(false)}>
              Keep going
            </button>
            <button className={`${btn.btnSecondary} ${styles.danger}`} onClick={finish}>
              Quit
            </button>
          </div>
        </div>
      )}

      {showException && (
        <div className={styles.confirmModal}>
          {!selected ? (
            <>
              <span className={styles.exceptionHeadline}>what happened?</span>
              <div className={styles.exceptionList}>
                {exceptions.map(exc => (
                  <div
                    key={exc.name}
                    className={styles.exceptionRow}
                    role="button"
                    onClick={() => { setSelected(exc); onExceptionSelect(exc.name, exc.label) }}
                  >
                    {exc.label}
                  </div>
                ))}
              </div>
              <button className={styles.cancelBtn} onClick={closeException}>
                cancel
              </button>
            </>
          ) : (
            <>
              <span className={styles.exceptionHeadline}>{selected.label}</span>
              <input
                className={styles.noteInput}
                type="text"
                placeholder="add a note (optional)"
                value={note}
                autoFocus
                maxLength={120}
                onChange={e => setNote(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') raise() }}
              />
              <div className={styles.confirmActions}>
                <button className={`${btn.btnSecondary} ${styles.danger}`} onClick={stop}>
                  stop
                </button>
                <button className={btn.btnSecondary} onClick={raise}>
                  continue
                </button>
              </div>
              <button className={styles.cancelBtn} onClick={() => setSelected(null)}>
                back
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
