# Audio Transposition Feature

## Overview
The audio transposition feature allows users to transpose multitrack audio files up or down by semitones using FFmpeg. This is useful for changing the key of a song to match a vocalist's range or for other musical purposes.

## How It Works

### UI Components
Two buttons are located at the top of the multitrack player:
- **Transpose Up** (green with up arrow): Transposes audio up by 1 semitone
- **Transpose Down** (red with down arrow): Transposes audio down by 1 semitone

### File Processing
When you click a transpose button:

1. **File Analysis**: The system scans all audio files in the currently loaded directory
2. **Intelligent Filtering**: Files are categorized into two groups:
   - **Files to Transpose**: Regular vocal and instrument tracks
   - **Files to Copy**: Rhythm section files (guide, click, drums, percussion, shakers)
   
3. **Folder Creation**: A new folder is created with the naming format:
   - For transpose up: `[Original Folder Name] + [N] semitones`
   - For transpose down: `[Original Folder Name] - [N] semitones`
   - Example: `Amazing Grace + 1 semitones` or `How Great Thou Art - 2 semitones`

4. **Processing**:
   - Rhythm section files are copied directly (no transposition)
   - Other audio files are transposed using FFmpeg's audio filters
   - Progress is shown in a modal dialog

5. **Auto-reload**: After transposition completes, the new tracks are automatically loaded into the multitrack player

### Progress Modal
During transposition, a modal displays:
- Current file being processed
- Progress bar showing overall completion
- File count (e.g., "5 / 10 files")
- Status messages
- Animated spinner while processing

### FFmpeg Implementation
The transposition uses FFmpeg's audio filters:
- `asetrate`: Changes the sample rate to shift pitch
- `aresample`: Resamples back to standard rate
- `atempo`: Adjusts tempo to maintain original duration

Formula: For N semitones, the rate multiplier is `2^(N/12)`

## Requirements
- FFmpeg must be installed and available in the system PATH
- Audio files must be in a supported format (MP3, WAV, OGG, M4A, FLAC)
- Sufficient disk space for the new transposed files

## Usage

1. Load a song with multitrack audio files
2. Click the **Transpose Up** or **Transpose Down** button
3. Wait for the transposition to complete (progress shown in modal)
4. The new transposed tracks will load automatically

## Excluded Files
Files with these keywords in their names are **not transposed** (only copied):
- `guide`
- `click`
- `drums`
- `percussion`
- `shakers`

These files typically contain rhythm or backing tracks that should maintain their original pitch.

## Technical Details

### File Naming Conventions
The system is case-insensitive when checking for excluded files. For example:
- `Click Track.mp3` → Copied (not transposed)
- `DRUMS_Final.wav` → Copied (not transposed)
- `Lead Vocal.mp3` → Transposed
- `Bass.ogg` → Transposed

### Audio Quality
The transposition maintains audio quality by:
- Using high-quality FFmpeg filters
- Preserving the original sample rate (48kHz)
- Applying proper resampling and tempo adjustment

### Error Handling
- If FFmpeg is not installed, an error will be displayed
- If transposition fails for a file, the error is reported
- The system will attempt to process all files even if one fails

## Troubleshooting

### "No directory loaded" error
Make sure you have loaded audio files before attempting to transpose.

### "FFmpeg failed to transpose" error
- Verify FFmpeg is installed: Run `ffmpeg -version` in terminal
- Check that FFmpeg is in your system PATH
- Ensure the audio file is not corrupted

### Buttons are disabled
The transpose buttons are only enabled when:
- Audio tracks are loaded
- A valid directory path is available

## Future Enhancements
Potential improvements for future versions:
- Support for transposing by multiple semitones at once
- Option to specify custom excluded file patterns
- Batch transposition of multiple songs
- Quality settings for transposition
