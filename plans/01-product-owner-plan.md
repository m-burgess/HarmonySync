# Product Owner Plan - Multiple Song Preloading

## Vision
To ensure seamless worship experiences, HarmonySync must be able to preload the next song's audio tracks while the current song is playing. This prevents "loading pauses" between songs and allows for instant transitions.

## Requirements
1.  **Non-Blocking Loading**: Loading tracks for a future song MUST NOT interrupt or stutter the currently playing audio.
2.  **Instant Switch**: Switching to a preloaded song (Activation) must be near-instant (< 100ms).
3.  **Memory Management**: The system should handle loading at least 2 songs (current + next) with multiple tracks (stems) each (approx 10-15 tracks per song).
4.  **Feedback**: The system should provide status updates when a song is fully loaded.

## Acceptance Criteria
- [ ] Can load a "Next Song" (Song B) while "Current Song" (Song A) is playing.
- [ ] Playback of Song A does not stutter during loading of Song B.
- [ ] Activating Song B instantly switches audio context.
- [ ] Memory usage remains stable (old songs cleared when requested).
