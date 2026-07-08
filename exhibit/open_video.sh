#!/bin/bash
# Open the /video window (follower: video display).
set -e

rm -rf /tmp/chrome-kiosk-video
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --user-data-dir=/tmp/chrome-kiosk-video \
  --kiosk \
  --autoplay-policy=no-user-gesture-required \
  http://localhost:8000/video > /dev/null 2>&1 &