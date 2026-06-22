# Exhibit — replay code-view

A standalone gallery page that steps through a social_script source file in sync with a recorded session. No build step, no npm — plain HTML + JS.

## Files

```
exhibit/
  build_trace.py        generate a session file from a recorded run
  index.html            the page (served as a static file)
  exhibit.js            all client logic
  exhibit.css           styles
  packages/             bundled JS dependencies (e.g. highlight.js)
  sessions/             pre-generated session JSON files
    example.json        synthetic connect_group session
```

## How to generate a session

**1. Export the run from the PWA.**
After finishing a session in the PWA, open DevTools → Console and run:
```js
copy(localStorage.getItem('run'))
```
Paste the output into a file, e.g. `run.json`.

**2. Build the trace.**
```sh
python exhibit/build_trace.py <script_name> run.json exhibit/sessions/<name>.json
```
Example:
```sh
python exhibit/build_trace.py connect_group run.json exhibit/sessions/my_session.json
```
This replays the session with `sys.settrace` to capture per-line timing, then writes a session JSON containing the script source and a timed trace.

## How to run

Serve the repo root with any static file server:
```sh
python -m http.server 8000
```
Then open:
```
http://localhost:8000/exhibit/?s=<name>
```
where `<name>` matches the filename in `sessions/` (without `.json`). The example session:
```
http://localhost:8000/exhibit/?s=example
```

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
