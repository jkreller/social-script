#!/bin/bash
# Restart the exhibit server and open two Chrome kiosk windows on separate displays.
set -e
cd "$(dirname "$0")"

PYTHON=.venv/bin/python3
[ -x "$PYTHON" ] || PYTHON=python3

pkill -f server.py 2>/dev/null || true
sleep 1
"$PYTHON" server.py &
sleep 2

# Launch two Chrome kiosk windows
open -na "Google Chrome" --args --kiosk --new-window \
  --autoplay-policy=no-user-gesture-required http://localhost:8000/code
open -na "Google Chrome" --args --kiosk --new-window \
  --autoplay-policy=no-user-gesture-required http://localhost:8000/video

# Wait for windows to open, then position them on different displays if available
sleep 3

osascript 2>/dev/null <<'APPLESCRIPT' || true
try
  tell application "System Events"
    set displayCount to count of displays
  end tell

  if displayCount >= 2 then
    tell application "Google Chrome"
      -- Position /code window on primary display (left)
      set bounds of window 1 to {0, 0, 2560, 1440}
      -- Position /video window on secondary display (right)
      set bounds of window 2 to {2560, 0, 5120, 1440}
    end tell
  end if
end try
APPLESCRIPT
