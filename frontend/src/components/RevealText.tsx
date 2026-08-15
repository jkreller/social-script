import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { ChevronRight } from '../icons'
import { t } from '../i18n/strings'
import styles from './RevealText.module.css'

interface Props {
  lines: string[]
  // Present => show a "tap to continue" hint once fully revealed, and tapping then
  // calls this. Omit for a terminal page (reveal still fast-forwards on tap, but
  // nothing happens once it's done).
  onAdvance?: () => void
  intervalMs?: number
}

export interface RevealTextHandle {
  // The caller (TeaserScreen) wires this to a pointerdown on the whole screen, not
  // just this component's own (now content-sized, not full-height) box — so tapping
  // anywhere fast-forwards/advances, not only tapping directly on the text.
  tap: () => void
}

// Reveals `lines` one at a time, `intervalMs` apart, with a fade+slide-in per line.
// Tapping anywhere fast-forwards a reveal in progress; once fully revealed, tapping
// again calls `onAdvance` (if given).
const RevealText = forwardRef<RevealTextHandle, Props>(function RevealText({ lines, onAdvance, intervalMs = 2000 }, ref) {
  const [revealedCount, setRevealedCount] = useState(1)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const fullyRevealed = revealedCount >= lines.length

  useEffect(() => {
    setRevealedCount(1)
    if (lines.length > 1) {
      intervalRef.current = setInterval(() => {
        setRevealedCount(n => {
          const next = n + 1
          if (next >= lines.length && intervalRef.current) {
            clearInterval(intervalRef.current)
            intervalRef.current = null
          }
          return next
        })
      }, intervalMs)
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [lines, intervalMs])

  const handleTap = () => {
    if (revealedCount < lines.length) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      setRevealedCount(lines.length)
      return
    }
    onAdvance?.()
  }

  useImperativeHandle(ref, () => ({ tap: handleTap }))

  return (
    <div className={styles.root}>
      <div className={styles.lines}>
        {lines.slice(0, revealedCount).map((text, i) => (
          <motion.p
            key={i}
            className={styles.line}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.14, ease: 'easeOut' }}
          >
            {text}
          </motion.p>
        ))}
      </div>
      {fullyRevealed && onAdvance && (
        <motion.span
          className={styles.hint}
          animate={{ y: [0, 6, 0] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
        >
          {t('tap to continue')} <ChevronRight width={16} height={16} />
        </motion.span>
      )}
    </div>
  )
})

export default RevealText
