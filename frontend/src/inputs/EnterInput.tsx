import { motion } from 'framer-motion'
import { ChevronRight } from '../icons'
import { t } from '../i18n/strings'
import type { Prompt } from '../types'
import styles from './EnterInput.module.css'

interface Props {
  prompt: Prompt
  onSubmit: (value: string) => void
}

export default function EnterInput({ prompt, onSubmit }: Props) {
  return (
    <motion.div className={styles.root} role="button" onClick={() => onSubmit('')} whileTap={{ scale: 0.985 }}>
      {prompt.headline && <span className={styles.headline}>{prompt.headline}</span>}
      <div className={styles.textWrap}>
        <p className={styles.text}>{prompt.text}</p>
      </div>
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
