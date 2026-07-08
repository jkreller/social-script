#!/bin/bash
# Restart the exhibit server. (Windows open via open_code.sh / open_video.sh.)
set -e
cd "$(dirname "$0")"

PYTHON=.venv/bin/python3
[ -x "$PYTHON" ] || PYTHON=python3

pkill -f server.py 2>/dev/null || true
sleep 1
"$PYTHON" server.py