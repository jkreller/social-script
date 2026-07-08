#!/bin/bash
# Restart the exhibit server and open both Chrome kiosk windows.
set -e
cd "$(dirname "$0")"

PYTHON=.venv/bin/python3
[ -x "$PYTHON" ] || PYTHON=python3

pkill -f server.py 2>/dev/null || true
sleep 1
"$PYTHON" server.py &
sleep 2

# Launch both windows (separate scripts so you can launch them independently if needed)
./open_code.sh &
./open_video.sh &

wait
