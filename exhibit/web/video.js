// Video view — passive mirror. Polls /api/state and makes the <video> follow
// whatever the code view (master) is doing: same execution, time, play/pause.
//
// The video is muted from the start so it can always autoplay without a user
// gesture — the video device has no controls of its own, so playback must never
// be gated on someone tapping it. A dismissible overlay offers to unmute.

import { pollState } from './sync.js'

let meta = {}               // id → list entry ({ video, video_offset })
let currentExecution = null
let lastSyncTime = null     // target time from the last apply() call, or null
let lastSyncWall = 0        // performance.now() at the last apply() call
let lastSyncPlaying = false // whether the video was playing at the last apply()

let currentAbort = null     // AbortController for in-flight download, or null
let currentObjectUrl = null // revoke when done or superseded

const INITIAL_CHUNK_SIZE = 2 * 1024 * 1024  // ~2MB to cover ftyp+moov

const videoEl = document.getElementById('video')
const emptyOverlay = document.getElementById('empty-overlay')
const waitingOverlay = document.getElementById('waiting-overlay')
const loadingOverlay = document.getElementById('loading-overlay')
const muteOverlay = document.getElementById('mute-overlay')

muteOverlay.addEventListener('click', () => {
  videoEl.muted = false
  muteOverlay.hidden = true
})

function loadVideo(execId, url) {
  // Abort any in-flight download for a previous execution.
  if (currentAbort) {
    currentAbort.abort()
  }
  currentAbort = new AbortController()
  const localAbort = currentAbort

  // Clean up old blob URL if present.
  if (currentObjectUrl) {
    URL.revokeObjectURL(currentObjectUrl)
    currentObjectUrl = null
  }

  loadingOverlay.hidden = false

  fetch(url, { signal: localAbort.signal })
    .then(async response => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`)

      const reader = response.body.getReader()
      const chunks = []
      let totalSize = 0
      let initialChunkPlayed = false

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        chunks.push(value)
        totalSize += value.length

        // Once we've accumulated enough data (~2MB), build a blob and play.
        if (!initialChunkPlayed && totalSize >= INITIAL_CHUNK_SIZE) {
          if (localAbort === currentAbort) {
            const partialBlob = new Blob(chunks, { type: 'video/mp4' })
            const objectUrl = URL.createObjectURL(partialBlob)
            currentObjectUrl = objectUrl
            videoEl.src = objectUrl
            loadingOverlay.hidden = true

            if (videoEl.paused && lastSyncPlaying) {
              videoEl.play().catch(() => {})
            }
            initialChunkPlayed = true
          }
        }
      }

      // Download complete. Build the full blob and swap if not superseded.
      if (localAbort === currentAbort && initialChunkPlayed) {
        const savedTime = videoEl.currentTime
        const wasPaused = videoEl.paused

        const fullBlob = new Blob(chunks, { type: 'video/mp4' })
        const newObjectUrl = URL.createObjectURL(fullBlob)

        URL.revokeObjectURL(currentObjectUrl)
        videoEl.src = newObjectUrl
        currentObjectUrl = newObjectUrl
        videoEl.currentTime = savedTime

        if (!wasPaused) {
          videoEl.play().catch(() => {})
        }
      }
    })
    .catch(err => {
      if (err.name !== 'AbortError' && localAbort === currentAbort) {
        loadingOverlay.hidden = true
        const msg = document.createElement('div')
        msg.id = 'error-overlay'
        msg.className = 'overlay'
        msg.style.zIndex = '40'
        msg.textContent = `Error loading video: ${err.message}`
        document.body.appendChild(msg)

        setTimeout(() => {
          msg.remove()
        }, 3000)
      }
    })
}

function apply(s) {
  if (!s.execution) {
    currentExecution = null
    lastSyncTime = null
    videoEl.pause()
    videoEl.removeAttribute('src')
    if (currentAbort) {
      currentAbort.abort()
      currentAbort = null
    }
    if (currentObjectUrl) {
      URL.revokeObjectURL(currentObjectUrl)
      currentObjectUrl = null
    }
    emptyOverlay.hidden = false
    waitingOverlay.hidden = true
    loadingOverlay.hidden = true
    muteOverlay.hidden = true
    return
  }
  emptyOverlay.hidden = true

  if (s.execution !== currentExecution) {
    lastSyncTime = null
    currentExecution = s.execution
    videoEl.pause()
    videoEl.currentTime = 0
    const m = meta[s.execution]
    if (m && m.video) {
      loadVideo(s.execution, `/executions/${s.execution}/${m.video}`)
    }
  }

  if (!videoEl.src) return

  const offset = meta[s.execution]?.video_offset || 0
  const target = s.time - offset          // not clamped: negative means "not started yet"
  const notStarted = target < 0

  waitingOverlay.hidden = !notStarted
  if (!notStarted && loadingOverlay.hidden === false) {
    // Still loading the initial chunk, don't show mute overlay yet
    muteOverlay.hidden = true
  } else {
    muteOverlay.hidden = notStarted || !videoEl.muted
  }

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

  // Smart discontinuity detection: distinguish real jumps (step, scrub, switch)
  // from natural clock drift during continuous playback. Only seek on jumps,
  // not on drift—older devices glitch the decoder with unnecessary seeks.
  const now = performance.now()
  const expected = lastSyncTime === null ? clamped : lastSyncTime + (lastSyncPlaying ? (now - lastSyncWall) / 1000 : 0)
  const isContinuous = lastSyncTime !== null && Math.abs(clamped - expected) < 0.3

  if (!isContinuous) {
    // A real jump (step, scrub, switch) or the very first sync after load.
    videoEl.currentTime = clamped
  } else if (Math.abs(videoEl.currentTime - clamped) > 2) {
    // Safety net: raw drift exceeded 2s (shouldn't happen in normal operation).
    videoEl.currentTime = clamped
  }

  lastSyncTime = clamped
  lastSyncWall = now
  lastSyncPlaying = s.playing
}

async function main() {
  try {
    const list = await (await fetch('/api/executions')).json()
    meta = Object.fromEntries(list.map(e => [e.id, e]))
  } catch { /* without the map we can't resolve video files */ }

  pollState(apply)
}

main()
