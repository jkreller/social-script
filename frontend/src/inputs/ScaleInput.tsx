import { useCallback, useRef, useState } from 'react'
import type { Prompt } from '../types'
import styles from './ScaleInput.module.css'

interface Props {
  prompt: Prompt
  onSubmit: (value: string) => void
}

const TICKS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

function valueToPercent(v: number) {
  return ((v - 1) / 9) * 100
}

function yToValue(y: number, rect: DOMRect): number {
  const pct = 1 - Math.max(0, Math.min(1, (y - rect.top) / rect.height))
  return Math.round(pct * 9 + 1)
}

export default function ScaleInput({ prompt, onSubmit }: Props) {
  const [value, setValue] = useState(5)
  const [interacted, setInteracted] = useState(false)
  const [dragging, setDragging] = useState(false)
  const trackRef = useRef<HTMLDivElement>(null)

  const updateFromPointer = useCallback((e: React.PointerEvent | PointerEvent) => {
    if (!trackRef.current) return
    const rect = trackRef.current.getBoundingClientRect()
    setValue(yToValue(e.clientY, rect))
  }, [])

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    setDragging(true)
    setInteracted(true)
    updateFromPointer(e)
  }, [updateFromPointer])

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging) return
    updateFromPointer(e)
  }, [dragging, updateFromPointer])

  const handlePointerUp = useCallback(() => {
    setDragging(false)
  }, [])

  const pct = valueToPercent(value)

  return (
    <div className={styles.root}>
      {prompt.headline && <span className={styles.headline}>{prompt.headline}</span>}
      <p className={styles.promptText}>{prompt.text}</p>

      <div className={styles.sliderRow}>
        <div
          className={styles.trackArea}
          ref={trackRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          <div className={styles.track}>
            <div className={styles.trackFill} style={{ height: `${pct}%` }} />
          </div>

          <div className={styles.ticks}>
            {TICKS.map(t => (
              <div
                key={t}
                className={styles.tick}
                style={{ bottom: `${valueToPercent(t)}%` }}
              >
                <div className={`${styles.tickMark} ${t === 1 || t === 5 || t === 10 ? styles.major : ''}`} />
              </div>
            ))}
          </div>

          <div
            className={`${styles.thumb} ${dragging ? styles.dragging : ''}`}
            style={{ bottom: `${pct}%` }}
          />
        </div>

        <div className={styles.valueArea}>
          <span className={`${styles.value} ${!interacted ? styles.valueDim : ''}`}>
            {value}
          </span>
          <span className={styles.valueScale}>/ 10</span>
        </div>
      </div>

      <button
        className={`${styles.confirmBtn} ${!interacted ? styles.hidden : ''}`}
        onClick={() => onSubmit(String(value))}
      >
        Confirm
      </button>
    </div>
  )
}
