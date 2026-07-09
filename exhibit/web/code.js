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
const interstitialView = document.getElementById('interstitial')
const codePanelEl = document.getElementById('code-panel')
const interstitialScript = document.getElementById('interstitial-script')
const interstitialMeta = document.getElementById('interstitial-meta')

const CLOCK_MS = 100
const INTERSTITIAL_MS = 4000

function post() {
  postState({ execution: currentExecution, time: currentTime, playing: true, next: null })
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
  logDuration = trace.length ? trace[trace.length - 1].time + 1 : 0
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

function showInterstitial(next) {
  codeView.hidden = true
  interstitialView.hidden = false
  interstitialScript.textContent = next.userName || next.script
  interstitialMeta.textContent = next.date || ''
  postState({ execution: null, time: 0, playing: false, next })

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
      interstitialView.hidden = true
      await runExecution(order[idx])
      idx = (idx + 1) % order.length
      await showInterstitial(order[idx])
    }
  } catch (err) {
    console.error('Fatal error in exhibit loop:', err)
    document.body.textContent = `Error: ${err.message}`
  }
}

loopForever()
