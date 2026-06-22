// Exhibit replay code-view — plain ES module, no build step.
//
// Driven by a single `currentTime` (seconds since log start).
// To wire up a <video> element later, replace the scrubber with:
//   video.addEventListener('timeupdate', () => setCurrentTime(video.currentTime))

// ──────────────────────────────────────────────────────────────────────────────
// State
// ──────────────────────────────────────────────────────────────────────────────

let log = null          // loaded log JSON { script, source, timed_trace }
let logDuration = 0     // seconds
let currentTime = 0         // seconds

let lineDivs = {}           // line number (1-based) → <div> element
let activeEl = null         // currently highlighted <div>
let prevFrameIdx = -1       // last frame index returned by findActiveFrame

let videoEl = null

let isPlaying = false
let playStartWall = 0       // performance.now() when play() was last called
let playOffset = 0          // currentTime when play() was last called
let rafId = null

// ──────────────────────────────────────────────────────────────────────────────
// Clock abstraction
// The only interface a <video> element needs to replace the scrubber:
//   video.addEventListener('timeupdate', () => setCurrentTime(video.currentTime))
// ──────────────────────────────────────────────────────────────────────────────

function setCurrentTime(t) {
  currentTime = Math.max(0, Math.min(t, logDuration))
  scrubberEl.value = currentTime
  timeDisplayEl.textContent = `${fmtTime(currentTime)} / ${fmtTime(logDuration)}`
  updateView()
  if (videoEl && Math.abs(videoEl.currentTime - currentTime) > 0.3)
    videoEl.currentTime = currentTime
}

// ──────────────────────────────────────────────────────────────────────────────
// Log loading
// ──────────────────────────────────────────────────────────────────────────────

async function loadLog(name) {
  const resp = await fetch(`logs-out/${name}.json`)
  if (!resp.ok) throw new Error(`Log "${name}" not found (${resp.status})`)
  return resp.json()
}

// ──────────────────────────────────────────────────────────────────────────────
// Source rendering
// ──────────────────────────────────────────────────────────────────────────────

function splitHighlightedLines(html) {
  const lines = []
  let current = '', openSpans = [], i = 0
  while (i < html.length) {
    if (html[i] === '\n') {
      lines.push(current + openSpans.map(() => '</span>').join(''))
      current = openSpans.map(cls => `<span class="${cls}">`).join('')
      i++
    } else if (html.startsWith('<span', i)) {
      const end = html.indexOf('>', i)
      const tag = html.slice(i, end + 1)
      openSpans.push(tag.match(/class="([^"]+)"/)?.[1] || '')
      current += tag
      i = end + 1
    } else if (html.startsWith('</span>', i)) {
      openSpans.pop()
      current += '</span>'
      i += 7
    } else {
      current += html[i++]
    }
  }
  if (current) lines.push(current)
  return lines
}

