import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Star, HEX } from '../icons'
import confetti from 'canvas-confetti'
import type { LogEntry } from '../types'
import { playFinish } from '../utils/sfx'
import { t } from '../i18n/strings'
import { downloadLog, safeName } from '../utils/downloadLog'
import { downloadZip } from '../utils/downloadZip'
import btn from '../styles/buttons.module.css'
import styles from './DoneScreen.module.css'

const CONFETTI_COLORS = ['#ffdd00', '#ffffff', '#ff3d9a', '#21e6d6', '#8bff77']

interface Props {
  userName: string
  script: string
  version: string
  tags: string[]
  answers: string[]
  seed: number
  cameraOn: boolean
  log: LogEntry[]
  clips: Blob[]
  onRestart: () => void
}

export default function DoneScreen({ userName, script, version, tags, answers, seed, cameraOn, log, clips, onRestart }: Props) {
  const dateStr = new Date(log.find(e => e.type === 'start')?.timestamp ?? Date.now()).toISOString().slice(0, 10)
  const [debugOpen, setDebugOpen] = useState(false)

  // Peak-end: a little fanfare + confetti the moment we land here.
  useEffect(() => {
    playFinish()
    const opts = { colors: CONFETTI_COLORS, shapes: ['square' as const], scalar: 1.3, ticks: 260 }
    confetti({ ...opts, particleCount: 90, spread: 72, origin: { y: 0.55 } })
    const t = setTimeout(() => confetti({ ...opts, particleCount: 60, spread: 110, startVelocity: 45, origin: { y: 0.5 } }), 260)
    return () => clearTimeout(t)
  }, [])

  // One object URL per clip; revoke them when the screen goes away. A run yields more than
  // one clip only when it was interrupted (one per segment between interruptions).
  const urls = useMemo(() => clips.map(c => URL.createObjectURL(c)), [clips])
  useEffect(() => () => urls.forEach(u => URL.revokeObjectURL(u)), [urls])

  const downloadVideo = (blob: Blob, url: string, index: number) => {
    const ext = blob.type.includes('mp4') ? 'mp4' : 'webm'
    const suffix = clips.length > 1 ? `_${index + 1}` : ''
    const a = document.createElement('a')
    a.href = url
    a.download = `video_${safeName(script)}_${safeName(userName)}_${dateStr}${suffix}.${ext}`
    a.click()
  }

  return (
    <div className={styles.root}>
      <motion.div
        className={styles.glyph}
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.2, ease: [0.2, 0.9, 0.3, 1] }}
      >
        <Star size={56} color={HEX.accent} />
      </motion.div>
      <motion.h1
        className={styles.message}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.14 }}
      >
        {t('Game over!')}
      </motion.h1>

      <div className={styles.actions}>
        {clips.length > 0 ? (
          <>
            <div className={styles.zipRow}>
              <button
                className={btn.btnPrimary}
                onClick={() => downloadZip({ userName, script, version, tags, answers, seed, cameraOn, log, clips })}
              >
                {t('Download ZIP')}
              </button>
              <button
                className={styles.debugToggle}
                onClick={() => setDebugOpen(v => !v)}
                aria-label={t('Show debug downloads')}
              >
                {debugOpen ? '▴' : '▾'}
              </button>
            </div>
            {debugOpen && (
              <>
                <button
                  className={btn.btnSecondary}
                  onClick={() => downloadLog({ userName, script, version, tags, answers, seed, cameraOn, log })}
                >
                  {t('Download Log')}
                </button>
                {urls.map((url, i) => (
                  <button key={url} className={btn.btnSecondary} onClick={() => downloadVideo(clips[i], url, i)}>
                    {clips.length > 1 ? t('Download Video {n}', { n: i + 1 }) : t('Download Video')}
                  </button>
                ))}
              </>
            )}
          </>
        ) : (
          <button
            className={btn.btnPrimary}
            onClick={() => downloadLog({ userName, script, version, tags, answers, seed, cameraOn, log })}
          >
            {t('Download Log')}
          </button>
        )}
        <button className={btn.btnSecondary} onClick={onRestart}>
          {t('Play again')}
        </button>
      </div>
    </div>
  )
}
