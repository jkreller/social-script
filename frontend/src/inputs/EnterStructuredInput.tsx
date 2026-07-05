import { motion, type Variants } from 'framer-motion'
import type { CSSProperties } from 'react'
import { UserGroup, User, Pin, Clock, Palette, Package, Gem, ChevronRight } from '../icons'
import { t } from '../i18n/strings'
import type { Prompt } from '../types'
import styles from './EnterStructuredInput.module.css'

type TileIcon = (p: { size?: number; appearance?: 'solid' | 'palette' }) => JSX.Element

const ICONS: Record<string, TileIcon> = {
  characters: UserGroup,
  character: User,
  place: Pin,
  time: Clock,
  genre: Palette,
  object: Package,
}

// A handful of the theme's pop colors, cycled per tile. Deliberately not ChoiceInput's
// border palette — this is a "look what we picked" reveal, not a form list, so it gets
// its own colored-badge language (borrowed from PhaseCard's icon box) instead.
const TILE_COLORS = ['var(--pop-magenta)', 'var(--pop-cyan)', 'var(--pop-green)', 'var(--accent)', 'var(--pop-violet)']

const container: Variants = { hidden: {}, visible: { transition: { staggerChildren: 0.06 } } }
const tile: Variants = {
  hidden: { opacity: 0, scale: 0.5 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.22, ease: [0.2, 0.9, 0.3, 1] } },
}

interface Props {
  prompt: Prompt
  onSubmit: (value: string) => void
}

export default function EnterStructuredInput({ prompt, onSubmit }: Props) {
  const items = prompt.items ?? []
  return (
    <motion.div className={styles.root} role="button" onClick={() => onSubmit('')} whileTap={{ scale: 0.985 }}>
      {prompt.headline && <span className={styles.headline}>{prompt.headline}</span>}
      {prompt.intro && <span className={styles.caption}>{prompt.intro}</span>}
      <motion.div className={styles.grid} variants={container} initial="hidden" animate="visible">
        {items.map((item, i) => {
          const Icon = ICONS[item.icon] ?? Gem
          return (
            <motion.div
              key={i}
              className={styles.tile}
              style={{ '--tc': TILE_COLORS[i % TILE_COLORS.length] } as CSSProperties}
              variants={tile}
            >
              <div className={styles.badge}>
                <Icon size={28} appearance="palette" />
              </div>
              <span className={styles.label}>{item.label}</span>
              <span className={styles.value}>{item.value}</span>
            </motion.div>
          )
        })}
      </motion.div>
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
