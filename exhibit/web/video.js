// Video view — passive mirror. Polls /api/state and makes the <video> follow
// whatever the code view (master) is doing: same execution, time, play/pause.
//
// The video is muted from the start so it can always autoplay without a user
// gesture — the video device has no controls of its own, so playback must never
// be gated on someone tapping it. A dismissible overlay offers to unmute.

import { pollState } from './sync.js'

let meta = {}               // id → list entry ({ video, video_offset })
let currentExecution = null

const videoEl = document.getElementById('video')
const waitingOverlay = document.getElementById('waiting-overlay')
const muteOverlay = document.getElementById('mute-overlay')
const emptyOverlay = document.getElementById('empty-overlay')

muteOverlay.addEventListener('click', () => {
  videoEl.muted = false
  muteOverlay.hidden = true
})

function apply(s) {
  if (!s.execution) {
    currentExecution = null
    videoEl.pause()
    videoEl.removeAttribute('src')
    emptyOverlay.hidden = false
    waitingOverlay.hidden = true
    muteOverlay.hidden = true
    return
  }
  emptyOverlay.hidden = true

  if (s.execution !== currentExecution) {
    currentExecution = s.execution
    const m = meta[s.execution]
    videoEl.pause()
    if (m && m.video) videoEl.src = `/executions/${s.execution}/${m.video}`
    videoEl.currentTime = 0
  }

  const offset = meta[s.execution]?.video_offset || 0
  const target = s.time - offset          // not clamped: negative means "not started yet"
  const notStarted = target < 0

  waitingOverlay.hidden = !notStarted
  muteOverlay.hidden = notStarted || !videoEl.muted

  if (notStarted) {
    // The recording hasn't begun at this trace time — show the first frame,
    // paused, instead of playing and endlessly snapping back to 0.
    if (!videoEl.paused) videoEl.pause()
    if (videoEl.currentTime > 0.05) videoEl.currentTime = 0
    return
  }

  const clamped = Math.max(0, target)
  if (s.playing && videoEl.paused) videoEl.play().catch(() => {})
  if (!s.playing && !videoEl.paused) videoEl.pause()
  if (Math.abs(videoEl.currentTime - clamped) > 0.3) videoEl.currentTime = clamped
}

async function main() {
  try {
    const list = await (await fetch('/api/executions')).json()
    meta = Object.fromEntries(list.map(e => [e.id, e]))
  } catch { /* without the map we can't resolve video files */ }

  pollState(apply)
}

main()
