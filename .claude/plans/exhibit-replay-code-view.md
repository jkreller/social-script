# Plan: Exhibit Replay Code-View

## Context

A gallery installation needs a debugger-style view that steps through a social_script
source file in sync with a recorded session, driven by `currentTime` (seconds) so a
video element can replace the manual scrubber later without rework.

Deliverable: `/exhibit/` — a **plain HTML + vanilla JS** directory, no build step,
no framework, no npm. Completely separate from the React PWA in `/frontend/`.

---

## Log file format (exact)

### Source: `localStorage['run']` in the PWA

The PWA auto-saves the full run state after every interaction. To get a log file,
open DevTools on the PWA, run:

```js
JSON.parse(localStorage.getItem('run'))
```

or copy-paste the raw string from the Application → LocalStorage panel.

### Full structure of `localStorage['run']`

```jsonc
{
  "screen": "done",             // 'running' | 'paused' | 'done'
  "script": "connect_group",   // script name (no .py)
  "version": "v2.1",
  "tags": ["playful", "approach", "group"],
  "userName": "Julian",
  "cameraOn": true,
  "answers": [                  // ordered list of all answers + injected exceptions
    "",                         // enter-type answer (empty string = user pressed Enter)
    "y",                        // yn answer
    "3",                        // scale or choice answer (1-indexed string)
    "FearTooHigh(some note)"    // exception-continue: "ClassName(note)" serialization
  ],
  "log": [ ...see below... ]
}
```

### `log` array — entry types

Every entry has `timestamp` (integer, ms since Unix epoch).

```jsonc
{ "type": "start",         "timestamp": 1700000000000 }

{ "type": "step_show",     "timestamp": 1700000001000,
  "stepIndex": 0,
  "prompt": {
    "headline": "breathe",     // string | null — action category label
    "text": "...",             // full prompt text
    "input_type": "enter",     // "enter" | "yn" | "scale" | "choice"
    "choices": null            // string[] | null — only set for "choice" type
  }
}

{ "type": "step_answer",   "timestamp": 1700000005000,
  "stepIndex": 0,
  "prompt": { /* same Prompt object */ },
  "answer": ""               // the raw string the user submitted
}

{ "type": "exception_select", "timestamp": 1700000060000,
  "exceptionName": "FearTooHigh",
  "exceptionLabel": "fear too high"
}

{ "type": "exception",     "timestamp": 1700000065000,
  "exceptionName": "FearTooHigh",
  "exceptionLabel": "fear too high",
  "note": "some note",
  "decision": "continue"     // "continue" | "stop"
}

{ "type": "finish",        "timestamp": 1700000120000 }
```

### How the `answers` array is built (for replay correctness)

The answers array in `localStorage['run']` is the authoritative replay input — it
already contains exceptions in the right positions. Do NOT reconstruct it from the
log; use it directly. It is built by App.tsx as follows:

- `step_answer` event → `answers.push(answer)`
- `exception` event with `decision === 'continue'` → `answers.push("ClassName(note)")`

`build_trace.py` reads `answers` from the saved run JSON and calls `_replay()` on
each element (converts `"Cls(note)"` strings to exception instances).

### Input to `build_trace.py`

Save the entire `localStorage['run']` JSON to a file. The script reads `answers`,
`log`, and `script` from it.

---

## Architecture

```
exhibit/
  build_trace.py          ← run once offline: log JSON → session.json with timed trace
  sessions/
    <name>.json           ← pre-generated sessions for the installation
  index.html              ← entry point; ?s=<name> selects the session
  exhibit.js              ← all client logic (< 300 lines target)
  exhibit.css             ← styles matching PWA tokens
```

No npm, no node_modules, no `package.json`. Sessions are pre-generated and checked in.

---

## Trace generation: `build_trace.py`

### Exception handling

`ReplayDriver.input()` raises injected exception instances directly (driver.py:88–90).
When an exception propagates out of the script (not caught internally), `build_trace.py`
mirrors `run.py`'s pop-and-restart loop:

```
while True:
    reset events[], step_idx
    driver = TracingDriver(answers[:])   # fresh copy each pass
    set_driver(driver); sys.settrace(tracer)
    try:
        runpy.run_path(target)
        break                            # done
    except NeedInput:
        break                            # all answers consumed
    except AnyException as e:
        idx = driver.injected_exception_index
        if idx is not None and answers[idx] is e:
            answers.pop(idx)             # pop; restart without exception
            continue
        break
    except Exception:
        break
    finally:
        sys.settrace(None); clear_driver()
```

