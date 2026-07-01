// Code view — the main controller (master). Renders the code, plays/pauses and
// steps through the trace, and POSTs the playback state for the video to mirror.
//
// The clock is a ~100 ms setInterval, not a 60 fps rAF loop, and it only runs
// while playing — deliberately light for the Raspberry Pi (which never decodes
// video; that happens on the tablet).

import { postState } from './sync.js'

let log = null              // loaded trace { script, source, timed_trace }
let logDuration = 0         // seconds
let currentTime = 0         // seconds
let currentExecution = null

let lineDivs = {}           // line number (1-based) → <div>
let lineIdents = {}         // line number (1-based) → Set of identifiers on that line
let activeEl = null
let prevFrameIdx = -1

let isPlaying = false
let clockTimer = null       // setInterval id while playing
let anchorWall = 0          // performance.now() at last (re)anchor
let anchorTime = 0          // currentTime at last (re)anchor
let lastPostWall = 0        // throttle for state POSTs

const listView = document.getElementById('list-view')
const codeView = document.getElementById('code-view')
const listEl = document.getElementById('list')
const codePanelEl = document.getElementById('code-panel')
const playBtn = document.getElementById('play-pause')
const scrubberEl = document.getElementById('scrubber')
const timeEl = document.getElementById('time-display')
const scriptNameEl = document.getElementById('script-name')

const CLOCK_MS = 100
const POST_MS = 250

// ── Utilities ──────────────────────────────────────────────────────────────────

const label = (a, b) => [a, b].filter(Boolean).join('  ·  ')

