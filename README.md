# HarmonySync Presenter - Modern Worship & Media Software

A comprehensive presentation software built with an Electron (Node.js) backend and a React (JavaScript) frontend, designed for worship services and live events. HarmonySync offers robust multitrack audio playback, dynamic media display, and flexible presentation capabilities.

## ✨ Key Features

### 🎯 Presentation System
- **Dynamic Slide Management**: Seamlessly navigate through songs and media slides.
- **Confidence Monitor**: Dedicated display for presenters, showing current/next slides, clock, and countdowns.
- **Audience Screen**: Separate, optimized display for the main audience.
- **Lower Thirds Window**: Dedicated output for lower third graphics with chroma key support.

### 🎵 Multitrack Audio Player
- **Flexible Track Controls**: Individual volume faders, LCR pan, and mute controls for each audio track.
- **Efficient Audio Handling**: Utilizes FFmpeg for on-the-fly conversion of various audio formats to Ogg, optimizing memory usage and playback performance.
- **Audio Transposition**: Transpose audio files up or down by semitones using FFmpeg. Creates a new folder with transposed files while preserving rhythm section tracks (guide, click, drums, percussion, shakers).
- **Intuitive Layout**: Track controls arranged in a grid (6 per row) with vertical scrolling for easy access.
- **Visual Feedback**: LCR pan buttons highlight yellow when active; mute button highlights red when engaged.
- **Default Volume**: All track faders initialize at 100% volume on load.
- **Config Persistence**: Save/load mixer configurations per song.
- **Synchronized Playback**: All tracks are synchronized before playback starts to ensure perfect timing.

### ☁️ Google Drive Integration (NEW)
- **Cloud Storage**: Fetch audio files directly from Google Drive
- **Auto-Sync**: Automatically sync worship music libraries
- **Selective Download**: Only download new or modified files
- **Pre-playback Verification**: Audio files are verified and ready before playback
- **OAuth2 Authentication**: Secure authentication with Google Drive API

See [GOOGLE_DRIVE_SETUP.md](GOOGLE_DRIVE_SETUP.md) for setup instructions.

### 🎥 Media & Display
- **Video Backgrounds**: Support for various video formats with smooth looping, streamed efficiently via a local HTTP server.
- **Image Support**: Display PNG, JPG, JPEG background images.
- **Text Centering**: All text on Audience and Confidence Monitors is precisely centered for optimal readability.
- **Chroma Key Support**: Lower Thirds window features a bright green background for easy chroma keying in external mixers.
- **1080p Output**: Dedicated windows (Audience, Confidence, Lower Thirds) output at 1080p resolution.

## 🚀 New Features Highlight

### Automatic Lyrics Fetching (Latest)
Streamline your worship service preparation with automatic lyrics fetching:
- **Genius Integration**: Fetch lyrics directly from Genius API with one click
- **Smart Formatting**: Automatically detects and formats song sections (Verse, Chorus, Bridge, etc.)
- **One-Click Download**: Simple download button (📥) for songs without lyrics
- **Auto-Save**: Lyrics are saved directly to `lyrics.txt` in song folders
- **Review & Edit**: Edit button (✏️) appears after fetching for quick corrections
- **No Manual Typing**: Save time preparing song folders for volunteers

See [LYRICS_FETCHING_GUIDE.md](LYRICS_FETCHING_GUIDE.md) for detailed documentation.

### Scheduler
Automate your worship service with the new Scheduler feature:
- **Calendar Icon**: Quick access from the activity bar to schedule recurring macros.
- **Pre-Service Music Automation**: Schedule YouTube playlist music to start/stop automatically.
- **MIDI Note Scheduling**: Send MIDI notes at specific times for lighting, sound, or video cues.
- **Weekly Recurring Events**: Set it once and forget it - events repeat every week.
- **Easy Management**: Enable/disable or delete scheduled events with a single click.
- **Visual Calendar**: See all your scheduled events for the week at a glance.

See [SCHEDULER_FEATURE.md](SCHEDULER_FEATURE.md) for detailed documentation.

### Lower Thirds Window
Introduced a new dedicated window for displaying lower third graphics. This window features:
- A **bright green background** (`#00FF00`) for seamless chroma keying.
- **Two lines of text** displayed at the bottom, using the same clear font style as the audience screen.
- **1080p (1920x1080) resolution output** for high-quality integration.
- **Dynamic updates**: Text content is automatically sent to the Lower Thirds window when a lyric slide is clicked in the main application.

