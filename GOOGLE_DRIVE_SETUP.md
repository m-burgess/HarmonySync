# Google Drive Integration Setup

HarmonySync now supports fetching audio files directly from Google Drive, allowing you to sync your worship music library automatically.

## Setup Instructions

### 1. Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google Drive API:
   - Go to "APIs & Services" > "Library"
   - Search for "Google Drive API"
   - Click "Enable"

### 2. Create OAuth 2.0 Credentials

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth client ID"
3. Select "Desktop app" as the application type
4. Name it "HarmonySync Desktop"
5. Click "Create"
6. Download the credentials JSON file

### 3. Configure HarmonySync

1. Save the downloaded credentials file to:
   - **Windows**: `%APPDATA%/harmonysync/google-drive-credentials.json`
   - **Linux**: `~/.config/harmonysync/google-drive-credentials.json`
   - **macOS**: `~/Library/Application Support/harmonysync/google-drive-credentials.json`

2. On first use, HarmonySync will open a browser window to authenticate
3. Grant the requested permissions
4. The authentication token will be saved automatically

## Using Google Drive Integration

### Syncing Audio Files

1. Open HarmonySync
2. Go to Settings > Google Drive
3. Click "Authenticate" if not already authenticated
4. Browse your Google Drive folders
5. Select a folder containing audio files
6. Click "Sync Folder" to download all audio files
7. Files are checked for updates and only new/modified files are downloaded

### Features

- **Automatic Sync**: Only downloads new or modified files
- **Progress Tracking**: Real-time progress updates during sync
- **Selective Sync**: Choose which folders to sync
- **Pre-playback Verification**: Audio files are verified before playback
- **FFmpeg Transposition**: Downloaded files can be transposed before playback

### Audio File Requirements

For best results, organize your Google Drive audio files as:

```
Google Drive/
└── Worship Music/
    ├── Song 1/
    │   ├── track1.mp3
    │   ├── track2.mp3
    │   └── lyrics.txt
    ├── Song 2/
    │   ├── track1.wav
    │   ├── track2.wav
    │   └── lyrics.txt
    └── ...
```

### Supported Audio Formats

- MP3
- WAV
- OGG
- FLAC
- M4A
- AAC

All formats are automatically converted to OGG for optimal playback performance.

## Troubleshooting

### Authentication Issues

If you encounter authentication problems:

1. Delete the token file:
   - **Windows**: `%APPDATA%/harmonysync/google-drive-token.json`
   - **Linux**: `~/.config/harmonysync/google-drive-token.json`
   - **macOS**: `~/Library/Application Support/harmonysync/google-drive-token.json`

2. Restart HarmonySync and re-authenticate

### API Quota Limits

Google Drive API has usage quotas. If you experience issues:

- Wait a few minutes before retrying
- Sync during off-peak hours
- Contact Google Cloud support to increase quotas

### File Download Failures

If files fail to download:

- Check your internet connection
- Verify file permissions in Google Drive
- Ensure you have sufficient local disk space
- Check the application logs for detailed error messages

## Security Notes

- Credentials and tokens are stored locally
- Never share your credentials file
- Revoke access from Google Account settings if needed
- HarmonySync only requests read-only access to your Drive

## Advanced Configuration

### Custom Credentials Path

Set environment variable before starting HarmonySync:

```bash
export GOOGLE_DRIVE_CREDENTIALS_PATH="/path/to/credentials.json"
```

### Offline Mode

Once files are synced, HarmonySync works offline. Re-sync when you need to fetch updates.

## Need Help?

- Check the [main README](../README.md) for general support
- Review application logs for detailed error information
- Open an issue on GitHub if problems persist
