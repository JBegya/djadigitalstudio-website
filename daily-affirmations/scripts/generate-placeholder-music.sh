#!/usr/bin/env bash
# Regenerates the two placeholder ambient pads in assets/music/.
# Not part of the app's runtime — a one-off utility kept for reproducibility.
set -euo pipefail
cd "$(dirname "$0")/.."

FF="node_modules/@ffmpeg-installer/linux-x64/ffmpeg"
if [ ! -x "$FF" ]; then FF="ffmpeg"; fi

"$FF" -y -hide_banner -loglevel error \
  -f lavfi -i "sine=frequency=220:duration=45" \
  -f lavfi -i "sine=frequency=277.18:duration=45" \
  -f lavfi -i "sine=frequency=329.63:duration=45" \
  -filter_complex "[0:a][1:a][2:a]amix=inputs=3:duration=longest:weights='1 0.8 0.6',volume=0.12,afade=t=in:d=3,afade=t=out:st=41:d=4,lowpass=f=2200" \
  -ac 2 -ar 44100 -codec:a libmp3lame -b:a 160k assets/music/placeholder-calm-pad-c-major.mp3

"$FF" -y -hide_banner -loglevel error \
  -f lavfi -i "sine=frequency=196:duration=45" \
  -f lavfi -i "sine=frequency=233.08:duration=45" \
  -f lavfi -i "sine=frequency=293.66:duration=45" \
  -filter_complex "[0:a][1:a][2:a]amix=inputs=3:duration=longest:weights='1 0.7 0.5',volume=0.11,afade=t=in:d=4,afade=t=out:st=40:d=5,lowpass=f=2000" \
  -ac 2 -ar 44100 -codec:a libmp3lame -b:a 160k assets/music/placeholder-calm-pad-g-minor.mp3

echo "Regenerated placeholder tracks in assets/music/"
