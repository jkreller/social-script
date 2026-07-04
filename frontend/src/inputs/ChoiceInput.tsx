import { useState, type CSSProperties } from 'react'
import { AnimatePresence, motion, type Variants } from 'framer-motion'
import { ChevronLeft, ChevronRight } from '../icons'
import type { Prompt } from '../types'
import styles from './ChoiceInput.module.css'

const PAGE_SIZE = 6
const PALETTE = ['var(--pop-magenta)', 'var(--pop-mint)', 'var(--pop-violet)', 'var(--pop-sky)', 'var(--pop-coral)', 'var(--accent)']

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
  const allowCustom = prompt.allow_custom ?? false
  const [selected, setSelected] = useState<number | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [page, setPage] = useState(0)
  const [own, setOwn] = useState('')

  const totalPages = Math.ceil(choices.length / PAGE_SIZE)
  const pageChoices = choices.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

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

      <motion.div key={page} className={styles.choices} variants={container} initial="hidden" animate="visible">
        {pageChoices.map((choice, i) => {
          const globalIndex = page * PAGE_SIZE + i
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

      {totalPages > 1 && (
        <div className={styles.pagination}>
          <button className={styles.pageBtn} disabled={page === 0} onClick={() => setPage(p => p - 1)}>
            <ChevronLeft width={20} height={20} />
          </button>
          <span className={styles.pageInfo}>{page + 1} / {totalPages}</span>
          <button className={styles.pageBtn} disabled={page === totalPages - 1} onClick={() => setPage(p => p + 1)}>
            <ChevronRight width={20} height={20} />
          </button>
        </div>
      )}

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