function renderSource(source) {
  const highlighted = hljs.highlight(source, { language: 'python' }).value
  const lines = splitHighlightedLines(highlighted)
  lineDivs = {}
  const sourceEl = document.getElementById('source')
  sourceEl.innerHTML = lines.map((html, i) => {
    const n = i + 1
    return `<div class="src-line" id="L${n}"><span class="lineno">${n}</span>${html}</div>`
  }).join('')
  for (let n = 1; n <= lines.length; n++) {
    lineDivs[n] = document.getElementById(`L${n}`)
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Binary search over timed_trace
// Returns the index of the last frame with time <= currentTime, or -1 if none.
// ──────────────────────────────────────────────────────────────────────────────

function findActiveFrame(time) {
  const trace = log.timed_trace
  if (!trace.length || time < trace[0].time) return -1
  let lo = 0, hi = trace.length - 1
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1
    if (trace[mid].time <= time) lo = mid
    else hi = mid - 1
  }
  return lo
}

// ──────────────────────────────────────────────────────────────────────────────
// View update — called on every currentTime change
// ──────────────────────────────────────────────────────────────────────────────

function updateView() {
  const idx = findActiveFrame(currentTime)
  if (idx === prevFrameIdx) return
  prevFrameIdx = idx

  if (activeEl) activeEl.classList.remove('active')
  activeEl = null

  if (idx >= 0) {
    const line = log.timed_trace[idx].line
    const el = lineDivs[line]
    if (el) {
      el.classList.add('active')
      el.scrollIntoView({ block: 'center', behavior: 'smooth' })
      activeEl = el
    }
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Playback
// ──────────────────────────────────────────────────────────────────────────────

let playBtnEl

function play() {
  if (currentTime >= logDuration) setCurrentTime(0)
  isPlaying = true
  playOffset = currentTime
  playStartWall = performance.now()
  playBtnEl.textContent = '⏸'
  if (videoEl) { videoEl.currentTime = currentTime; videoEl.play().catch(() => {}) }
  else rafId = requestAnimationFrame(tick)
}

function pause() {
  isPlaying = false
  if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null }
  playBtnEl.textContent = '▶'
  if (videoEl) videoEl.pause()
}

function togglePlay() {
  isPlaying ? pause() : play()
}

function tick() {
  if (!isPlaying) return
  const t = playOffset + (performance.now() - playStartWall) / 1000
  if (t >= logDuration) {
    setCurrentTime(logDuration)
    pause()
    return
  }
  setCurrentTime(t)
  rafId = requestAnimationFrame(tick)
}

// ──────────────────────────────────────────────────────────────────────────────
// Controls
// ──────────────────────────────────────────────────────────────────────────────

let scrubberEl, timeDisplayEl

function stepBy(delta) {
  const trace = log.timed_trace
  if (!trace.length) return
  const idx = Math.max(0, Math.min(trace.length - 1, findActiveFrame(currentTime) + delta))
  setCurrentTime(trace[idx].time)
}

function initControls() {
  scrubberEl = document.getElementById('scrubber')
  timeDisplayEl = document.getElementById('time-display')
  playBtnEl = document.getElementById('play-pause')

  scrubberEl.max = logDuration
  scrubberEl.step = '0.1'
  scrubberEl.addEventListener('input', () => {
    const t = +scrubberEl.value
    if (isPlaying) {
      // Re-anchor the rAF loop to the new position so it stays in sync
      playOffset = t
      playStartWall = performance.now()
    }
    setCurrentTime(t)
  })

  playBtnEl.addEventListener('click', togglePlay)
  document.getElementById('step-back').addEventListener('click', () => { pause(); stepBy(-1) })
  document.getElementById('step-fwd').addEventListener('click', () => { pause(); stepBy(+1) })
}

// ──────────────────────────────────────────────────────────────────────────────
// Utilities
// ──────────────────────────────────────────────────────────────────────────────

function fmtTime(s) {
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${String(sec).padStart(2, '0')}`
}

function showError(msg) {
  const el = document.getElementById('status')
  el.textContent = msg
  el.hidden = false
}

// ──────────────────────────────────────────────────────────────────────────────
// Video discovery
// ──────────────────────────────────────────────────────────────────────────────

async function findVideo(name) {
  const path = `logs-video/${name}.mp4`
  try { return (await fetch(path, { method: 'HEAD' })).ok ? path : null } catch { return null }
}

// ──────────────────────────────────────────────────────────────────────────────
// Main
// ──────────────────────────────────────────────────────────────────────────────

async function main() {
  const params = new URLSearchParams(location.search)
  const name = params.get('l')

  if (!name) {
    showError('No log specified. Add ?s=<name> to the URL.')
    return
  }

  document.getElementById('status').textContent = `Loading ${name}…`

  try {
    log = await loadLog(name)
  } catch (e) {
    showError(`Error: ${e.message}`)
    return
  }

  const trace = log.timed_trace
  logDuration = trace.length ? trace[trace.length - 1].time + 1 : 0

  document.getElementById('status').hidden = true
  document.getElementById('app').hidden = false
  document.getElementById('script-name').textContent = log.script

  renderSource(log.source)
  initControls()

  const videoPath = await findVideo(name)
  if (videoPath) {
    videoEl = document.getElementById('session-video')
    videoEl.src = videoPath
    document.getElementById('video-panel').hidden = false
    videoEl.addEventListener('timeupdate', () => setCurrentTime(videoEl.currentTime))
    videoEl.addEventListener('play',  () => { if (!isPlaying) play() })
    videoEl.addEventListener('pause', () => { if (isPlaying)  pause() })
  }

  setCurrentTime(0)
}

main()
