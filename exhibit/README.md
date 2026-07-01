# Exhibit — two-device synced replay

A gallery viewer that steps through a `social_script` source file in sync with a
recorded session video, split across **two devices**:

- **`/video`** — the *controller* (a tablet). Shows a list of recorded executions,
  plays the video, and is the clock master.
- **`/code`** — the *follower* (a display driven by the Raspberry Pi). Shows the code and
  highlights the current line in sync. No controls of its own.

A small local server keeps the two in sync: the video device POSTs its playback state,
the code device polls it (~4×/s) over plain HTTP. No WebSocket, no build step, no npm.

## Files

```
exhibit/
  server.py            FastAPI: serves the pages, /api/executions, /api/state, assets
  requirements.txt     fastapi + uvicorn (plain — no compiling on the Pi)
  build_trace.py       generate trace.json from recorded runs
  web/                 everything served to browsers
    index.html         landing: links to the two devices
    video.html         controller page (tablet)
    code.html          follower page (Pi display)
    video.js, code.js, sync.js
    exhibit.css
    packages/          bundled JS dependencies (highlight.js)
  executions/          one dir per run: log.json, trace.json, video_1.<ext>
```

## How to add an execution

Each execution is a subdirectory of `executions/` containing:

- `log.json` — the exported PWA run (script, `userName`, `tags`, `commit`, `answers`,
  `log`). After finishing a session in the PWA, open DevTools → Console and run
  `copy(localStorage.getItem('run'))`, then save it as `log.json`.
- `video_1.<ext>` — the recorded video (H.264 MP4 recommended; see note below).

Then build the trace (replays the session with `sys.settrace` to capture per-line
timing and writes `trace.json` next to each `log.json`):

```sh
python exhibit/build_trace.py
```

The execution list on `/video` is built by scanning `executions/`; script and executor
names are read from each `log.json`. No filenames or query params to manage.

## How to run (Raspberry Pi + tablet)

On the Pi (once):

```sh
pip install -r exhibit/requirements.txt
```

Start the server (binds `0.0.0.0:8000` and prints its LAN IP):

```sh
python exhibit/server.py
```

- On the Pi's display, open the code view fullscreen, e.g.:
  ```sh
  chromium-browser --kiosk http://localhost:8000/code
  ```
- On the tablet (same Wi-Fi), open `http://<pi-lan-ip>:8000/video`.

Pick an execution on the tablet and press play — the code view follows. Pause, seek and
switching executions are all mirrored within a poll interval.

> The tablet streams the video from the Pi over Wi-Fi (the server supports HTTP range
> requests, so seeking works). For smooth playback on the Pi's Wi-Fi, keep videos as
> web-friendly H.264 MP4.

## How sync works

`server.py` holds one in-memory state dict — `{rev, execution, time, playing}`, where
`time` is in the trace timeline. The video page converts `video.currentTime +
video_offset` and `POST`s it on play/pause/seek/timeupdate; the code page `GET`s it every
~250 ms and, when `rev` changed, loads the selected trace and sets the highlighted line.
Every request is stateless, so a device can be reloaded or reconnected at any time and
catches up on its next poll.
