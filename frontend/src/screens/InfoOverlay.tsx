import { Close, HEX } from '../icons'
import Modal from '../components/Modal'
import styles from './InfoOverlay.module.css'

interface Props {
  open: boolean
  onClose: () => void
}

// A short "what is this" note, opened from the small info button on the title screen.
// Also where the pxlkit icon-pack credit lives (their free tier requires attribution).
export default function InfoOverlay({ open, onClose }: Props) {
  return (
    <Modal open={open} onBackdropClick={onClose} cardClassName={styles.card} animate>
      <button className={styles.closeBtn} onClick={onClose} aria-label="Close">
        <Close size={20} color={HEX.fg} />
      </button>
      <span className={styles.title}>about</span>
      <p className={styles.body}>
        "social_game" is an art-project that investigates what happens when people run social interactions as code.
      </p>
      <a className={styles.credit} href="https://pxlkit.xyz" target="_blank" rel="noreferrer">
        pixel icons by pxlkit.xyz
      </a>
    </Modal>
  )
}
