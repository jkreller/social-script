import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Heart, Lightning, Flame, Star, Gem, ExplosionBurst, GlowPulse, Play, Camera, InfoCircle, HEX } from '../icons'
import { getScripts, type ScriptInfo } from '../api'
import { unlockAudio } from '../utils/sfx'
import { t } from '../i18n/strings'
import { getLocale, toggleLocale } from '../utils/locale'
import InfoOverlay from './InfoOverlay'
import Modal from '../components/Modal'
import btn from '../styles/buttons.module.css'
import styles from './HomeScreen.module.css'

// The one game this app runs. We still read its info from the engine (for the log),
// but there's no script list any more — it's a single game.
const GAME = 'story_game'
const FALLBACK: ScriptInfo = { name: GAME, version: '', tags: [] }

// The hero glyph cycles through these every 5s instead of sitting on one fixed icon.
const GLYPHS = [Heart, Lightning, Flame, Star, Gem, ExplosionBurst, GlowPulse]

interface Props {
  onPick: (script: string, version: string, tags: string[], userName: string, cameraOn: boolean) => void
}

export default function HomeScreen({ onPick }: Props) {
  const [game, setGame] = useState<ScriptInfo | null>(null)
  const [booting, setBooting] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [infoOpen, setInfoOpen] = useState(false)
  const [userName, setUserName] = useState('')
  const [camera, setCamera] = useState(true)
  const [glyphIndex, setGlyphIndex] = useState(0)
  const [lang, setLang] = useState(getLocale())

  useEffect(() => {
    getScripts()
      .then(list => setGame(list.find(s => s.name === GAME) ?? FALLBACK))
      .catch(() => setGame(FALLBACK))
      .finally(() => setBooting(false))
  }, [])

  useEffect(() => {
    const id = setInterval(() => setGlyphIndex(i => (i + 1) % GLYPHS.length), 5000)
    return () => clearInterval(id)
  }, [])

  const openDialog = () => { unlockAudio(); setDialogOpen(true) }
  const closeDialog = () => { setDialogOpen(false); setUserName(''); setCamera(true) }

  const start = () => {
    const g = game ?? FALLBACK
    if (userName.trim()) onPick(g.name, g.version, g.tags, userName.trim(), camera)
  }

  const Glyph = GLYPHS[glyphIndex]

  return (
    <div className={styles.root}>
      <button className={styles.infoBtn} onClick={() => setInfoOpen(true)} aria-label={t('About')}>
        <InfoCircle size={22} color={HEX.fg} />
      </button>

      <button className={styles.langBtn} onClick={() => setLang(toggleLocale())} aria-label={t('Language')}>
        {lang === 'en' ? 'DE' : 'EN'}
      </button>

      <motion.div
        className={styles.hero}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
      >
        <motion.div
          className={styles.glyph}
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
        >
          <AnimatePresence mode="wait">
            <motion.span
              key={glyphIndex}
              style={{ display: 'flex' }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
            >
              <Glyph size={64} appearance="palette" />
            </motion.span>
          </AnimatePresence>
        </motion.div>

        <h1 className={styles.wordmark}>
          <span className={`${styles.wordmarkLine} ${styles.wordmarkBold}`}>social</span>
          <span className={styles.wordmarkLine}>_game</span>
        </h1>
      </motion.div>

      <motion.button
        className={`${btn.btnPrimary} ${styles.play}`}
        onClick={openDialog}
        disabled={booting}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.12, duration: 0.16, ease: 'easeOut' }}
      >
        <Play size={22} color={HEX.ink} />
        {booting ? t('waking up…') : t('Play')}
      </motion.button>

      <Modal open={dialogOpen} onBackdropClick={closeDialog} animate>
        <span className={styles.dialogLabel}>{t('what should we call you?')}</span>
        <input
          className={styles.nameInput}
          type="text"
          placeholder={t('your name')}
          value={userName}
          autoFocus
          maxLength={80}
          onChange={e => setUserName(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') start() }}
        />

        <button
          className={`${styles.consent} ${camera ? styles.consentOn : ''}`}
          onClick={() => setCamera(c => !c)}
          type="button"
        >
          <span className={`${styles.consentIcon} ${!camera ? styles.consentIconOff : ''}`}>
            <Camera width={22} height={22} />
          </span>
          <span className={styles.consentText}>
            <span className={styles.consentTitle}>{camera ? t('Filming on') : t('Filming off')}</span>
          </span>
          <span className={`${styles.switch} ${camera ? styles.switchOn : ''}`}><span className={styles.knob} /></span>
        </button>

        <button className={`${btn.btnPrimary} ${styles.startBtn}`} disabled={!userName.trim()} onClick={start}>
          {t('Let\'s play')}
        </button>
      </Modal>

      <InfoOverlay open={infoOpen} onClose={() => setInfoOpen(false)} />
    </div>
  )
}