function fmtTime(s) {
  if (!isFinite(s)) s = 0
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`
}

function post(immediate = false) {
  const now = performance.now()
  if (!immediate && now - lastPostWall < POST_MS) return
  lastPostWall = now
  postState({ execution: currentExecution, time: currentTime, playing: isPlaying })
}

// ── Source rendering ──────────────────────────────────────────────────────────

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
  lineIdents = {}
  const rawLines = source.split('\n')
  const sourceEl = document.getElementById('source')
  sourceEl.innerHTML = lines.map((html, i) => {
    const n = i + 1
    return `<div class="src-line" id="L${n}"><span class="lineno">${n}</span>${html}</div>`
  }).join('')
  for (let n = 1; n <= lines.length; n++) {
    lineDivs[n] = document.getElementById(`L${n}`)
    lineIdents[n] = new Set(rawLines[n - 1].match(/[A-Za-z_]\w*/g) || [])
  }
}

// ── Trace lookup & view ─────────────────────────────────────────────────────────
// Index of the last frame with time <= currentTime, or -1 if none.

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

function scrollToLine(el) {
  const elRect = el.getBoundingClientRect()
  const panelRect = codePanelEl.getBoundingClientRect()
  const inView = elRect.top >= panelRect.top && elRect.bottom <= panelRect.bottom
  if (!inView) el.scrollIntoView({ block: 'center' })
}

function updateView() {
  if (!log) return
  const idx = findActiveFrame(currentTime)
  if (idx === prevFrameIdx) return
  prevFrameIdx = idx

  if (activeEl) activeEl.classList.remove('active')
  activeEl = null

  if (idx >= 0) {
    const frame = log.timed_trace[idx]
    const el = lineDivs[frame.line]
    if (el) {
      el.classList.add('active')
      scrollToLine(el)
      activeEl = el

      const vars = frame.vars || {}
      const idents = lineIdents[frame.line] || new Set()
      const parts = Object.entries(vars)
        .filter(([k]) => idents.has(k))
        .map(([k, v]) => `${k} = ${v}`)
      if (parts.length) {
        el.querySelector('.inline-vars')?.remove()
        const span = document.createElement('span')
        span.className = 'inline-vars'
        span.textContent = parts.join('  ·  ')
        el.appendChild(span)
      }
    }
  }
}

function setCurrentTime(t) {
  currentTime = Math.max(0, Math.min(t, logDuration))
  scrubberEl.value = currentTime
  timeEl.textContent = `${fmtTime(currentTime)} / ${fmtTime(logDuration)}`
  updateView()
  post()
}

// ── Playback ─────────────────────────────────────────────────────────────────

function play() {
  if (currentTime >= logDuration) setCurrentTime(0)
  isPlaying = true
  playBtn.textContent = '⏸'
  anchorWall = performance.now()
  anchorTime = currentTime
  if (!clockTimer) clockTimer = setInterval(tick, CLOCK_MS)
  post(true)
}

function pause() {
  isPlaying = false
  playBtn.textContent = '▶'
  if (clockTimer) { clearInterval(clockTimer); clockTimer = null }
  post(true)
}

function togglePlay() {
  isPlaying ? pause() : play()
}

function tick() {
  const t = anchorTime + (performance.now() - anchorWall) / 1000
  if (t >= logDuration) { setCurrentTime(logDuration); pause(); return }
  setCurrentTime(t)
}

function stepBy(delta) {
  if (!log || !log.timed_trace.length) return
  pause()
  const idx = Math.max(0, Math.min(log.timed_trace.length - 1, findActiveFrame(currentTime) + delta))
  setCurrentTime(log.timed_trace[idx].time)
  post(true)
}

// ── List & selection ─────────────────────────────────────────────────────────

function makeRow(e) {
  const row = document.createElement('button')
  row.className = 'exec'

  const script = document.createElement('span')
  script.className = 'exec-script'
  script.textContent = e.script

  const meta = document.createElement('span')
  meta.className = 'exec-meta'
  meta.textContent = label(e.userName, e.date)

  const tags = document.createElement('span')
  tags.className = 'exec-tags'
  for (const t of e.tags) {
    const tag = document.createElement('span')
    tag.className = 'tag'
    tag.textContent = t
    tags.appendChild(tag)
  }

  row.append(script, meta, tags)
  row.addEventListener('click', () => select(e))
  return row
}

async function renderList() {
  try {
    const list = await (await fetch('/api/executions')).json()
    listEl.replaceChildren(...list.map(makeRow))
    if (!list.length) listEl.textContent = 'No executions found.'
  } catch (e) {
    listEl.textContent = `Could not load executions: ${e.message}`
  }
}

async function select(e) {
  currentExecution = e.id
  scriptNameEl.textContent = label(e.script, e.userName)
  listView.hidden = true
  codeView.hidden = false

  try {
    log = await (await fetch(`/executions/${e.id}/trace.json`)).json()
  } catch (err) {
    scriptNameEl.textContent = `Error: ${err.message}`
    return
  }
  const trace = log.timed_trace
  logDuration = trace.length ? trace[trace.length - 1].time + 1 : 0
  scrubberEl.max = logDuration
  prevFrameIdx = -1
  activeEl = null
  renderSource(log.source)

  isPlaying = false
  playBtn.textContent = '▶'
  setCurrentTime(0)
  post(true)
}

function backToList() {
  if (clockTimer) { clearInterval(clockTimer); clockTimer = null }
  isPlaying = false
  playBtn.textContent = '▶'
  currentExecution = null
  currentTime = 0
  log = null
  post(true)
  codeView.hidden = true
  listView.hidden = false
}

// ── Controls ─────────────────────────────────────────────────────────────────

playBtn.addEventListener('click', togglePlay)
document.getElementById('step-back').addEventListener('click', () => stepBy(-1))
document.getElementById('step-fwd').addEventListener('click', () => stepBy(+1))
document.getElementById('back').addEventListener('click', backToList)

scrubberEl.addEventListener('input', () => {
  const t = +scrubberEl.value
  if (isPlaying) { anchorTime = t; anchorWall = performance.now() }
  setCurrentTime(t)
  post(true)
})

document.addEventListener('keydown', (ev) => {
  if (codeView.hidden) return
  if (ev.code === 'Space') { ev.preventDefault(); togglePlay() }
  else if (ev.code === 'ArrowRight') { ev.preventDefault(); stepBy(+1) }
  else if (ev.code === 'ArrowLeft') { ev.preventDefault(); stepBy(-1) }
})

// ── Init ─────────────────────────────────────────────────────────────────────

renderList()
