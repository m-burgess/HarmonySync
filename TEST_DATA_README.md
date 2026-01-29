# Test Data - Service Order Zip File

## Overview

This repository includes a test zip file named **"Service Order 01-29-2026.zip"** that contains a complete service order structure with dummy files for testing the HarmonySync Presenter application.

## File Structure

The zip file contains the following structure:

```
Service Order 01/29/2026/
├── Pre-Service Music.txt           # YouTube playlist link for pre-service music
├── Announcements/                  # Folder for announcement slides
│   ├── announcement_1.png         # 5 test images total
│   ├── announcement_2.png
│   ├── announcement_3.png
│   ├── announcement_4.png
│   └── announcement_5.png
├── Sermon/                         # Folder for sermon materials
│   ├── youtube-links.txt          # YouTube links for sermon videos
│   ├── sermon_slide_1.png         # 10 test sermon slide images
│   ├── sermon_slide_2.png
│   ├── ...
│   └── sermon_slide_10.png
├── Worship/                        # Folder for worship songs
│   ├── Song 1/                    # First worship song
│   │   ├── lyrics.txt             # Song lyrics with verse/chorus sections
│   │   ├── background.mp4         # Background video for display
│   │   ├── vocals.wav             # 12 multitrack audio files total
│   │   ├── lead_guitar.wav
│   │   ├── rhythm_guitar.wav
│   │   ├── bass.wav
│   │   ├── keys.wav
│   │   ├── pad.wav
│   │   ├── drums.wav
│   │   ├── kick.wav
│   │   ├── snare.wav
│   │   ├── hats.wav
│   │   ├── backing_vocals_1.wav
│   │   └── backing_vocals_2.wav
│   ├── Song 2/                    # Second worship song
│   │   ├── lyrics.txt
│   │   ├── background.mp4
│   │   ├── vocals.wav             # 5 multitrack audio files
│   │   ├── guitar.wav
│   │   ├── keys.wav
│   │   ├── bass.wav
│   │   └── drums.wav
│   ├── Song 3/                    # Third worship song
│   │   ├── lyrics.txt
│   │   ├── background.mp4
│   │   ├── vocals.wav             # 2 audio files (acoustic setup)
│   │   └── acoustic_guitar.wav
│   ├── Song 4/                    # Fourth worship song
│   │   ├── lyrics.txt
│   │   ├── background.mp4
│   │   └── SPLIT.wav              # 1 stereo split audio file for testing
│   └── Song 5/                    # Fifth worship song
│       ├── lyrics.txt
│       ├── background.mp4
│       └── Stereo.wav             # 1 stereo audio file for testing
└── Special Service/                # Folder for special events (weddings, funerals)
    ├── special_slide_1.png        # 5 test images
    ├── special_slide_2.png
    ├── special_slide_3.png
    ├── special_slide_4.png
    ├── special_slide_5.png
    └── special_video.mp4          # Video for special service

```

## Contents Details

### 1. Pre-Service Music
- **File**: `Pre-Service Music.txt`
- **Content**: YouTube playlist link for background music before service starts
- **Example URL**: https://www.youtube.com/watch?v=0feDrogcDe8&list=PLDbDjx00HHi3qzvbMhc08PphwPZSzWSN0

### 2. Announcements
- **Folder**: `Announcements/`
- **Contains**: 5 PNG image files
- **Purpose**: Slides that loop during announcement time

### 3. Sermon
- **Folder**: `Sermon/`
- **Contains**: 
  - `youtube-links.txt` with 2 YouTube video URLs
  - 10 PNG sermon slide images
- **Purpose**: Visual aids and video links for sermon presentation

### 4. Worship
- **Folder**: `Worship/`
- **Contains**: 5 song folders
- **Each Song Includes**:
  - `lyrics.txt`: Song lyrics formatted with verses and choruses
  - `background.mp4`: Video background for visual display
  - `.wav` files: Audio tracks for testing different multitrack scenarios

**Song Track Details**:
- **Song 1**: 12 tracks (full band with backing vocals) - tests complex multitrack mixing
- **Song 2**: 5 tracks (standard band setup) - tests moderate multitrack mixing
- **Song 3**: 2 tracks (acoustic setup) - tests minimal multitrack mixing
- **Song 4**: 1 track (`SPLIT.wav`) - tests stereo split file handling
- **Song 5**: 1 track (`Stereo.wav`) - tests standard stereo file handling

### 5. Special Service
- **Folder**: `Special Service/`
- **Contains**: 
  - 5 PNG image files
  - 1 MP4 video file
- **Purpose**: Materials for special events like weddings, funerals, baptisms, etc.

## Usage

1. **Extract the Zip File**: Unzip `Service Order 01-29-2026.zip` to access the folder structure
2. **Test Multitrack Player**: Use the Worship song folders to test the multitrack audio player with various track counts (1-12 tracks)
3. **Test Audio File Types**: Songs 4 and 5 test different stereo file scenarios (SPLIT.wav and Stereo.wav)
4. **Test Slide Management**: Use Announcements and Sermon folders to test image slide displays
5. **Test Video Playback**: Use the MP4 files in worship songs and special service for video background testing
6. **Test Lyrics Display**: Use lyrics.txt files to test the lyrics display system
7. **Test Pre-Service Music**: Use the YouTube link to test pre-service music automation

## File Formats

All files in this test package are minimal dummy files:
- **PNG Images**: Valid PNG format (minimal 1x1 pixel images)
- **WAV Files**: Valid WAV format (44.1kHz, stereo, 16-bit PCM)
- **MP4 Videos**: Valid MP4 format (minimal video container)
- **TXT Files**: Plain text files with relevant content

## Purpose

This test data package provides a realistic service order structure that:
- Demonstrates the expected folder organization for HarmonySync
- Allows testing of all major features (audio, video, images, lyrics)
- Provides examples of varying complexity (1-12 audio tracks per song)
- Tests different audio file scenarios (multitrack, stereo split, and standard stereo)
- Includes both worship and special service scenarios
- Uses minimal file sizes for quick loading and testing

## Notes

- All media files are minimal dummy files created for testing purposes
- The folder naming convention follows typical church service organization
- YouTube links are real examples but can be replaced with any valid URLs
- Lyrics are excerpts from well-known worship songs for demonstration purposes
