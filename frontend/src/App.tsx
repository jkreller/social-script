import { useState, useCallback, useEffect } from 'react'
import { AnimatePresence, motion, type Transition } from 'framer-motion'
import styles from './App.module.css'
import HomeScreen from './screens/HomeScreen'
import RunnerScreen from './screens/RunnerScreen'
import PausedScreen from './screens/PausedScreen'
import DoneScreen from './screens/DoneScreen'
import { PAUSED_KEY } from './hooks/useRecorder'
import { getClips, clearClips } from './utils/recordingStore'
import type { Prompt, LogEntry } from './types'

type Screen = 'home' | 'running' | 'paused' | 'done'

// Restore a run that survived the interpreter dying (iOS aggressively kills
// backgrounded PWAs). Replay of `answers` lands back on the same prompt.
const SAVED = (() => {
  try { return JSON.parse(localStorage.getItem('run') || 'null') } catch { return null }
})()

// A run interrupted mid-recording leaves this flag set (see useRecorder). On the next
// foreground/launch we land on the Resume/Finish prompt instead of straight back in the run.
const PAUSED = (() => {
  try { return localStorage.getItem(PAUSED_KEY) === '1' } catch { return false }
})()

// A quick snappy fade as screens swap (mode="wait" — one at a time).
const SCREEN_TRANSITION: Transition = { duration: 0.14, ease: 'easeOut' }
const SCREEN_ANIM = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: SCREEN_TRANSITION,
}

export default function App() {
  const [screen, setScreen] = useState<Screen>(SAVED ? (PAUSED ? 'paused' : SAVED.screen ?? 'home') : 'home')
  const [script, setScript] = useState(SAVED?.script ?? '')
  const [version, setVersion] = useState<string>(SAVED?.version ?? '')
  const [tags, setTags] = useState<string[]>(SAVED?.tags ?? [])
  const [answers, setAnswers] = useState<string[]>(SAVED?.answers ?? [])
  const [userName, setUserName] = useState(SAVED?.userName ?? '')
  const [log, setLog] = useState<LogEntry[]>(SAVED?.log ?? [])
  const [cameraOn, setCameraOn] = useState<boolean>(SAVED?.cameraOn ?? true)
  const [seed, setSeed] = useState<number>(SAVED?.seed ?? 0)
  const [clips, setClips] = useState<Blob[]>([])

  useEffect(() => {
    if (screen === 'home') { localStorage.removeItem('run'); localStorage.removeItem(PAUSED_KEY) }
    else localStorage.setItem('run', JSON.stringify({ screen, script, version, tags, userName, cameraOn, answers, log, seed }))
  }, [screen, script, version, tags, userName, cameraOn, answers, log])

  // The Done screen lists every saved clip (recovered + just-finished). Load them whenever
  // we land on it — covers a normal finish, finishing from paused, and relaunching onto Done.
  useEffect(() => {
    if (screen === 'done') getClips().then(setClips).catch(() => {})
  }, [screen])

  const handlePick = useCallback((name: string, ver: string, scriptTags: string[], user: string, camera: boolean) => {
    localStorage.removeItem(PAUSED_KEY)
    clearClips().catch(() => {})
    setClips([])
    setScript(name)
    setVersion(ver)
    setTags(scriptTags)
    setUserName(user)
    setAnswers([])
    setLog([{ type: 'start', timestamp: Date.now() }])
    setCameraOn(camera)
    setSeed(Math.floor(Math.random() * 0xFFFFFFFF))
    setScreen('running')
  }, [])

  const handleStepShow = useCallback((stepIndex: number, prompt: Prompt) => {
    setLog(l => [...l, { type: 'step_show', timestamp: Date.now(), stepIndex, prompt }])
  }, [])

  const handleAnswer = useCallback((value: string, prompt: Prompt, stepIndex: number) => {
    setLog(l => [...l, { type: 'step_answer', timestamp: Date.now(), stepIndex, prompt, answer: value }])
    setAnswers(prev => [...prev, value])
  }, [])

  const handleExceptionSelect = useCallback((name: string, label: string) => {
    setLog(l => [...l, { type: 'exception_select', timestamp: Date.now(), exceptionName: name, exceptionLabel: label }])
  }, [])

  const handleException = useCallback((name: string, label: string, note: string, decision: 'continue' | 'stop', exceptionStr: string) => {
    setLog(l => [...l, { type: 'exception', timestamp: Date.now(), exceptionName: name, exceptionLabel: label, note, decision }])
    if (decision === 'continue') {
      setAnswers(prev => [...prev, exceptionStr])
    }
  }, [])

  const handleDone = useCallback(() => {
    setLog(l => [...l, { type: 'finish', timestamp: Date.now() }])
    setScreen('done')
  }, [])

  // The recording was finalized on interruption; let the human choose what's next.
  const handlePaused = useCallback(() => setScreen('paused'), [])

  // Resume: the unmounted RunnerScreen remounts fresh, so a new clip starts recording;
  // the preserved `answers` replay to the prompt we left off on.
  const handleResume = useCallback(() => {
    localStorage.removeItem(PAUSED_KEY)
    setScreen('running')
  }, [])

  const handleFinishFromPaused = useCallback(() => {
    setLog(l => [...l, { type: 'finish', timestamp: Date.now() }])
    localStorage.removeItem(PAUSED_KEY)
    setScreen('done')
  }, [])

  const handleClipStart = useCallback((timestamp: number) => {
    setLog(l => {
      const clip = l.filter(e => e.type === 'clip_start').length + 1
      return [...l, { type: 'clip_start', timestamp, clip }]
    })
  }, [])

  const handleClipEnd = useCallback((timestamp: number) => {
    setLog(l => {
      const clip = l.filter(e => e.type === 'clip_start').length
      return [...l, { type: 'clip_end', timestamp, clip }]
    })
  }, [])

  const handleRollback = useCallback(() => {
    setAnswers(prev => prev.slice(0, -1))
  }, [])

  const reset = useCallback(() => {
    clearClips().catch(() => {})
    setClips([])
    setUserName('')
    setLog([])
    setScreen('home')
  }, [])

  return (
    <div className={styles.root}>
      <AnimatePresence mode="wait">
        {screen === 'home' && (
          <motion.div key="home" className={styles.screen} {...SCREEN_ANIM}>
            <HomeScreen onPick={handlePick} />
          </motion.div>
        )}
        {screen === 'running' && (
          <motion.div key={`running-${script}`} className={styles.screen} {...SCREEN_ANIM}>
            <RunnerScreen
              script={script}
              answers={answers}
              seed={seed}
              cameraOn={cameraOn}
              log={log}
              onAnswer={handleAnswer}
              onDone={handleDone}
              onPaused={handlePaused}
              onRollback={handleRollback}
              onStepShow={handleStepShow}
              onExceptionSelect={handleExceptionSelect}
              onException={handleException}
              onClipStart={handleClipStart}
              onClipEnd={handleClipEnd}
            />
          </motion.div>
        )}
        {screen === 'paused' && (
          <motion.div key="paused" className={styles.screen} {...SCREEN_ANIM}>
            <PausedScreen onResume={handleResume} onFinish={handleFinishFromPaused} />
          </motion.div>
        )}
        {screen === 'done' && (
          <motion.div key="done" className={styles.screen} {...SCREEN_ANIM}>
            <DoneScreen
              userName={userName}
              script={script}
              version={version}
              tags={tags}
              answers={answers}
              seed={seed}
              cameraOn={cameraOn}
              log={log}
              clips={clips}
              onRestart={reset}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
