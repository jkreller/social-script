import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Heart, Lightning, Flame, Star, Gem, ExplosionBurst, GlowPulse, FlagEnglish, FlagGerman } from '../icons'
import RevealText, { type RevealTextHandle } from '../components/RevealText'
import YesNoInput from '../inputs/YesNoInput'
import ScaleInput from '../inputs/ScaleInput'
import TextInput from '../inputs/TextInput'
import { t } from '../i18n/strings'
import { setLocale } from '../utils/locale'
import { createTeaserRun, updateTeaserRun } from '../teaserApi'
import type { Prompt } from '../types'
import styles from './TeaserScreen.module.css'

const GLYPHS = [Star, Gem, ExplosionBurst, Heart, Lightning, Flame, GlowPulse]

type StepId =
  | 'intro' | 'opinion' | 'tellInPerson' | 'afraidScale'
  | 'hintPeace' | 'approachNow' | 'success' | 'notToday' | 'goodbye'

type Step =
  | { kind: 'message'; lines: string[]; next: StepId | null }
  | { kind: 'input'; prompt: Prompt; yesLabel?: string; noLabel?: string; onValue: (value: string) => StepId }

const basePrompt = { headline: null, choices: null, phase: 0, phase_title: null, phase_description: null }

// Rebuilt on every render so a language switch (see below) immediately
// re-translates every step, not just the ones rendered so far.
function buildSteps(): Record<StepId, Step> {
  return {
    intro: {
      kind: 'message',
      lines: [t('Thank you for scanning!'), t("Can I ask you a question?")],
      next: 'opinion',
    },
    opinion: {
      kind: 'input',
      prompt: {
        ...basePrompt,
        text: t('Tell me something about yourself, something you would normally not tell a stranger!'),
        input_type: 'long_text',
        placeholder: t('Something you\'re thinking about, a struggle of yours or your greatest passion...'),
      },
      onValue: () => 'tellInPerson',
    },
    tellInPerson: {
      kind: 'input',
      prompt: { ...basePrompt, text: t('Thank you!\nWould you like to tell me what you wrote in person?'), input_type: 'yn' },
      onValue: value => (value === 'y' ? 'afraidScale' : 'goodbye'),
    },
    afraidScale: {
      kind: 'input',
      prompt: { ...basePrompt, text: t('How afraid of approaching are you?'), input_type: 'scale' },
      onValue: value => (Number(value) > 5 ? 'hintPeace' : 'approachNow'),
    },
    hintPeace: {
      kind: 'input',
      prompt: { ...basePrompt, text: t('No worries! Just give me a hint by showing a peace sign (✌️) to me.'), input_type: 'yn' },
      yesLabel: t('Reacted'),
      noLabel: t("Didn't react"),
      onValue: value => (value === 'y' ? 'success' : 'notToday'),
    },
    approachNow: {
      kind: 'input',
      prompt: { ...basePrompt, text: t('Super, approach me and tell me about it!'), input_type: 'yn' },
      yesLabel: t('Done'),
      noLabel: t("Didn't work"),
      onValue: value => (value === 'y' ? 'success' : 'notToday'),
    },
    success: {
      kind: 'message',
      lines: [t('Cool! Thanks for reaching out!')],
      next: null,
    },
    notToday: {
      kind: 'message',
      lines: [t("Oh, well, maybe today's not the day."), t('Anyways, thank you for taking part!')],
      next: null,
    },
    goodbye: {
      kind: 'message',
      lines: [t('Alright, thank you for your answer!'), t('See you!')],
      next: null,
    },
  }
}

