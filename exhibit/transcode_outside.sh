#!/bin/bash
# Transcode a raw camera file into a browser-safe outside-camera video.
#
# Camera exports (e.g. Sony XAVC) often carry PCM ("twos") audio and a
# proprietary rtmd metadata track that Chrome's <video> element can't
# decode, which silently breaks playback. This re-encodes to H.264/1080p
# with AAC audio for broader compatibility.
#
# Usage: exhibit/transcode_outside.sh <source-video> <execution-dir>
set -e

SRC="$1"
DEST_DIR="$2"

if [ -z "$SRC" ] || [ -z "$DEST_DIR" ]; then
  echo "Usage: $0 <source-video> <execution-dir>" >&2
  exit 1
fi

DEST="$DEST_DIR/video_outside.mp4"

if [ -e "$DEST" ] && [ "$SRC" -ef "$DEST" ]; then
  echo "Source and destination are the same file — rename/move the source first." >&2
  exit 1
fi

ffmpeg -i "$SRC" -vf "scale=-2:1080" -c:v libx264 -preset veryfast -crf 20 -c:a aac -b:a 128k -movflags +faststart "$DEST"
echo "Wrote $DEST"
