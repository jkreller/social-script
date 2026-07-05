import type { ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import styles from './Modal.module.css'

interface Props {
  open: boolean
  onBackdropClick?: () => void
  animate?: boolean
  cardClassName?: string
  children: ReactNode
}

// Shared centered-popup shell: full-screen blurred backdrop + a surface-strong card.
// Used by the start dialog, info overlay, and RunnerScreen's leave/exception popups.
// `animate` opts into a fade+scale transition; leave it off for popups that should
// appear/disappear instantly (RunnerScreen's, mid-game, don't want the extra motion).
export default function Modal({ open, onBackdropClick, animate = false, cardClassName, children }: Props) {
  const overlayTransition = { duration: animate ? 0.12 : 0, ease: 'easeOut' as const }
  const cardTransition = { duration: animate ? 0.14 : 0, ease: 'easeOut' as const }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className={styles.overlay}
          onClick={onBackdropClick}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={overlayTransition}
        >
          <motion.div
            className={cardClassName ? `${styles.card} ${cardClassName}` : styles.card}
            onClick={e => e.stopPropagation()}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={cardTransition}
          >
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