// Hidden QR-code teaser (see main.tsx) — a small branching conversation, fully
// separate from the Home/Runner state machine; nothing here touches the script
// engine. Defaults to German regardless of any locale saved from the main app,
// with an escape hatch to switch to English.
export default function TeaserScreen() {
  const [lang, setLang] = useState<'de' | 'en'>('de')
  setLocale(lang)
  const [stepId, setStepId] = useState<StepId>('intro')
  const [glyphIndex, setGlyphIndex] = useState(0)
  const [textExpanded, setTextExpanded] = useState(false)
  const revealTextRef = useRef<RevealTextHandle>(null)
  // Run persistence (see teaserApi.ts): created the moment the screen mounts, so
  // even a visitor who never answers anything is still counted, then patched
  // with the opinion (once answered) and the decision log so far after every
  // subsequent answer — so a bail-out anywhere in the flow still leaves whatever
  // was answered up to that point. Refs, not state — nothing in this component's
  // JSX needs to re-render off them.
  const runPromiseRef = useRef<Promise<{ id: number } | null> | null>(null)
  const decisionLogRef = useRef<{ step: StepId; value: string }[]>([])
  // Patches must reach the server in the order they were made (and only once the
  // row exists) — chaining onto this ref serializes them instead of racing.
  const patchChainRef = useRef<Promise<void>>(Promise.resolve())
  // Memoized so glyphIndex's 5s tick (which re-renders this component but doesn't
  // change the language) doesn't hand RevealText a new `lines` array reference on
  // every tick — that was resetting its reveal-so-far state and looping the text.
  const STEPS = useMemo(() => buildSteps(), [lang])
  const step = STEPS[stepId]

  useEffect(() => {
    const id = setInterval(() => setGlyphIndex(i => (i + 1) % GLYPHS.length), 5000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    runPromiseRef.current = createTeaserRun().catch(err => {
      console.error('Failed to save teaser run', err)
      return null
    })
  }, [])

  // A fresh step starts un-expanded — TextInput will report back in if its field
  // grows enough to change that.
  useEffect(() => { setTextExpanded(false) }, [stepId])

  const Glyph = GLYPHS[glyphIndex]
  // ScaleInput/YesNoInput fill the whole screen by design (slider, tap zones) —
  // the glyph has no good place to sit above them, so only show it above the
  // message/text steps, which stay a compact centered block. Same reasoning once
  // a long_text field has grown enough to fill the screen itself.
  const showGlyph = !textExpanded && (step.kind === 'message' || step.prompt.input_type === 'text' || step.prompt.input_type === 'long_text')

  const handleSubmit = (value: string) => {
    if (step.kind !== 'input') return
    decisionLogRef.current.push({ step: stepId, value })
    const patch = { opinion: stepId === 'opinion' ? value : undefined, decisionLog: [...decisionLogRef.current] }
    patchChainRef.current = patchChainRef.current
      .then(() => runPromiseRef.current)
      .then(created => { if (created) return updateTeaserRun(created.id, patch) })
      .catch(err => console.error('Failed to save teaser run', err))
    setStepId(step.onValue(value))
  }

  return (
    <div className={styles.root}>
      {/* Pinned to the physical top of the screen — unlike the glyph below, this
          isn't part of the centered content group, since it's chrome (a settings
          toggle), not part of the conversation. */}
      {lang === 'de' ? (
        <button className={styles.langBtn} onClick={() => setLang('en')}>
          <FlagEnglish size={20} appearance="palette" />
        </button>
      ) : (
        <button className={styles.langBtn} onClick={() => setLang('de')}>
          <FlagGerman size={20} appearance="palette" />
        </button>
      )}

      <div className={styles.stage}>
        <motion.div
          key={stepId}
          className={styles.stageInner}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.14, ease: 'easeOut' }}
          // RevealText's own box is content-sized, not full-screen, so the tap-to-
          // continue affordance has to be caught up here to cover the whole screen.
          onPointerDown={() => { if (step.kind === 'message') revealTextRef.current?.tap() }}
        >
          {/* Always rendered (not conditionally) so the reserved header space — and
              thus the clearance below the fixed langBtn — stays consistent whether
              or not the glyph itself is shown; only its visibility toggles below. */}
          <div className={styles.logoBar}>
            {showGlyph && (
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
            )}
          </div>

          {step.kind === 'message' ? (
            <RevealText ref={revealTextRef} lines={step.lines} onAdvance={step.next ? () => setStepId(step.next!) : undefined} />
          ) : (
            <>
              {step.prompt.input_type === 'yn' && (
                <YesNoInput prompt={step.prompt} onSubmit={handleSubmit} yesLabel={step.yesLabel} noLabel={step.noLabel} />
              )}
              {step.prompt.input_type === 'scale' && <ScaleInput prompt={step.prompt} onSubmit={handleSubmit} />}
              {(step.prompt.input_type === 'text' || step.prompt.input_type === 'long_text') && (
                <TextInput prompt={step.prompt} onSubmit={handleSubmit} onExpandedChange={setTextExpanded} />
              )}
            </>
          )}
        </motion.div>
      </div>
    </div>
  )
}
