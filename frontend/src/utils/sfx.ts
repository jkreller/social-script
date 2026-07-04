// Tiny retro chiptune cues, synthesized with the Web Audio API — no assets, no library,
// works offline by definition. Square/pulse waves for an 8-bit feel. Playback is independent
// of the camera's mic capture, so these don't disturb MediaRecorder (they're just audibly
// caught in the recording, which is a nice bonus for the art-piece footage).

const MUTE_KEY = 'sfx_muted'

let ctx: AudioContext | null = null
let muted = (() => { try { return localStorage.getItem(MUTE_KEY) === '1' } catch { return false } })()

function ac(): AudioContext | null {
  if (!ctx) {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AC) return null
    ctx = new AC()
  }
  return ctx
}

// iOS/Safari keep the AudioContext suspended until a user gesture. Call on any tap.
export function unlockAudio(): void {
  const c = ac()
  if (c && c.state === 'suspended') c.resume().catch(() => {})
}

export function isMuted(): boolean { return muted }

export function setMuted(v: boolean): void {
  muted = v
  try { localStorage.setItem(MUTE_KEY, v ? '1' : '0') } catch { /* ignore */ }
  if (!v) unlockAudio()
}

export function toggleMuted(): boolean { setMuted(!muted); return muted }

// One 8-bit "voice": a square-wave note with a fast attack and a gated decay.
function blip(c: AudioContext, freq: number, at: number, dur: number, gain = 0.08, type: OscillatorType = 'square'): void {
  const osc = c.createOscillator()
  const g = c.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, at)
  g.gain.setValueAtTime(0.0001, at)
  g.gain.exponentialRampToValueAtTime(gain, at + 0.006)
  g.gain.setValueAtTime(gain, at + dur * 0.6)
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur)
  osc.connect(g).connect(c.destination)
  osc.start(at)
  osc.stop(at + dur + 0.02)
}

function ready(): { c: AudioContext; now: number } | null {
  if (muted) return null
  const c = ac()
  if (!c) return null
  if (c.state === 'suspended') c.resume().catch(() => {})
  return { c, now: c.currentTime + 0.01 }
}

// Phase change — a fast ascending "level-up" square arpeggio.
export function playPhase(): void {
  const r = ready()
  if (!r) return
  const { c, now } = r
  const notes = [523.25, 659.25, 783.99, 1046.5, 1318.51]  // C5 E5 G5 C6 E6
  notes.forEach((f, i) => blip(c, f, now + i * 0.055, 0.11, 0.08))
  blip(c, 1567.98, now + notes.length * 0.055, 0.22, 0.06)  // little sparkle on top
}

// Every "yes" answer — a bright two-note "coin" ping. The app can't know when a stranger
// is actually won over, so this fires on any yes/no prompt answered "y" — a cheap, frequent
// little reward rather than a rare celebration.
export function playYes(): void {
  const r = ready()
  if (!r) return
  const { c, now } = r
  blip(c, 1318.51, now, 0.05, 0.09)          // E6
  blip(c, 1975.53, now + 0.045, 0.12, 0.09)  // B6
}

// Person / device hand-off — a quick two-note "select" blip.
export function playPass(): void {
  const r = ready()
  if (!r) return
  const { c, now } = r
  blip(c, 783.99, now, 0.06, 0.07)          // G5
  blip(c, 1046.5, now + 0.05, 0.08, 0.07)   // C6
}

// Finish — a short NES-style victory jingle (triad run into a held chord).
export function playFinish(): void {
  const r = ready()
  if (!r) return
  const { c, now } = r
  blip(c, 523.25, now + 0.00, 0.12, 0.08)   // C5
  blip(c, 659.25, now + 0.11, 0.12, 0.08)   // E5
  blip(c, 783.99, now + 0.22, 0.12, 0.08)   // G5
  blip(c, 1046.5, now + 0.33, 0.16, 0.09)   // C6
  const land = now + 0.52
  blip(c, 1046.5, land, 0.55, 0.08)          // C6  ┐
  blip(c, 1318.51, land, 0.55, 0.07)         // E6  ├ held major chord
  blip(c, 1567.98, land, 0.55, 0.06)         // G6  ┘
  blip(c, 783.99, land, 0.55, 0.05, 'triangle') // soft bass under the chord
}
