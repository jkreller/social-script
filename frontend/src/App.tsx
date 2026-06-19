import { useState, useCallback, useEffect } from 'react'
import styles from './App.module.css'
import HomeScreen from './screens/HomeScreen'
import RunnerScreen from './screens/RunnerScreen'
import DoneScreen from './screens/DoneScreen'
import type { Recording } from './hooks/useRecorder'
import type { Prompt, LogEntry } from './types'

type Screen = 'home' | 'running' | 'done'

// Restore a run that survived the interpreter dying (iOS aggressively kills
// backgrounded PWAs). Replay of `answers` lands back on the same prompt.
const SAVED = (() => {
  try { return JSON.parse(localStorage.getItem('run') || 'null') } catch { return null }
})()

export default function App() {
  const [screen, setScreen] = useState<Screen>(SAVED?.screen ?? 'home')
  const [script, setScript] = useState(SAVED?.script ?? '')
  const [version, setVersion] = useState<string>(SAVED?.version ?? '')
  const [tags, setTags] = useState<string[]>(SAVED?.tags ?? [])
  const [answers, setAnswers] = useState<string[]>(SAVED?.answers ?? [])
  const [userName, setUserName] = useState(SAVED?.userName ?? '')
  const [log, setLog] = useState<LogEntry[]>(SAVED?.log ?? [])
  const [cameraOn, setCameraOn] = useState<boolean>(SAVED?.cameraOn ?? true)
  const [recording, setRecording] = useState<Recording | null>(null)

  useEffect(() => {
    if (screen === 'home') localStorage.removeItem('run')
    else localStorage.setItem('run', JSON.stringify({ screen, script, version, tags, userName, cameraOn, answers, log }))
  }, [screen, script, version, tags, userName, cameraOn, answers, log])

  const handlePick = useCallback((name: string, ver: string, scriptTags: string[], user: string, camera: boolean) => {
    setScript(name)
    setVersion(ver)
    setTags(scriptTags)
    setUserName(user)
    setAnswers([])
    setLog([{ type: 'start', timestamp: Date.now() }])
    setCameraOn(camera)
    setRecording(null)
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

  const handleDone = useCallback((rec: Recording | null) => {
    setLog(l => [...l, { type: 'finish', timestamp: Date.now() }])
    setRecording(rec)
    setScreen('done')
  }, [])

  const handleRollback = useCallback(() => {
    setAnswers(prev => prev.slice(0, -1))
  }, [])

  const reset = useCallback(() => {
    setRecording(r => { if (r) URL.revokeObjectURL(r.url); return null })
    setUserName('')
    setLog([])
    setScreen('home')
  }, [])

  return (
    <div className={styles.root}>
      {screen === 'home' && (
        <div key="home" className={styles.screen}>
          <HomeScreen onPick={handlePick} />
        </div>
      )}
      {screen === 'running' && (
        <div key={`running-${script}`} className={styles.screen}>
          <RunnerScreen
            script={script}
            answers={answers}
            cameraOn={cameraOn}
            onAnswer={handleAnswer}
            onDone={handleDone}
            onExit={reset}
            onRollback={handleRollback}
            onStepShow={handleStepShow}
            onExceptionSelect={handleExceptionSelect}
            onException={handleException}
          />
        </div>
      )}
      {screen === 'done' && (
        <div key="done" className={styles.screen}>
          <DoneScreen
            userName={userName}
            script={script}
            version={version}
            tags={tags}
            log={log}
            recording={recording}
            onRestart={reset}
          />
        </div>
      )}
    </div>
  )
}
