#!/bin/bash
# Open the /video window (follower: video display).
set -e

open -na "Google Chrome" --args --kiosk --new-window \
  --autoplay-policy=no-user-gesture-required http://localhost:8000/video

# Try to position on secondary display if multiple displays available
sleep 2
osascript 2>/dev/null <<'APPLESCRIPT' || true
try
  tell application "System Events"
    set displayCount to count of displays
  end tell

  if displayCount >= 2 then
    tell application "Google Chrome"
      set bounds of window 1 to {2560, 0, 5120, 1440}
    end tell
  end if
end try
APPLESCRIPT
