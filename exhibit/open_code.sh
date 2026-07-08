#!/bin/bash
# Open the /code window (controller: source code display).
set -e

open -na "Google Chrome" --args --kiosk --new-window \
  --autoplay-policy=no-user-gesture-required http://localhost:8000/code

# Try to position on primary display if multiple displays available
sleep 2
osascript 2>/dev/null <<'APPLESCRIPT' || true
try
  tell application "System Events"
    set displayCount to count of displays
  end tell

  if displayCount >= 1 then
    tell application "Google Chrome"
      set bounds of window 1 to {0, 0, 2560, 1440}
    end tell
  end if
end try
APPLESCRIPT
