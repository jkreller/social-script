# Exhibit — replay code-view

A standalone gallery page that steps through a social_script source file in sync with a recorded session. No build step, no npm — plain HTML + JS.

## Files

```
exhibit/
  build_trace.py        generate session files from recorded runs
  index.html            the page (served as a static file)
  exhibit.js            all client logic
  exhibit.css           styles
  packages/             bundled JS dependencies (e.g. highlight.js)
  logs-in/              drop exported PWA run JSONs here
  logs-out/             generated session JSONs (read by the viewer)
```

## How to generate a session

**1. Export the run from the PWA.**
After finishing a session in the PWA, open DevTools → Console and run:
```js
copy(localStorage.getItem('run'))
```
Paste the output into a file and drop it in `exhibit/logs-in/` (any filename, must end in `.json`).

**2. Build the trace.**
```sh
python exhibit/build_trace.py
```
Reads every `*.json` in `logs-in/`, replays each session with `sys.settrace` to capture per-line timing, and writes matching files to `logs-out/`.

## How to run

Serve the repo root with any static file server:
```sh
python -m http.server 8000
```
Then open:
```
http://localhost:8000/exhibit/?s=<name>
```
where `<name>` matches the filename in `logs-out/` (without `.json`).

## Controls

Playback starts automatically. Controls at the bottom:

| Control | Action |
|---|---|
| ▶ / ⏸ | Play / pause |
| ◀ | Step back one traced line |
| ▶ | Step forward one traced line |
| Scrubber | Scrub to any point in the session |

## Syncing to video later

`setCurrentTime(t)` in `exhibit.js` is the only entry point the clock uses. To drive the code-view from a `<video>` element, replace the scrubber with:
```js
video.addEventListener('timeupdate', () => setCurrentTime(video.currentTime))
```
