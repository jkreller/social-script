#!/usr/bin/env python3
"""
Exhibit server — serves the two-device replay viewer and keeps them in sync.

Runs locally (e.g. on a Raspberry Pi). One device opens /code (the controller +
clock master, an autoplay loop), another opens /video (a pure follower). The
master POSTs its playback state; the follower polls it. No WebSocket.

Usage:
  pip install -r exhibit/requirements.txt
  python exhibit/server.py
"""

import json
import re
import socket
import subprocess
from datetime import datetime
from pathlib import Path

import uvicorn
from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

HERE = Path(__file__).parent
WEB = HERE / "web"
EXECUTIONS = HERE / "executions"

_VIDEO_RE = re.compile(r"^video_1\.(mp4|webm|mov|mkv)$", re.IGNORECASE)
_VIDEO_OUTSIDE_RE = re.compile(r"^video_outside\.(mp4|webm|mov|mkv)$", re.IGNORECASE)

app = FastAPI()

# Sync state: the code master POSTs it, the video follower polls it. `rev`
# lets the follower cheaply ignore polls that changed nothing.
state = {"rev": 0, "execution": None, "time": 0.0, "playing": False, "next": None, "story": None}


_duration_cache: dict = {}


def _video_duration(path: Path):
    """Video length in seconds via ffprobe, or None if unavailable. Cached by mtime.

    The trace ends at the last executed line, but the recording usually runs on for a
    while after that — so the code clock needs the video length to hold the story until
    the footage has actually finished.
    """
    try:
        key = (str(path), path.stat().st_mtime)
    except OSError:
        return None
    if key not in _duration_cache:
        try:
            out = subprocess.run(
                ["ffprobe", "-v", "error", "-show_entries", "format=duration",
                 "-of", "csv=p=0", str(path)],
                capture_output=True, text=True, timeout=10,
            )
            _duration_cache[key] = float(out.stdout.strip())
        except (ValueError, OSError, subprocess.SubprocessError):
            _duration_cache[key] = None  # ffprobe missing/failed — fall back to trace length
    return _duration_cache[key]


def _outside_offset(subdir: Path) -> float:
    """Read the outside-camera offset from video_outside_offset.txt, or 0.0 if missing."""
    offset_path = subdir / "video_outside_offset.txt"
    if offset_path.exists():
        try:
            return float(offset_path.read_text().strip())
        except (ValueError, OSError):
            return 0.0
    return 0.0


def _display_date(name: str, log: list) -> str:
    """'YYYY-MM-DD HH:MM' from the dir-name prefix, else from the start event."""
    try:
        return datetime.strptime(name[:16], "%Y-%m-%d_%H-%M").strftime("%Y-%m-%d %H:%M")
    except ValueError:
        start = next((e["timestamp"] for e in log if e.get("type") == "start"), None)
        return datetime.fromtimestamp(start / 1000).strftime("%Y-%m-%d %H:%M") if start else ""


def _execution_entry(subdir: Path):
    """One list entry, or None if the dir isn't a playable execution."""
    log_path, trace_path = subdir / "log.json", subdir / "trace.json"
    if not (log_path.exists() and trace_path.exists()):
        return None

    log = json.loads(log_path.read_text())
    trace = json.loads(trace_path.read_text())
    frames = trace.get("timed_trace", [])
    entries = sorted(subdir.iterdir())
    video = next((p.name for p in entries if _VIDEO_RE.match(p.name)), None)
    video_outside = next((p.name for p in entries if _VIDEO_OUTSIDE_RE.match(p.name)), None)

    story_path = subdir / "story.txt"
    story = story_path.read_text().strip() if story_path.exists() else ""

    return {
        "id": subdir.name,
        "script": log.get("script", subdir.name),
        "userName": log.get("userName", ""),
        "tags": log.get("tags", []),
        "commit": (log.get("commit") or "")[:8],
        "date": _display_date(subdir.name, log.get("log", [])),
        "video": video,
        "video_offset": trace.get("video_offset", 0.0),
        "video_duration": _video_duration(subdir / video) if video else None,
        "video_outside": video_outside,
        "video_outside_offset": _outside_offset(subdir),
        "video_outside_duration": _video_duration(subdir / video_outside) if video_outside else None,
        "story": story,
        "duration": (frames[-1]["time"] + 1) if frames else 0.0,
    }


@app.get("/")
def landing():
    return FileResponse(WEB / "index.html")


@app.get("/video")
def video_page():
    return FileResponse(WEB / "video.html")


@app.get("/code")
def code_page():
    return FileResponse(WEB / "code.html")


@app.get("/api/executions")
def list_executions():
    entries = (_execution_entry(d) for d in EXECUTIONS.iterdir() if d.is_dir())
    return sorted((e for e in entries if e), key=lambda e: e["id"], reverse=True)


@app.get("/api/state")
def get_state():
    return state


@app.post("/api/state")
def set_state(patch: dict):
    for key in ("execution", "time", "playing", "next", "story"):
        if key in patch:
            state[key] = patch[key]
    state["rev"] += 1
    return state


app.mount("/assets", StaticFiles(directory=WEB), name="assets")
app.mount("/executions", StaticFiles(directory=EXECUTIONS), name="executions")


def _lan_ip() -> str:
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(("8.8.8.8", 80))
        return s.getsockname()[0]
    except OSError:
        return "127.0.0.1"
    finally:
        s.close()


if __name__ == "__main__":
    ip = _lan_ip()
    print(f"\n  Video device (tablet):  http://{ip}:8000/video")
    print(f"  Code device (display):  http://{ip}:8000/code\n")
    uvicorn.run(app, host="0.0.0.0", port=8000)
