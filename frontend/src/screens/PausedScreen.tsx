import { motion } from 'framer-motion'
import { Pause, HEX } from '../icons'
import { t } from '../i18n/strings'
import btn from '../styles/buttons.module.css'
import styles from './PausedScreen.module.css'

interface Props {
  onResume: () => void
  onFinish: () => void
}

// Shown after a run is interrupted (lock / background / close). The footage so far is
// already saved; the human decides whether to keep going (a fresh clip) or wrap up.
export default function PausedScreen({ onResume, onFinish }: Props) {
  return (
    <div className={styles.root}>
      <motion.div
        className={styles.glyph}
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.18, ease: [0.2, 0.9, 0.3, 1] }}
      >
        <Pause size={48} color={HEX.accent} />
      </motion.div>
      <span className={styles.message}>{t('Paused')}</span>
      <span className={styles.hint}>{t('Your footage is safe. Pick up where you left off, or wrap it up.')}</span>
      <div className={styles.actions}>
        <button className={btn.btnPrimary} onClick={onResume}>{t('Resume')}</button>
        <button className={btn.btnSecondary} onClick={onFinish}>{t('Finish & save')}</button>
      </div>
    </div>
  )
}
