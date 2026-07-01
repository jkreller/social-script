#!/usr/bin/env bash
# Restart the exhibit server and open the code view in kiosk Chromium.
set -e
cd "$(dirname "$0")"

PYTHON=.venv/bin/python3
[ -x "$PYTHON" ] || PYTHON=python3

pkill -f server.py 2>/dev/null || true
sleep 1
"$PYTHON" server.py &
sleep 2

export DISPLAY=:0
chromium --kiosk --disable-smooth-scrolling http://localhost:8000/code
