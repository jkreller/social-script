import { useState, type CSSProperties } from 'react'
import { AnimatePresence, motion, type Variants } from 'framer-motion'
import type { Prompt } from '../types'
import styles from './ChoiceInput.module.css'

// Hand-picked, all visually distinct (unlike the old CSS-var palette, where
// --pop-mint/--pop-sky and --pop-coral/--pop-magenta were duplicate aliases).
// Covers every choice list currently in the scripts (max observed is 9).
const PALETTE = ['#ff3d9a', '#ff8a3d', '#FFD300', '#8bff77', '#21e6d6', '#3dc6ff', '#5c7cff', '#9b45ff', '#d63dff', '#ff5c8a']

// Fewer options than this reads better as a single column; a 2-col grid looks sparse.
const GRID_MIN = 6

const container: Variants = { hidden: {}, visible: { transition: { staggerChildren: 0.045 } } }
const item: Variants = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.12, ease: 'easeOut' } },
}

// A little burst of sparks radiating from a freshly-picked card.
function SparkleBurst() {
  return (
    <div className={styles.burst}>
      {[0, 1, 2, 3, 4, 5].map(d => {
        const ang = (d / 6) * Math.PI * 2
        return (
          <motion.span
            key={d}
            className={styles.spark}
            initial={{ opacity: 1, x: 0, y: 0, scale: 0.3 }}
            animate={{ opacity: 0, x: Math.cos(ang) * 48, y: Math.sin(ang) * 48, scale: 1 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        )
      })}
    </div>
  )
}

interface Props {
  prompt: Prompt
  onSubmit: (value: string) => void
}

export default function ChoiceInput({ prompt, onSubmit }: Props) {
  const choices = prompt.choices ?? []
  const isGrid = choices.length >= GRID_MIN
  const allowCustom = prompt.allow_custom ?? false
  const [selected, setSelected] = useState<number | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [own, setOwn] = useState('')

  const handleTap = (globalIndex: number) => {
    if (submitted) return
    setSubmitted(true)
    setSelected(globalIndex)
    setTimeout(() => onSubmit(String(globalIndex + 1)), 380)
  }

  const ownOk = own.trim().length > 0
  const submitOwn = () => {
    if (submitted || !ownOk) return
    setSubmitted(true)
    onSubmit(own.trim())
  }

  return (
    <div className={styles.root}>
      {prompt.headline && <span className={styles.headline}>{prompt.headline}</span>}
      <p className={styles.promptText}>{prompt.text}</p>

      <motion.div
        className={`${styles.choices} ${isGrid ? styles.grid : ''}`}
        variants={container}
        initial="hidden"
        animate="visible"
      >
        {choices.map((choice, globalIndex) => {
          const isSelected = selected === globalIndex
          return (
            <motion.div
              key={globalIndex}
              className={`${styles.choice} ${isSelected ? styles.selected : ''}`}
              style={{ '--cc': PALETTE[globalIndex % PALETTE.length] } as CSSProperties}
              variants={item}
              whileTap={{ x: 3, y: 3 }}
              role="button"
              onClick={() => handleTap(globalIndex)}
            >
              <span className={styles.choiceText}>{choice.label}</span>
              {choice.description && <span className={styles.choiceDesc}>{choice.description}</span>}
              <AnimatePresence>{isSelected && <SparkleBurst />}</AnimatePresence>
            </motion.div>
          )
        })}
      </motion.div>

      {allowCustom && (
        <div className={styles.ownRow}>
          <span className={styles.ownCaption}>or make up your own</span>
          <div className={styles.ownField}>
            <input
              className={styles.ownInput}
              type="text"
              value={own}
              placeholder="type here…"
              maxLength={120}
              onChange={e => setOwn(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') submitOwn() }}
            />
            <button
              className={`${styles.ownBtn}${!ownOk ? ` ${styles.hidden}` : ''}`}
              onClick={submitOwn}
            >
              Go
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
