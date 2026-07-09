// Video view — passive mirror. Polls /api/state and syncs two video channels
// (frontcam + outside camera) to match the code view's playback.

import { pollState } from './sync.js'

let meta = {}               // id → list entry ({ video, video_offset, video_outside, video_outside_offset })

function createChannel(videoEl) {
  let lastSyncTime = null
  let lastSyncWall = 0
  let lastSyncPlaying = false
  let loadedUrl = null

  function load(url) {
    if (url === loadedUrl) return
    loadedUrl = url
    lastSyncTime = null
    videoEl.pause()
    videoEl.src = url
  }

  function clear() {
    loadedUrl = null
    lastSyncTime = null
    videoEl.pause()
    videoEl.removeAttribute('src')
  }

  function sync(target, playing) {
    const notStarted = target < 0
    if (notStarted) {
      if (!videoEl.paused) videoEl.pause()
      if (videoEl.currentTime > 0.05) videoEl.currentTime = 0
      lastSyncTime = null
      return notStarted
    }

    const clamped = Math.max(0, target)
    if (playing && videoEl.paused) videoEl.play().catch(() => {})
    if (!playing && !videoEl.paused) videoEl.pause()

    const now = performance.now()
    const expected = lastSyncTime === null ? clamped : lastSyncTime + (lastSyncPlaying ? (now - lastSyncWall) / 1000 : 0)
    const isContinuous = lastSyncTime !== null && Math.abs(clamped - expected) < 1.0

    if (!isContinuous || Math.abs(videoEl.currentTime - clamped) > 5) {
      videoEl.currentTime = clamped
    }

    lastSyncTime = clamped
    lastSyncWall = now
    lastSyncPlaying = playing
    return notStarted
  }

  return { load, clear, sync }
}

const frontVideoEl = document.getElementById('video-front')
const outsideVideoEl = document.getElementById('video-outside')
const emptyOverlay = document.getElementById('empty-overlay')
const waitingOverlay = document.getElementById('waiting-overlay')
const interstitialOverlay = document.getElementById('interstitial')

const frontChannel = createChannel(frontVideoEl)
const outsideChannel = createChannel(outsideVideoEl)

document.addEventListener('pointerdown', () => { frontVideoEl.muted = false }, { once: true })

function apply(s) {
  // Interstitial mode: show title card, pause videos
  if (s.next) {
    interstitialOverlay.hidden = false
    document.getElementById('interstitial-script').textContent = s.next.userName || s.next.script
    document.getElementById('interstitial-meta').textContent = s.next.date || ''
    frontChannel.clear()
    outsideChannel.clear()
    emptyOverlay.hidden = true
    waitingOverlay.hidden = true
    return
  }

  interstitialOverlay.hidden = true

  // No execution selected: show empty state
  if (!s.execution) {
    emptyOverlay.hidden = false
    waitingOverlay.hidden = true
    frontChannel.clear()
    outsideChannel.clear()
    return
  }

  emptyOverlay.hidden = true

  const m = meta[s.execution]
  if (!m) {
    waitingOverlay.hidden = false
    return
  }

  // Load/update videos
  if (m.video) {
    frontChannel.load(`/executions/${s.execution}/${m.video}`)
  } else {
    frontChannel.clear()
  }

  if (m.video_outside) {
    outsideChannel.load(`/executions/${s.execution}/${m.video_outside}`)
  } else {
    outsideChannel.clear()
  }

  // Toggle layout class
  document.body.classList.toggle('has-outside', !!m.video_outside)

  // Sync both channels
  const frontNotStarted = frontChannel.sync(s.time - (m.video_offset || 0), s.playing)
  const outsideNotStarted = outsideChannel.sync(s.time - (m.video_outside_offset || 0), s.playing)

  // Show waiting overlay if the primary (full-bleed) channel hasn't started yet
  const primaryNotStarted = m.video_outside ? outsideNotStarted : frontNotStarted
  waitingOverlay.hidden = !primaryNotStarted
}

async function main() {
  try {
    const list = await (await fetch('/api/executions')).json()
    meta = Object.fromEntries(list.map(e => [e.id, e]))
  } catch { /* without the map we can't resolve video files */ }

  pollState(apply)
}

main()
