# Exhibit — two-device synced replay

A gallery viewer that steps through a `social_script` source file in sync with a
recorded session video, split across **two devices**:

- **`/code`** — the *controller* (a display driven by the Raspberry Pi). Shows the
  execution list and the code, and drives play/pause/step/scrub.
- **`/video`** — the *follower* (a tablet). Mirrors whatever the code view is doing —
  plays, pauses and seeks the recorded video to match. No controls of its own.

A small local server keeps the two in sync: the code device POSTs its playback state,
the video device polls it (~4×/s) over plain HTTP. No WebSocket, no build step, no npm.

## Files

```
exhibit/
  server.py            FastAPI: serves the pages, /api/executions, /api/state, assets
  run_pi.sh            restart the server and open the code view in kiosk Chromium
  requirements.txt     fastapi + uvicorn (plain — no compiling on the Pi)
  build_trace.py       generate trace.json from recorded runs
  web/                 everything served to browsers
    index.html         landing: links to the two devices
    code.html          controller page (Pi display)
    video.html         follower page (tablet)
    code.js, video.js, sync.js
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

The execution list on `/code` is built by scanning `executions/`; script and executor
names are read from each `log.json`. No filenames or query params to manage.

## How to run (Raspberry Pi + tablet)

On the Pi (once):

```sh
pip install -r exhibit/requirements.txt
```

Each time you want to (re)start the exhibit, run:

```sh
./exhibit/run_pi.sh
```

It kills any server still running, starts a fresh one (binds `0.0.0.0:8000` and prints
its LAN IP), and opens the code view in kiosk Chromium.

Then, on the tablet (same Wi-Fi), open `http://<pi-lan-ip>:8000/video`.

Pick an execution on the code view (Pi) and press play — the tablet's video follows.
Pause, seek and switching executions are all mirrored within a poll interval.

> The tablet streams the video from the Pi over Wi-Fi (the server supports HTTP range
> requests, so seeking works). For smooth playback on the Pi's Wi-Fi, keep videos as
> web-friendly H.264 MP4.

## How sync works

`server.py` holds one in-memory state dict — `{rev, execution, time, playing}`, where
`time` is in the trace timeline. The code page (master) `POST`s it on
select/play/pause/step/scrub; the video page `GET`s it every ~250 ms and, when `rev`
changed, loads the matching video and seeks to `time - video_offset`. Every request is
stateless, so a device can be reloaded or reconnected at any time and catches up on its
next poll. Selecting nothing (`execution: null`) tells the video page to clear its video
and show a prompt to pick one on the code view.
