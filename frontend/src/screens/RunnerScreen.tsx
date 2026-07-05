import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Close, Flag, Volume, Star, HEX } from '../icons'
import { getExceptions, postStep } from '../api'
import type { ExceptionInfo, ExceptionType, Prompt } from '../types'
import { useRecorder } from '../hooks/useRecorder'
import { isMuted, toggleMuted, unlockAudio, playPhase, playPass, playYes } from '../utils/sfx'
import { t } from '../i18n/strings'
import { getLocale } from '../utils/locale'
import CameraLayer from '../components/CameraLayer'
import Modal from '../components/Modal'
import EnterInput from '../inputs/EnterInput'
import YesNoInput from '../inputs/YesNoInput'
import ScaleInput from '../inputs/ScaleInput'
import ChoiceInput from '../inputs/ChoiceInput'
import TextInput from '../inputs/TextInput'
import EnterStructuredInput from '../inputs/EnterStructuredInput'
import PhaseCard from '../inputs/PhaseCard'
import btn from '../styles/buttons.module.css'
import styles from './RunnerScreen.module.css'

// A prompt where the device is handed to another person — worth a little whoosh.
// `headline` is translated server-side, so "pass" (hand_over()'s tag) only matches
// in English — the German catalog's current translation is hardcoded here too, a
// narrow, cosmetic-only tradeoff to avoid exposing the translation catalog to JS
// just for a sound effect. `p.text` is untranslated script content either way.
function isHandoff(p: Prompt): boolean {
  const passHeadline = getLocale() === 'de' ? 'weitergeben' : 'pass'
  return p.headline === passHeadline || /^\s*pass me to/i.test(p.text)
}

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
  const [phaseCard, setPhaseCard] = useState<Prompt | null>(null)
  const [muted, setMuted] = useState(isMuted())
  const lastPhaseRef = useRef(0)
  const abortRef = useRef<AbortController | null>(null)

  // Apply a freshly-replayed prompt. When the phase number climbs, surface the
  // chapter card + a chime; otherwise sound a whoosh on hand-offs. lastPhaseRef is a
  // display-only latch — never sent back to Python, so replay stays stateless.
  const applyPrompt = useCallback((p: Prompt) => {
    setPrompt(p)
    setPromptKey(k => k + 1)
    setLoading(false)
    if (p.phase > lastPhaseRef.current) {
      lastPhaseRef.current = p.phase
      setPhaseCard(p)
      playPhase()
    } else if (isHandoff(p)) {
      playPass()
    }
    onStepShow(answers.length, p)
  }, [answers, onStepShow])

  const [exceptions, setExceptions] = useState<ExceptionType[]>([])
  const [showException, setShowException] = useState(false)
  const [selected, setSelected] = useState<ExceptionType | null>(null)
  const [note, setNote] = useState('')
  const [uncaught, setUncaught] = useState<ExceptionInfo | null>(null)

  const toggleMute = () => setMuted(toggleMuted())

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
        applyPrompt(res.prompt!)
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

  useEffect(() => {
    if (!phaseCard) return
    const t = setTimeout(() => setPhaseCard(null), 2500)
    return () => clearTimeout(t)
  }, [phaseCard])

  const handleSubmit = (value: string) => {
    if (!prompt) return
    // The app can't know when a stranger is actually won over — so any "yes" gets a
    // little success cue. It reads right often enough to be worth the false positives.
    if (prompt.input_type === 'yn' && value === 'y') playYes()
    onAnswer(value, prompt, answers.length)
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
        applyPrompt(res.prompt!)
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
    <div className={styles.root} onPointerDown={unlockAudio}>
      {cameraOn && <CameraLayer videoRef={videoRef} />}
      <div className={styles.topBar}>
        <button className={styles.iconBtn} onClick={() => setShowConfirm(true)} aria-label={t('Exit')}>
          <Close size={22} color={HEX.fg} />
        </button>
        <div className={styles.topRight}>
          <button className={`${styles.iconBtn} ${muted ? styles.iconOff : ''}`} onClick={toggleMute} aria-label={t('Toggle sound')}>
            <Volume width={20} height={20} />
          </button>
          {interactive && (
            <button className={styles.iconBtn} onClick={() => setShowException(true)} aria-label={t('Raise exception')}>
              <Flag size={20} color={HEX.fg} />
            </button>
          )}
        </div>
      </div>

      {error ? (
        <div className={styles.errorState}>
          <span className={styles.errorText}>{error}</span>
          <button className={btn.btnSecondary} onClick={handleRetry}>{t('Retry')}</button>
        </div>
      ) : uncaught ? (
        <div className={styles.uncaughtNotice}>
          <span className={styles.uncaughtLabel}>{uncaught.label}</span>
          {uncaught.note && <span className={styles.uncaughtNote}>{uncaught.note}</span>}
          <span className={styles.uncaughtHint}>{t('Continuing…')}</span>
        </div>
      ) : loading ? (
        <div className={styles.loadingOverlay}>
          <motion.div
            className={styles.loader}
            animate={{ rotate: 360, scale: [1, 1.18, 1] }}
            transition={{ rotate: { duration: 2.6, repeat: Infinity, ease: 'linear' }, scale: { duration: 1.3, repeat: Infinity, ease: 'easeInOut' } }}
          >
            <Star size={40} color={HEX.accent} />
          </motion.div>
        </div>
      ) : prompt ? (
        <motion.div
          key={promptKey}
          className={styles.inputArea}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.14, ease: 'easeOut' }}
        >
          {prompt.input_type === 'enter' && <EnterInput prompt={prompt} onSubmit={handleSubmit} />}
          {prompt.input_type === 'yn' && <YesNoInput prompt={prompt} onSubmit={handleSubmit} />}
          {prompt.input_type === 'scale' && <ScaleInput prompt={prompt} onSubmit={handleSubmit} />}
          {prompt.input_type === 'choice' && <ChoiceInput prompt={prompt} onSubmit={handleSubmit} />}
          {(prompt.input_type === 'text' || prompt.input_type === 'long_text') && <TextInput prompt={prompt} onSubmit={handleSubmit} />}
          {prompt.input_type === 'enter_structured' && <EnterStructuredInput prompt={prompt} onSubmit={handleSubmit} />}
        </motion.div>
      ) : null}

      <AnimatePresence>
        {phaseCard && (
          <PhaseCard
            key="phase"
            phase={phaseCard.phase}
            title={phaseCard.phase_title}
            description={phaseCard.phase_description}
          />
        )}
      </AnimatePresence>

      <Modal open={showConfirm} cardClassName={styles.confirmCard}>
        <span className={styles.confirmText}>{t('Leave the game?')}</span>
        <div className={styles.confirmActions}>
          <button className={btn.btnSecondary} onClick={() => setShowConfirm(false)}>
            {t('Keep playing')}
          </button>
          <button className={`${btn.btnSecondary} ${styles.danger}`} onClick={finish}>
            {t('Quit')}
          </button>
        </div>
      </Modal>

      <Modal open={showException} cardClassName={styles.confirmCard}>
        {!selected ? (
          <>
            <span className={styles.exceptionHeadline}>{t('what happened?')}</span>
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
              {t('cancel')}
            </button>
          </>
        ) : (
          <>
            <span className={styles.exceptionHeadline}>{selected.label}</span>
            <input
              className={styles.noteInput}
              type="text"
              placeholder={t('add a note (optional)')}
              value={note}
              autoFocus
              maxLength={120}
              onChange={e => setNote(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') raise() }}
            />
            <div className={styles.confirmActions}>
              <button className={`${btn.btnSecondary} ${styles.danger}`} onClick={stop}>
                {t('stop')}
              </button>
              <button className={btn.btnSecondary} onClick={raise}>
                {t('continue')}
              </button>
            </div>
            <button className={styles.cancelBtn} onClick={() => setSelected(null)}>
              {t('back')}
            </button>
          </>
        )}
      </Modal>
    </div>
  )
}