### Enhanced Multitrack Player Controls
The multitrack audio player has received significant usability improvements:
- **Vertical Volume Faders**: Each track now features a vertical volume slider, allowing for more intuitive control.
- **LCR Pan Buttons**: Dedicated Left, Center, and Right pan buttons for quick audio positioning. Buttons turn **yellow** when active.
- **Mute Button**: A clear mute button that turns **red** when the track is muted.
- **Optimized Layout**: Track controls are arranged in a grid of **6 per row**, with a vertical scrollbar for easy navigation through many tracks.
- **Initial Volume**: All track volume faders now default to **100%** on application load.

### Improved Display Centering
To enhance readability and visual appeal:
- All text displayed on the **Audience Screen** is now perfectly centered both horizontally and vertically.
- All text displayed on the **Confidence Monitor** is also perfectly centered horizontally and vertically.

## ⚡ Performance & System Requirements

### Recommended System Requirements
- **CPU**: Quad-core processor (Intel Core i5/i7 or AMD Ryzen 5/7)
- **RAM**: 8-16 GB
- **GPU**: Dedicated GPU (NVIDIA GTX 1050 or better, AMD Radeon RX 560 or better) - Recommended for hardware-accelerated video processing
- **Storage**: SSD with at least 500 MB free for app + media files
- **OS**: Windows 10/11 (64-bit), Linux, or macOS

### Performance Optimizations
HarmonySync is optimized for efficient resource usage:
- ✅ **Hardware-accelerated video encoding** (NVENC, QuickSync, VAAPI, VideoToolbox)
- ✅ **Multi-threaded processing** using Tokio for parallel operations
- ✅ **Link-Time Optimization (LTO)** for faster runtime performance
- ✅ **Efficient memory management** with Rust's zero-cost abstractions
- ✅ **Optimized caching** using DashMap for thread-safe concurrent access

See [PERFORMANCE_OPTIMIZATIONS.md](PERFORMANCE_OPTIMIZATIONS.md) for detailed information.

## 🛠️ Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/en/download/) (LTS version 16.x or higher) and npm
- [FFmpeg](https://ffmpeg.org/download.html) - Required for audio/video processing and transposition. Ensure `ffmpeg` is in your system PATH.
- (Optional) [Google Drive API credentials](GOOGLE_DRIVE_SETUP.md) for cloud audio sync

### Installation
```bash
git clone <repository-url>
cd harmonysync
npm install
```

### Running the Application
```bash
# Development mode
npm run dev

# Production build
npm run build
npm run electron
```

## 📁 Project Structure

```
harmonysync/
├── public/                  # Static assets
├── src/                     # React frontend source code
│   ├── App.jsx
│   ├── components/          # React components
│   │   ├── audio/           # Audio player components
│   │   ├── screens/         # Display windows
│   │   ├── slides/          # Slide management
│   │   └── ...
│   ├── styles/              # CSS stylesheets
│   └── utils/               # Utility functions
│       ├── api-bridge.js    # Unified API bridge
│       └── ...
├── electron/                # Electron backend (Node.js)
│   ├── main.cjs             # Main process
│   ├── preload.cjs          # Preload script
│   └── modules/             # Backend modules
│       ├── audioServiceManager.cjs
│       ├── audioTransposer.cjs
│       ├── databaseManager.cjs
│       ├── googleDriveManager.cjs
│       ├── videoProcessor.cjs
│       └── ...
├── harmonysync-audio-service/  # Separate audio service
│   └── server.js            # Audio streaming server
├── index.html               # Main application HTML
├── audience.html            # Audience Screen HTML
├── confidence.html          # Confidence Monitor HTML
└── lowerthirds.html         # Lower Thirds Window HTML
```

## 📄 License

MIT License - see LICENSE file for details.

## 🙏 Acknowledgments

- Built with [Electron](https://www.electronjs.org/) and [React](https://react.dev/)
- Audio processing via integrated [Node.js Audio Service](harmonysync-audio-service/)
- Video and audio conversion powered by [FFmpeg](https://ffmpeg.org/)
- Cloud storage integration with [Google Drive API](https://developers.google.com/drive)
- Database powered by [better-sqlite3](https://github.com/WiseLibs/better-sqlite3)

---

*HarmonySync Presenter - Empowering worship through technology* 🎵📖✨