Each restart resets `events[]`, so only the final clean pass is kept. Exceptions
caught INTERNALLY by the script (e.g. `see-it_=_say-it.py`'s `except FearTooHigh`)
are traced normally — they don't bubble out, so no restart needed.

### Event stream

`TracingDriver` extends `ReplayDriver`; its `input()` appends
`{kind:'step', stepIndex}` BEFORE calling `super().input()` (before the answer is
returned). `sys.settrace` appends `{kind:'line', line}` for every line event in the
target script file only (checked via `filename.endswith(target)`).

### Timed trace construction

1. Split raw events by step boundaries → per-step line segments
2. Map step N → `step_show` entries in the log (by `stepIndex` field)
3. Time window: `[step_show[N].timestamp, step_show[N+1].timestamp]` (or finish for last)
4. Distribute M line events linearly: `time = (t_start + i*(t_end - t_start)/M - session_start) / 1000`

`time` is float seconds since session start (0-based).

### Output format: `sessions/<name>.json`

```json
{
  "script": "connect_group",
  "source": "<full Python source as a string>",
  "timed_trace": [
    { "time": 0.0,  "line": 45 },
    { "time": 0.3,  "line": 46 },
    { "time": 1.2,  "line": 52 }
  ]
}
```

The original `log` is NOT included in the session file (not needed for playback).
Source is read directly from `scripts/<name>.py`.

### Usage

```sh
python exhibit/build_trace.py connect_group path/to/run.json exhibit/sessions/my_run.json
```

---

## The HTML page

### `index.html`
Session is selected via `?s=<name>` URL param. Layout: full-height code panel + slim
control bar at the bottom.

### `exhibit.js`

**Session loading**
```js
const { source, timed_trace } = await fetch(`sessions/${name}.json`).then(r => r.json())
```

**Source rendering**
Split source into lines; render each as `<div class="line" data-line="N">`. Inline
Python tokenizer (~30 lines regex): keywords, strings, comments, numbers → `<span>`
with CSS classes. No external library.

**`currentTime` abstraction** — the only interface a video needs:
```js
function setCurrentTime(t) { currentTime = t; updateView() }
```
Scrubber and step buttons call `setCurrentTime()`. A future `<video>` element does
the same on `timeupdate`.

**Active line lookup**
Binary search `timed_trace` for last entry with `time <= currentTime`. Adds `active`
class to that line's `<div>`; removes it from all others. Auto-scrolls:
`el.scrollIntoView({ block: 'center', behavior: 'smooth' })`.

**Manual driver**
- `<input type="range">` spanning `[0, session_duration]`
- Step-back / step-forward: jump to adjacent trace entry's `time`

---

## Styling (`exhibit.css`)

Match PWA token set exactly — no visual fork:

```css
:root {
  --bg: #f5f0e8;
  --fg: #1a1a1a;
  --muted: #8a8480;
  --accent: #b5600a;
  --border: #d8d0c4;
  --font: 'JetBrains Mono', 'Courier New', monospace;
}
```

Active line: warm tint (`color-mix(in srgb, var(--accent) 12%, var(--bg))`).
Token colors: keywords → `--accent`; strings → `--muted`; comments → lighter muted.

---

## Files to create

| File | Purpose |
|---|---|
| `exhibit/build_trace.py` | Offline trace generator |
| `exhibit/index.html` | Gallery page shell |
| `exhibit/exhibit.js` | All client logic |
| `exhibit/exhibit.css` | Styles |
| `exhibit/sessions/example.json` | Minimal placeholder session |

## Files to modify
None. Zero changes to the PWA, framework, CLI runner, or scripts.

---

## Verification

1. Export a real session: copy `localStorage['run']` from the PWA DevTools
2. `python exhibit/build_trace.py connect_group run.json exhibit/sessions/test.json`
3. `python -m http.server 8000` from repo root
4. Open `http://localhost:8000/exhibit/?s=test`
5. Source renders with syntax coloring; scrubber changes the highlighted line; auto-scroll works
6. Step-back / step-forward advance by one trace frame
