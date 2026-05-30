import { useState, useCallback } from 'react'
import styles from './App.module.css'
import HomeScreen from './screens/HomeScreen'
import RunnerScreen from './screens/RunnerScreen'
import DoneScreen from './screens/DoneScreen'

type Screen = 'home' | 'running' | 'done'

export default function App() {
  const [screen, setScreen] = useState<Screen>('home')
  const [script, setScript] = useState('')
  const [answers, setAnswers] = useState<string[]>([])

  const handlePick = useCallback((name: string) => {
    setScript(name)
    setAnswers([])
    setScreen('running')
  }, [])

  const handleAnswer = useCallback((value: string) => {
    setAnswers(prev => [...prev, value])
  }, [])

  const handleDone = useCallback(() => {
    setScreen('done')
  }, [])

  const handleExit = useCallback(() => {
    setScreen('home')
  }, [])

  const handleRestart = useCallback(() => {
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
          />
        </div>
      )}
      {screen === 'done' && (
        <div key="done" className={styles.screen}>
          <DoneScreen onRestart={handleRestart} />
        </div>
      )}
    </div>
  )
}
