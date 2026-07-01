#!/usr/bin/env bash
# Restart the exhibit server and open the code view in kiosk Chromium.
set -e
cd "$(dirname "$0")"

pkill -f server.py 2>/dev/null || true
sleep 1
python3 server.py &
sleep 2

chromium-browser --kiosk --disable-smooth-scrolling http://localhost:8000/code
