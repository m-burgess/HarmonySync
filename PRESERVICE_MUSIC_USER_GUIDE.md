# Pre-Service Music - User Guide

## How to Use Pre-Service Music

### 1. Open Pre-Service Music
Click the **Play Icon** (▶️) in the left activity bar (second icon from the top).

### 2. First Time Setup
When you open Pre-Service Music for the first time, you'll see a setup screen:

```
┌──────────────────────────────────────────────────────┐
│  Pre-Service Music                              ✕    │
├──────────────────────────────────────────────────────┤
│                                                       │
│         Enter Your Playlist URL                       │
│   Paste a YouTube Music or YouTube playlist link     │
│        to play pre-service music                      │
│                                                       │
│   ┌───────────────────────────────────────────┐     │
│   │ https://music.youtube.com/playlist?list=..│     │
│   └───────────────────────────────────────────┘     │
│                                                       │
│         [Save & Play]  [Cancel]                      │
│                                                       │
│   Examples:                                           │
│   • YouTube Music: https://music.youtube.com/...     │
│   • YouTube Playlist: https://www.youtube.com/...    │
│                                                       │
└──────────────────────────────────────────────────────┘
```

### 3. Enter Your Playlist URL

**Getting a YouTube Music Playlist URL:**
1. Open YouTube Music (music.youtube.com)
2. Navigate to your playlist
3. Copy the URL from the browser address bar
   - Example: `https://music.youtube.com/playlist?list=PLxxxxxxxxxxxxxx`

**Getting a YouTube Playlist URL:**
1. Open YouTube (youtube.com)
2. Navigate to your playlist
3. Copy the URL from the browser address bar
   - Example: `https://www.youtube.com/playlist?list=PLxxxxxxxxxxxxxx`

### 4. Playing Your Music
After clicking "Save & Play", the player will appear:

```
┌──────────────────────────────────────────────────────┐
│  Pre-Service Music                              ✕    │
├──────────────────────────────────────────────────────┤
│  Playing playlist with shuffle    [Change Playlist]  │
│  and loop enabled                                    │
│                                                       │
│  ╔══════════════════════════════════════════════╗   │
│  ║                                               ║   │
│  ║         YouTube Player                        ║   │
│  ║         (Playing your playlist)               ║   │
│  ║                                               ║   │
│  ║                                               ║   │
│  ╚══════════════════════════════════════════════╝   │
│                                                       │
└──────────────────────────────────────────────────────┘
```

**Features:**
- ✅ **Auto-play**: Music starts immediately
- ✅ **Shuffle**: Songs play in random order
- ✅ **Loop**: Playlist repeats indefinitely
- ✅ **Persistent**: Your playlist URL is saved for next time

### 5. Changing Your Playlist
Click the **"Change Playlist"** button in the player view to enter a new URL.

### 6. Closing the Player
Click the **✕** button in the top-right corner to close the Pre-Service Music window.

## Tips

### Best Practices
- **Use Public Playlists**: Make sure the playlist is public or accessible
- **Test Before Service**: Open and test the playlist before your service starts
- **Volume Control**: Adjust volume using the YouTube player controls
- **Keep it Running**: Leave the window open during pre-service time

### Troubleshooting

**Playlist doesn't load?**
- Check if the URL is correct
- Make sure the playlist is public
- Try copying the URL directly from the address bar

**No sound?**
- Check system volume
- Check if YouTube player is muted (look for mute icon in player)
- Ensure your internet connection is working

**Player is stuck?**
- Close and reopen the Pre-Service Music window
- Click "Change Playlist" and re-enter the URL

## Activity Bar Icons (Left Side)

From top to bottom:
1. **Presentation Icon** - Service Order (main view)
2. **Play Icon** ▶️ - **Pre-Service Music** ⭐ NEW!
3. **Music Note** - Import Song
4. **Presentation Icon** - Import Presentation  
5. **Gear Icon** - Settings

## Technical Details

**Saved Location**: Your playlist URL is saved in:
- Linux: `~/.local/share/{app-name}/preservice-config.json`
- Windows: `%APPDATA%\{app-name}\preservice-config.json`
- macOS: `~/Library/Application Support/{app-name}/preservice-config.json`

**Supported URLs**:
- YouTube Music playlists
- YouTube playlists
- YouTube embed URLs

**Requirements**:
- Internet connection
- Valid YouTube/YouTube Music playlist URL
