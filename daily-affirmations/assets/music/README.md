# Background music

Drop your royalty-free / properly licensed background tracks in this folder
(`.mp3`, `.wav`, `.m4a`, `.aac`, `.flac`, `.ogg`). Every generation run picks
one at random per video, trims/loops it to length, and ducks it under the
voiceover automatically — you don't need to pre-edit anything.

## The two placeholder tracks

`placeholder-calm-pad-c-major.mp3` and `placeholder-calm-pad-g-minor.mp3` are
synthesized ambient pads generated with FFmpeg (three sine tones + a low-pass
filter + fades — see `scripts/generate-placeholder-music.sh`). They exist so
the app works out of the box and so the full pipeline can be tested without
needing licensed music first.

**Replace them** with real tracks from your music library (Epidemic Sound,
Artlist, etc.) before publishing anything. Delete the placeholders once you've
added your own, or just leave them mixed into the pool — they're harmless,
just not particularly interesting.
