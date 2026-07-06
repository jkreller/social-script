// Video view — passive mirror. Polls /api/state and makes the <video> follow
// whatever the code view (master) is doing: same execution, time, play/pause.
//
// The video is muted from the start so it can always autoplay without a user
// gesture — the video device has no controls of its own, so playback must never
// be gated on someone tapping it. A dismissible overlay offers to unmute.
//
// Videos are pre-downloaded into memory (Blob) before playback to avoid
// sustained network streaming: corrective seeks on a network source require
// round-trip HTTP range requests that can cascade into stutter on devices with
// high-latency or flaky Wi-Fi. Once loaded, seeks are instant and local.

import { pollState } from './sync.js'

let meta = {}               // id → list entry ({ video, video_offset })
let currentExecution = null
let currentAbort = null     // AbortController for in-flight fetch, or null
let currentObjectUrl = null // current video blob object URL, or null

const videoEl = document.getElementById('video')
const emptyOverlay = document.getElementById('empty-overlay')
const loadingOverlay = document.getElementById('loading-overlay')
const loadingPct = document.getElementById('loading-pct')
const waitingOverlay = document.getElementById('waiting-overlay')
const muteOverlay = document.getElementById('mute-overlay')

muteOverlay.addEventListener('click', () => {
  videoEl.muted = false
  muteOverlay.hidden = true
})

function setLoadingText(fraction) {
  loadingPct.textContent = fraction == null ? '' : `${Math.round(fraction * 100)}%`
}

// Downloads the entire video file into a Blob, then makes videoEl.src
// point to it via Object URL. Prevents stutter from seeking on network-
// streamed sources with high-latency round-trips.
async function loadVideo(execId, url) {
  const controller = new AbortController()
  currentAbort = controller

  loadingOverlay.hidden = false
  waitingOverlay.hidden = true
  muteOverlay.hidden = true
  setLoadingText(0)

  try {
    const res = await fetch(url, { signal: controller.signal })
    const total = Number(res.headers.get('content-length')) || null
    const reader = res.body.getReader()
    const chunks = []
    let received = 0
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      chunks.push(value)
      received += value.length
      setLoadingText(total ? received / total : null)
    }

    // Discard result if this download was superseded by a newer selection.
    if (execId !== currentExecution) return

    const blob = new Blob(chunks, { type: res.headers.get('content-type') || 'video/mp4' })
    const objectUrl = URL.createObjectURL(blob)
    currentObjectUrl = objectUrl
    videoEl.src = objectUrl
    videoEl.currentTime = 0
    loadingOverlay.hidden = true
  } catch (err) {
    if (err.name === 'AbortError') return  // cancelled by a newer selection
    setLoadingText(null)
    loadingOverlay.textContent = 'Video failed to load — reselect the execution'
  } finally {
    if (currentAbort === controller) currentAbort = null
  }
}

function apply(s) {
  if (!s.execution) {
    currentExecution = null
    if (currentAbort) { currentAbort.abort(); currentAbort = null }
    if (currentObjectUrl) { URL.revokeObjectURL(currentObjectUrl); currentObjectUrl = null }
    videoEl.pause()
    videoEl.removeAttribute('src')
    emptyOverlay.hidden = false
    loadingOverlay.hidden = true
    waitingOverlay.hidden = true
    muteOverlay.hidden = true
    return
  }
  emptyOverlay.hidden = true

  if (s.execution !== currentExecution) {
    if (currentAbort) { currentAbort.abort(); currentAbort = null }
    if (currentObjectUrl) { URL.revokeObjectURL(currentObjectUrl); currentObjectUrl = null }
    currentExecution = s.execution
    videoEl.pause()
    videoEl.removeAttribute('src')
    const m = meta[s.execution]
    if (m && m.video) loadVideo(s.execution, `/executions/${s.execution}/${m.video}`)
  }

  // While downloading or if download failed, don't attempt sync/play/seek.
  if (!videoEl.src) return

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
