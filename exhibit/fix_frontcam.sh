#!/bin/bash
# De-fragment / faststart a frontcam recording so the exhibit viewer can seek it.
#
# Phone recordings are often fragmented MP4 (moof/mdat fragments, no total
# duration in the header). The exhibit video page constantly seeks the element
# to sync with the code clock; a fragmented file reports duration=Infinity and
# is treated as non-seekable, so it appears frozen. This rewrites it as a plain
# progressive MP4 with a single moov up front (+faststart).
#
# Usage: exhibit/fix_frontcam.sh <execution-dir>
set -e
DIR="$1"
[ -z "$DIR" ] && { echo "Usage: $0 <execution-dir>" >&2; exit 1; }
SRC="$DIR/video_1.mp4"
TMP="$DIR/video_1_fixed.mp4"
ffmpeg -i "$SRC" -c copy -movflags +faststart "$TMP"
mv "$TMP" "$SRC"
echo "Fixed $SRC"
