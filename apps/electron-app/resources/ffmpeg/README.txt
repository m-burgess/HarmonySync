Place a known-good FFmpeg binary in this folder for packaging.

Expected filenames:
- Windows: ffmpeg.exe
- macOS/Linux: ffmpeg

At runtime, the audio service looks in:
- process.resourcesPath/ffmpeg/
- apps/harmonysync-audio-service/bin/
- bin/
- PATH

You can also override with the environment variable HARMONYSYNC_FFMPEG_PATH.
