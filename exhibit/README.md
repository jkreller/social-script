# Exhibit — unattended autoplay gallery

A gallery viewer that autoplays through a sequence of `social_script` executions,
stepping through the source code in sync with recorded videos, split across **two
browser windows**:

- **`/code`** — plays each execution's script source, highlighted line-by-line,
  controlled by an autoplay loop (no manual interaction).
- **`/video`** — mirrors the code view by displaying the matching recorded video(s).
  Supports both a portrait frontcam video (ambient audio) and an optional landscape
  outside-camera video (muted). No controls of its own.

The two windows are kept in sync via a small local server: the code page POSTs its
playback state, the video page polls it (~4×/s) over plain HTTP. Loop runs forever,
with a brief title-card pause between executions. No WebSocket, no build step, no npm.

## Files

```
exhibit/
  server.py            FastAPI: serves the pages, /api/executions, /api/state, assets
  install_pi.sh        one-time setup: create a venv and install requirements
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
- `video_1.<ext>` — the portrait frontcam video (H.264 MP4 recommended).
- `video_outside.<ext>` (optional) — a landscape video from an external camera (e.g.
  a static wide shot recorded on a separate device). If it's a raw camera export
  (e.g. Sony XAVC with PCM audio or proprietary metadata), use `./transcode_outside.sh`
  to convert it to a browser-playable H.264 MP4 first.
- `video_outside_offset.txt` (if using outside video) — a plain text file containing
  one decimal number: the second (within `video_outside.<ext>`) where this execution's
  session begins. Can be negative (recording started after the session began). Missing
  file → defaults to `0.0`.

Then build the trace (replays the session with `sys.settrace` to capture per-line
timing and writes `trace.json` next to each `log.json`):

```sh
python exhibit/build_trace.py
```

The execution list is built by scanning `executions/` in chronological order (sorted
by folder name: `YYYY-MM-DD_HH-MM_...`). Script and executor names are read from each
`log.json`. Videos are discovered by filename patterns; no manual manifests needed.

## How to run (Mac Mini)

One time (once):

```sh
./exhibit/install.sh
```

This creates a venv at `exhibit/.venv` and installs the requirements into it.

Each time you want to (re)start the exhibit, run:

```sh
./exhibit/run.sh
```

It kills any server still running, starts a fresh one (binds `0.0.0.0:8000`), and
opens two Chrome kiosk windows: `/code` (controller) and `/video` (display). The
exhibit autoplays immediately, cycling through all executions forever.

You can also launch the windows independently:

```sh
./exhibit/open_code.sh    # Open just the code view (source display)
./exhibit/open_video.sh   # Open just the video view (video display)
```

Each script attempts to position its window on a different display if available
(assumes ~2560px display width; edit the coordinates in the script if your setup
differs). Close either window to stop playback.

The Chrome `--autoplay-policy=no-user-gesture-required` flag allows the frontcam
video to play unmuted without user interaction (required for unattended operation).

## How sync works

`server.py` holds one in-memory state dict — `{rev, execution, time, playing, next}`,
where `time` is in the trace timeline.

- **`/code` (master)**: the autoplay loop POSTs state as it progresses through each
  execution. When showing the interstitial title card between executions, it sets
  `execution: null` and `next: {script, userName, date}`.
- **`/video` (follower)**: polls `/api/state` every ~250 ms and, when `rev` changed:
  - If `next` is set, shows the interstitial overlay and clears both videos.
  - Else, loads the matching videos and syncs them to `time - video_offset` (frontcam)
    and `time - video_outside_offset` (outside camera, if present).

The two HTML `<video>` elements are independent: the frontcam is full-bleed and
unmuted (carries audio); if an outside video is present, it fills the background
(muted) with the frontcam as a smaller picture-in-picture overlay. Every request is
stateless, so either window can be reloaded or the server restarted; they'll
resynchronize on the next poll.
