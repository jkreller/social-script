#!/bin/bash
# Restart the exhibit server and open two Chrome kiosk windows (one per page).
set -e
cd "$(dirname "$0")"

PYTHON=.venv/bin/python3
[ -x "$PYTHON" ] || PYTHON=python3

pkill -f server.py 2>/dev/null || true
sleep 1
"$PYTHON" server.py &
sleep 2

open -na "Google Chrome" --args --kiosk --new-window \
  --autoplay-policy=no-user-gesture-required http://localhost:8000/code
open -na "Google Chrome" --args --kiosk --new-window \
  --autoplay-policy=no-user-gesture-required http://localhost:8000/video
