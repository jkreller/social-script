import { motion } from 'framer-motion'
import { Gem, UserGroup, TypingDots, Potion, Scroll, Megaphone, Heart, ChevronRight } from '../icons'
import { t } from '../i18n/strings'
import styles from './PhaseCard.module.css'

type PhaseIcon = (p: { size?: number; appearance?: 'solid' | 'palette' }) => JSX.Element

// One icon per chapter of story_game (1..6), falling back to a star.
const ICONS: Record<number, PhaseIcon> = {
  1: UserGroup,   // make it a group
  2: TypingDots,  // intro round
  3: Potion,      // add ingredients to the soup
  4: Scroll,   // storytime
  5: Megaphone,   // let's hear it
  6: Heart,       // how was it
}

interface Props {
  phase: number
  title: string | null
  description: string | null
  onDismiss: () => void
}

// A full-bleed chapter card shown when the script enters a new phase (next_phase).
// Requires a tap to dismiss, revealing the prompt underneath.
export default function PhaseCard({ phase, title, description, onDismiss }: Props) {
  const Icon = ICONS[phase] ?? Gem
  return (
    <motion.div
      className={styles.root}
      role="button"
      onClick={onDismiss}
      whileTap={{ scale: 0.985 }}
      initial={false}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.12, ease: 'easeOut' }}
    >
      <motion.div
        className={styles.iconWrap}
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.18, ease: [0.2, 0.9, 0.3, 1] }}
      >
        <Icon size={56} appearance="palette" />
      </motion.div>
      <motion.span className={styles.eyebrow} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
        {t('chapter')} {phase}
      </motion.span>
      {title && (
        <motion.span className={styles.title} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.14, duration: 0.14 }}>
          {title}
        </motion.span>
      )}
      {description && (
        <motion.span className={styles.description} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.14 }}>
          {description}
        </motion.span>
      )}
      <motion.span
        className={styles.hint}
        animate={{ y: [0, 6, 0] }}
        transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
      >
        {t('tap to continue')} <ChevronRight width={16} height={16} />
      </motion.span>
    </motion.div>
  )
}
