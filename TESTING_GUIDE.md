# MOGG Implementation - Testing Guide

## Prerequisites
- System must have ffmpeg installed with libvorbis support
- Node.js and required npm packages installed
- Test song folders with multiple audio tracks (WAV, MP3, FLAC, etc.)

## Test Cases

### Test Case 1: Basic Import
**Objective**: Verify that a song folder with multiple tracks can be imported and converted to MOGG

**Steps**:
1. Create a test folder with:
   - 3-5 audio files (mix of WAV, MP3, etc.)
   - A lyrics.txt file
2. Import the song folder using the UI
3. Check the song library folder

**Expected Results**:
- Single .ogg file created (e.g., "SongName_multitrack.ogg")
- Database entry created with mogg_file_path populated
- Track records created with format "TrackName:0", "TrackName:1", etc.
- No error messages

### Test Case 2: Playback
**Objective**: Verify that imported MOGG tracks can be loaded and played

**Steps**:
1. After importing (Test Case 1), load the song in the setlist
2. Verify all tracks appear in the multitrack player
3. Play the song
4. Test individual track controls (mute, solo, pan)

**Expected Results**:
- All tracks load successfully
- Tracks play in perfect sync
- Individual track controls work correctly
- Track names displayed without channel index

### Test Case 3: Edge Cases
**Objective**: Test boundary conditions and error handling

#### 3a: Maximum Tracks
**Steps**:
1. Create a song folder with 32 audio tracks
2. Import the folder

**Expected Results**:
- Import succeeds
- All 32 tracks playable

#### 3b: Too Many Tracks
**Steps**:
1. Create a song folder with 33+ audio tracks
2. Import the folder

**Expected Results**:
- Import fails with clear error message
- No partial data in database

#### 3c: Mono and Stereo Mix
**Steps**:
1. Create a song folder with:
   - 2 mono tracks
   - 2 stereo tracks
2. Import the folder

**Expected Results**:
- All tracks converted to mono correctly
- MOGG file has 4 channels
- All tracks play at same volume level

### Test Case 4: Backward Compatibility
**Objective**: Verify that old songs with individual OGG files still work

**Steps**:
1. Load a song imported before the MOGG changes
2. Play the song
3. Test track controls

**Expected Results**:
- Old songs load and play normally
- No errors or warnings
- All functionality works as before

### Test Case 5: Channel Extraction
**Objective**: Verify correct channel extraction from MOGG file

**Steps**:
1. Import a song with 4 distinct tracks (e.g., drums, bass, guitar, vocals)
2. Load the song
3. Solo each track individually and listen

**Expected Results**:
- Each track plays independently
- Correct audio for each track (e.g., drums track plays drums)
- No channel bleed or mixing

### Test Case 6: Database Migration
**Objective**: Verify database migration adds mogg_file_path column

**Steps**:
1. Start app with existing database (without mogg_file_path)
2. Check that app starts successfully
3. Import a new song

**Expected Results**:
- No database errors
- New column added automatically
- Existing songs have NULL mogg_file_path
- New songs have populated mogg_file_path

## Manual Verification Checklist

### Backend
- [ ] convert_to_mogg_helper creates multi-channel OGG file
- [ ] All input tracks converted to mono
- [ ] Tracks merged in correct order
- [ ] MOGG file copied to song library
- [ ] Database records created correctly
- [ ] Track names stored with channel index

### Frontend
- [ ] loadMoggChannel extracts correct channel
- [ ] Mono buffer created correctly
- [ ] Channel index parsed correctly
- [ ] Legacy files still load correctly
- [ ] Error handling works properly

### Integration
- [ ] Import workflow completes successfully
- [ ] Loading workflow completes successfully
- [ ] Playback works correctly
- [ ] All multitrack controls functional
- [ ] No memory leaks (multiple imports)
- [ ] No audio glitches or pops

## Performance Testing

### Import Performance
Test import time for different track counts:
- 2 tracks: < 30 seconds
- 5 tracks: < 60 seconds
- 10 tracks: < 2 minutes
- 20 tracks: < 5 minutes

### Playback Performance
- Loading time for MOGG: < 5 seconds
- Channel extraction: < 1 second per channel
- Memory usage: Reasonable (check browser DevTools)
- CPU usage during playback: < 50%

## Common Issues and Solutions

### Issue 1: FFmpeg not found
**Symptom**: "Failed to spawn ffmpeg process"
**Solution**: Install ffmpeg with libvorbis support

### Issue 2: Channel count mismatch
**Symptom**: "Channel X does not exist in MOGG file"
**Solution**: Check database track records for correct channel indices

### Issue 3: Audio not in sync
**Symptom**: Tracks play at different times
**Solution**: Verify MOGG file has all tracks at same length/sample rate

### Issue 4: Poor audio quality
**Symptom**: MOGG playback sounds compressed or distorted
**Solution**: Adjust quality setting in convert_to_mogg_helper (currently -q:a 4)

### Issue 5: Import hangs
**Symptom**: Import progress bar stops
**Solution**: Check ffmpeg stderr output, verify input files are valid

## Validation Commands

### Check MOGG file properties
```bash
ffprobe -i song_multitrack.ogg
```
Expected output should show multiple audio streams/channels

### Check database
```sql
-- Check songs table
SELECT id, title, mogg_file_path FROM songs;

-- Check tracks table
SELECT song_id, track_name, file_path FROM tracks WHERE song_id = X;
```

### Check Web Audio buffer
```javascript
// In browser console after loading song
getTracks().forEach(track => {
  console.log(track.name, track.buffer.numberOfChannels, track.buffer.duration);
});
```
All tracks should have 1 channel (mono) and same duration

## Regression Testing

After any changes to the MOGG implementation:
1. Re-run all test cases
2. Verify no existing functionality broken
3. Check console for warnings/errors
4. Monitor memory usage over multiple imports
5. Test with various audio formats and sample rates

## Notes
- Keep test song folders of various sizes for regression testing
- Document any issues found during testing
- Save console logs for debugging
- Take screenshots of UI at key steps
