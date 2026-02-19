# Project Manager Plans - Multiple Song Preloading

## Backend Expert Plan (GoLang)
- [ ] **Verify Non-Blocking**: Confirm `LoadSongTrack` does not block audio playback loop.
- [ ] **Memory Check**: Verify memory is released when `ClearSong` is called.
- [ ] **Integration Test**: Create a test script that loads a song while another plays.

## Frontend Expert Plan
- [ ] **Implement Preloading Logic**: Update `AudioViewModel` to identify "Next Song".
- [ ] **Trigger Load**: call `loadSongTrack` for the next song's tracks when the current song starts (or when next song is selected).
- [ ] **Activate**: Call `activateSong` when the user clicks to play the next song.

## QA Testing Expert Plan
- [ ] **Automated Test**: Run `tests/preload_test.go` (to be created).
- [ ] **Manual Verification**: Play Song A, observe logs for Song B loading, switch to Song B.
