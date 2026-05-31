import { useState, useCallback } from 'react'
import styles from './App.module.css'
import HomeScreen from './screens/HomeScreen'
import RunnerScreen from './screens/RunnerScreen'
import DoneScreen from './screens/DoneScreen'
import type { Prompt, LogEntry } from './types'

type Screen = 'home' | 'running' | 'done'

export default function App() {
  const [screen, setScreen] = useState<Screen>('home')
  const [script, setScript] = useState('')
  const [answers, setAnswers] = useState<string[]>([])
  const [userName, setUserName] = useState('')
  const [startTime, setStartTime] = useState<number | null>(null)
  const [finishTime, setFinishTime] = useState<number | null>(null)
  const [log, setLog] = useState<LogEntry[]>([])

  const handlePick = useCallback((name: string, user: string) => {
    setScript(name)
    setUserName(user)
    setAnswers([])
    setLog([])
    setStartTime(Date.now())
    setFinishTime(null)
    setScreen('running')
  }, [])

  const handleAnswer = useCallback((value: string, prompt: Prompt, decision?: 'continue' | 'stop') => {
    setAnswers(prev => {
      setLog(l => [...l, { timestamp: Date.now(), stepIndex: prev.length, prompt, answer: value, decision }])
      return [...prev, value]
    })
  }, [])

  const handleDone = useCallback(() => {
    setFinishTime(Date.now())
    setScreen('done')
  }, [])

  const handleRollback = useCallback(() => {
    setAnswers(prev => prev.slice(0, -1))
  }, [])

  const handleExceptionStop = useCallback((value: string, prompt: Prompt) => {
    setAnswers(prev => {
      setLog(l => [...l, { timestamp: Date.now(), stepIndex: prev.length, prompt, answer: value, decision: 'stop' }])
      return prev
    })
  }, [])

  const handleExit = useCallback(() => {
    setUserName('')
    setStartTime(null)
    setFinishTime(null)
    setLog([])
    setScreen('home')
  }, [])

  const handleRestart = useCallback(() => {
    setUserName('')
    setStartTime(null)
    setFinishTime(null)
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
            onAnswer={handleAnswer}
            onDone={handleDone}
            onExit={handleExit}
            onRollback={handleRollback}
            onExceptionStop={handleExceptionStop}
          />
        </div>
      )}
      {screen === 'done' && (
        <div key="done" className={styles.screen}>
          <DoneScreen
            userName={userName}
            script={script}
            startTime={startTime!}
            finishTime={finishTime!}
            log={log}
            onRestart={handleRestart}
          />
        </div>
      )}
    </div>
  )
}
