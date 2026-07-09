// Code view — autoplay loop controller. Plays each execution in order,
// showing the source code in sync, and signals the video page what to do via
// HTTP state POSTs. Runs unattended in a loop forever.

import { postState } from './sync.js'

let log = null              // loaded trace { script, source, timed_trace }
let logDuration = 0         // seconds
let currentTime = 0         // seconds
let currentExecution = null

let lineDivs = {}           // line number (1-based) → <div>
let lineIdents = {}         // line number (1-based) → Set of identifiers on that line
let activeEl = null
let prevFrameIdx = -1

let clockTimer = null       // setInterval id while playing
let anchorWall = 0          // performance.now() when the clock started
let anchorTime = 0          // currentTime when the clock started

const codeView = document.getElementById('code-view')
const storyView = document.getElementById('story-view')
const interstitialView = document.getElementById('interstitial')
const codePanelEl = document.getElementById('code-panel')
const interstitialScript = document.getElementById('interstitial-script')
const interstitialMeta = document.getElementById('interstitial-meta')
const storyTitle = document.getElementById('story-title')
const storyMeta = document.getElementById('story-meta')
const storyBody = document.getElementById('story-body')
const debugEndEl = document.getElementById('debug-end')

// One reused element for the active line's runtime values, pinned above that line.
const varsEl = document.createElement('span')
varsEl.className = 'inline-vars'
varsEl.hidden = true
codePanelEl.appendChild(varsEl)

const CLOCK_MS = 100
const INTERSTITIAL_MS = 4000

function post() {
  postState({ execution: currentExecution, time: currentTime, playing: true, next: null, story: null })
}

// story.txt separates the collaboratively-built sentences with a literal "\n"
// (backslash-n), not a real newline.
function storySentences(text) {
  return text.split(/\\n|\n/).map(s => s.trim()).filter(Boolean)
}

// Longer stories get more read time; short ones don't linger. Generous per-sentence
// pacing so it's comfortably readable across the room.
function storyDuration(sentences) {
  return Math.min(60000, 6000 + sentences.length * 6000)
}

function renderStory(el, text) {
  el.replaceChildren(...storySentences(text).map(sentence => {
    const p = document.createElement('p')
    p.className = 'story-line'
    p.textContent = sentence
    return p
  }))
}

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
  varsEl.hidden = true

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
        varsEl.textContent = parts.join('  ·  ')
        varsEl.style.top = `${el.offsetTop}px`
        varsEl.hidden = false
      }
    }
  }
}

// Debug: fast-forward the clock to just before the end, so the last few seconds
// still play out (rather than snapping to completion). No-op unless code is playing.
function jumpToEnd() {
  if (!clockTimer) return
  anchorTime = Math.max(0, logDuration - 3)
  anchorWall = performance.now()
}
debugEndEl.addEventListener('click', jumpToEnd)

// The debug button reveals itself while the mouse moves and fades out once it's
// been still for a moment, so it stays out of the way of the unattended exhibit.
let hideDebugTimer = null
document.addEventListener('mousemove', () => {
  debugEndEl.classList.add('visible')
  clearTimeout(hideDebugTimer)
  hideDebugTimer = setTimeout(() => debugEndEl.classList.remove('visible'), 2000)
})

function setCurrentTime(t) {
  currentTime = Math.max(0, Math.min(t, logDuration))
  updateView()
  post()
}

function tick() {
  const t = anchorTime + (performance.now() - anchorWall) / 1000
  if (t >= logDuration) {
    setCurrentTime(logDuration)
    if (clockTimer) { clearInterval(clockTimer); clockTimer = null }
    return true  // signal completion
  }
  setCurrentTime(t)
  return false
}

async function runExecution(e) {
  try {
    log = await (await fetch(`/executions/${e.id}/trace.json`)).json()
  } catch (err) {
    console.error(`Error loading execution ${e.id}:`, err)
    return
  }

  currentExecution = e.id
  const trace = log.timed_trace
  const traceEnd = trace.length ? trace[trace.length - 1].time + 1 : 0
  // The recording keeps running after the last executed line. A video mapped through
  // its offset (videoTime = clock − offset) reaches its end at clock = duration + offset,
  // so hold the clock until the longest video has finished before showing the story.
  logDuration = Math.max(
    traceEnd,
    e.video && e.video_duration ? e.video_duration + (e.video_offset || 0) : 0,
    e.video_outside && e.video_outside_duration ? e.video_outside_duration + (e.video_outside_offset || 0) : 0,
  )
  prevFrameIdx = -1
  activeEl = null
  renderSource(log.source)

  currentTime = 0
  anchorWall = performance.now()
  anchorTime = 0
  post()

  return new Promise(resolve => {
    clockTimer = setInterval(() => {
      if (tick()) resolve()
    }, CLOCK_MS)
  })
}

// The finished execution's story — its actual human output — held on screen before
// moving on. Posts the story text so the video follower can mirror it.
function showStory(e) {
  codeView.hidden = true
  storyView.hidden = false
  storyTitle.textContent = e.userName || e.script
  storyMeta.textContent = e.date || ''
  renderStory(storyBody, e.story)
  postState({ execution: null, time: 0, playing: false, next: null, story: e })

  return new Promise(resolve => setTimeout(resolve, storyDuration(storySentences(e.story))))
}

function showInterstitial(next) {
  codeView.hidden = true
  storyView.hidden = true
  interstitialView.hidden = false
  interstitialScript.textContent = next.userName || next.script
  interstitialMeta.textContent = next.date || ''
  postState({ execution: null, time: 0, playing: false, next, story: null })

  return new Promise(resolve => setTimeout(resolve, INTERSTITIAL_MS))
}

async function loopForever() {
  try {
    const list = await (await fetch('/api/executions')).json()
    const order = list.slice().sort((a, b) => a.id.localeCompare(b.id))  // chronological

    if (!order.length) {
      document.body.textContent = 'No executions found.'
      return
    }

    let idx = 0
    while (true) {
      codeView.hidden = false
      storyView.hidden = true
      interstitialView.hidden = true
      const cur = order[idx]
      await runExecution(cur)
      if (cur.story) await showStory(cur)
      idx = (idx + 1) % order.length
      await showInterstitial(order[idx])
    }
  } catch (err) {
    console.error('Fatal error in exhibit loop:', err)
    document.body.textContent = `Error: ${err.message}`
  }
}

loopForever()
