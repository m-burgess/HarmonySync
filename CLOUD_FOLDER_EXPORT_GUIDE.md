# Cloud Folder Export and Import Guide

## Overview

HarmonySync now supports exporting songs to cloud-synced folders (like Google Drive, Dropbox, OneDrive) and importing them back without needing to reconvert the audio files. This feature allows you to:

1. Export songs with pre-converted OGG files, lyrics, and background CSS
2. Share these folders via cloud storage services
3. Import them on other machines without reconversion
4. Save time by reusing already-converted audio files

## How It Works

### Export Process

When you export a song:
1. All track files (already in OGG format) are copied to the destination folder
2. The `lyrics.txt` file is created with the song's lyrics
3. A `background.css` file is generated with a random gradient background

The exported folder structure looks like:
```
Song Title/
├── 00_Track1.ogg
├── 01_Track2.ogg
├── 02_Track3.ogg
├── lyrics.txt
└── background.css
```

### Import Process

When you import a song folder:
1. The system detects if audio files are already in OGG format
2. If all files are OGG, they are copied directly without conversion
3. If files are in other formats (WAV, MP3, AIFF, FLAC, M4A), they are converted to OGG
4. Lyrics are read from `lyrics.txt`
5. The song and track metadata are stored in the database

## Usage Instructions

### Exporting a Song

1. Open HarmonySync
2. Go to the Song Library tab
3. Search for the song you want to export
4. Click the export button (download icon) next to the song
5. Select the destination folder (e.g., your Google Drive sync folder)
6. The song folder will be created with all necessary files

**Note**: The export destination should be a cloud-synced folder like:
- `~/Google Drive/HarmonySync Songs/`
- `~/Dropbox/HarmonySync Songs/`
- `~/OneDrive/HarmonySync Songs/`

### Importing a Song

1. Open HarmonySync
2. Go to File → Import → Song (or press Cmd/Ctrl+Shift+I)
3. Navigate to the cloud-synced folder
4. Select the song folder you want to import
5. The import will be much faster since conversion is skipped for OGG files

## Cloud Storage Service Compatibility

This feature works with any cloud storage service that provides local folder synchronization:

- **Google Drive**: Use the Google Drive desktop app to sync folders locally
- **Dropbox**: Use the Dropbox desktop app to sync folders locally
- **OneDrive**: Use the OneDrive desktop app to sync folders locally
- **iCloud Drive**: Use iCloud Drive on macOS
- **Other services**: Any service that syncs to a local folder will work

## Benefits

1. **Time Savings**: Skip audio conversion when importing pre-converted songs
2. **Storage Efficiency**: Share converted files across multiple machines
3. **Collaboration**: Multiple users can access the same song library via cloud storage
4. **Portability**: Move songs between machines without losing quality or requiring reconversion
5. **Backup**: Cloud storage provides automatic backup of your song library

## Technical Details

### File Format
- Audio files are converted to OGG Vorbis format with quality setting 3
- All tracks are mono (converted if necessary)
- Sample rate is standardized to 44100 Hz

### Database
- Each imported song is stored in the SQLite database
- Track metadata includes file paths and track names
- The system supports up to 32 tracks per song

### File Paths
- Exported songs create a folder named after the song title
- Track files are numbered (00_, 01_, etc.) for consistent ordering
- All paths are stored as absolute paths in the database

## Troubleshooting

### Export Issues

**Problem**: Export fails with "Track file not found" error
- **Solution**: The song may not have been properly imported. Try re-importing the song first.

**Problem**: Can't find the exported folder
- **Solution**: Check that you selected the correct destination folder. The song folder is created inside the selected location.

### Import Issues

**Problem**: Import takes a long time even with OGG files
- **Solution**: Make sure ALL audio files in the folder are OGG format. If there's even one file in a different format, the entire import will use conversion.

**Problem**: "No supported audio files found" error
- **Solution**: Ensure the folder contains at least one audio file in a supported format (OGG, WAV, MP3, AIFF, FLAC, M4A).

**Problem**: Lyrics don't appear after import
- **Solution**: Make sure the `lyrics.txt` file exists in the folder and contains valid text.

## Best Practices

1. **Organize Your Cloud Folder**: Create a dedicated folder for HarmonySync exports in your cloud storage
2. **Use Descriptive Names**: Song folder names should be clear and unique
3. **Verify Exports**: After exporting, check that all files are present in the destination folder
4. **Keep Backups**: Even with cloud storage, maintain additional backups of important songs
5. **Test Imports**: After exporting to a cloud folder, test importing on another machine to verify everything works

## Future Enhancements

Potential future improvements could include:
- Batch export/import of multiple songs
- Compression of exported folders for easier sharing
- Automatic sync detection and import
- Export to different quality settings
- Include album art and additional metadata
