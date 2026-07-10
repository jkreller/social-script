import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronRight, Mail, Instagram, Pin, Heart, Lightning, Flame, Star, Gem, ExplosionBurst, GlowPulse } from '../icons'
import styles from './TeaserScreen.module.css'

// TODO: replace with the real contact channels before printing the QR code.
const EMAIL = 'julian.kreller@uni-weimar.de'
const INSTAGRAM_URL = 'https://instagram.com/ju.krel'
const MAPS_URL = 'https://www.google.com/maps/search/?api=1&query=Sendehalle+Humboldtstra%C3%9Fe+36A+Weimar'

// Same cycling hero glyph as HomeScreen, so the icon hovering at the top of the
// teaser matches the app it's teasing.
const GLYPHS = [Heart, Lightning, Flame, Star, Gem, ExplosionBurst, GlowPulse]

type Run = { text: string; highlight?: boolean }
type Line = { kind: 'text'; runs: Run[] } | { kind: 'mail' } | { kind: 'instagram' } | { kind: 'location' }

// Splits `<...>` markup out of a copy line into plain/highlighted runs, so the
// PAGES list below can stay close to the original wording.
function line(text: string): Line {
  const runs: Run[] = []
  const re = /<([^<>]+)>/g
  let lastIndex = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(text))) {
    if (m.index > lastIndex) runs.push({ text: text.slice(lastIndex, m.index) })
    runs.push({ text: m[1], highlight: true })
    lastIndex = re.lastIndex
  }
  if (lastIndex < text.length) runs.push({ text: text.slice(lastIndex) })
  return { kind: 'text', runs }
}

// One entry per page (a blank-line-separated paragraph in the source copy). Lines
// within a page reveal one at a time, 2s apart.
const PAGES: Line[][] = [
  [
    line('Yay, you scanned me!'),
    line('<Great!>'),
  ],
  [
    line('If you feel confident enough just <approach me> and ask what this is about!'),
    line('I’m up for it!'),
  ],
  [
    line('Otherwise here comes an <explanation> and then you can decide to approach digitally…'),
  ],
  [
    line('This is an <art project> exhibited at Summaery 2026.'),
    line('The idea is to <program people> in social situations.'),
    line('(yes, programming like you would normally program <computers>)'),
  ],
  [
    line('It’s working through a <story telling game>.'),
    line('You and other people get to know each other, make up story elements and write a story.'),
    line('I hope it’s <fun> but maybe it’s still a bit <messy>.'),
  ],
  [
    line('Anyways… <Let’s try it out!>'),
    line('<Approach> me here:'),
    { kind: 'mail' },
    { kind: 'instagram' },
    line('Or watch how <other people> were programmed at:'),
    { kind: 'location' },
  ],
]

function renderLine(l: Line) {
  if (l.kind === 'mail') {
    return (
      <a className={styles.link} href={`mailto:${EMAIL}`} onPointerDown={e => e.stopPropagation()}>
        <span className={styles.linkIcon}><Mail size={56} appearance="palette" /></span>
      </a>
    )
  }
  if (l.kind === 'instagram') {
    return (
      <a className={styles.link} href={INSTAGRAM_URL} target="_blank" rel="noreferrer" onPointerDown={e => e.stopPropagation()}>
        <span className={styles.linkIcon}><Instagram size={56} appearance="palette" /></span>
      </a>
    )
  }
  if (l.kind === 'location') {
    return (
      <a className={styles.link} href={MAPS_URL} target="_blank" rel="noreferrer" onPointerDown={e => e.stopPropagation()}>
        <span className={styles.linkIcon}><Pin size={56} appearance="palette" /></span>
        <span className={styles.linkLabel}>Sendehalle, Humboldtstraße 36A</span>
      </a>
    )
  }
  return l.runs.map((run, i) => (run.highlight ? <span key={i} className={styles.highlight}>{run.text}</span> : run.text))
}

// Hidden QR-code teaser (see main.tsx) — plays the intro copy back as a slow, tappable
// reveal, then hands off to email/Instagram on the last page. Fully separate from the
// Home/Runner state machine; nothing here touches localStorage or the script engine.
export default function TeaserScreen() {
  const [pageIndex, setPageIndex] = useState(0)
  const [revealedCount, setRevealedCount] = useState(0)
  const [glyphIndex, setGlyphIndex] = useState(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const page = PAGES[pageIndex]
  const isLastPage = pageIndex === PAGES.length - 1
  const fullyRevealed = revealedCount >= page.length
  const Glyph = GLYPHS[glyphIndex]

  useEffect(() => {
    const id = setInterval(() => setGlyphIndex(i => (i + 1) % GLYPHS.length), 5000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    setRevealedCount(1)
    if (page.length > 1) {
      intervalRef.current = setInterval(() => {
        setRevealedCount(n => {
          const next = n + 1
          if (next >= page.length && intervalRef.current) {
            clearInterval(intervalRef.current)
            intervalRef.current = null
          }
          return next
        })
      }, 2000)
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [pageIndex])

  const handleTap = () => {
    if (revealedCount < page.length) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      setRevealedCount(page.length)
      return
    }
    if (!isLastPage) setPageIndex(i => i + 1)
  }

  return (
    <div className={styles.root} onPointerDown={handleTap}>
      <motion.div
        className={styles.logo}
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
            <Glyph size={48} appearance="palette" />
          </motion.span>
        </AnimatePresence>
      </motion.div>
      <div className={styles.lines}>
        {page.slice(0, revealedCount).map((l, i) => (
          <motion.p
            key={`${pageIndex}-${i}`}
            className={styles.line}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.14, ease: 'easeOut' }}
          >
            {renderLine(l)}
          </motion.p>
        ))}
      </div>
      {fullyRevealed && !isLastPage && (
        <motion.span
          className={styles.hint}
          animate={{ y: [0, 6, 0] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
        >
          tap to continue <ChevronRight width={16} height={16} />
        </motion.span>
      )}
    </div>
  )
}
