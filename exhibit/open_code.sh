#!/bin/bash
# Open the /code window (controller: source code display).
set -e

rm -rf /tmp/chrome-kiosk-code
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --user-data-dir=/tmp/chrome-kiosk-code \
  --kiosk \
  --autoplay-policy=no-user-gesture-required \
  http://localhost:8000/code > /dev/null 2>&1 &