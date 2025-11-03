# HarmonySync Presenter - Modern Worship & Media Software

A comprehensive presentation software built with a Tauri (Rust) backend and a React (JavaScript) frontend, designed for worship services and live events. HarmonySync offers robust multitrack audio playback, dynamic media display, and flexible presentation capabilities.

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

### 🎥 Media & Display
- **Video Backgrounds**: Support for various video formats with smooth looping, streamed efficiently via a local HTTP server.
- **Image Support**: Display PNG, JPG, JPEG background images.
- **Text Centering**: All text on Audience and Confidence Monitors is precisely centered for optimal readability.
- **Chroma Key Support**: Lower Thirds window features a bright green background for easy chroma keying in external mixers.
- **1080p Output**: Dedicated windows (Audience, Confidence, Lower Thirds) output at 1080p resolution.

## 🚀 New Features Highlight

### Scheduler (Latest)
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
- [Rust](https://www.rust-lang.org/tools/install) (latest stable version)
- [Node.js](https://nodejs.org/en/download/) (LTS version) and npm
- Tauri prerequisites for your operating system (see [Tauri documentation](https://tauri.app/v1/guides/getting-started/prerequisites))
- [FFmpeg](https://ffmpeg.org/download.html) - Required for audio processing and transposition. Ensure `ffmpeg` is in your system PATH.

### Installation
```bash
git clone <repository-url>
cd harmonysync
npm install
```

### Running the Application
```bash
# In the harmonysync directory
npm run tauri dev
```

## 📁 Project Structure

```
harmonysync/
├── public/                  # Static assets
├── src/                     # React frontend source code
│   ├── App.jsx
│   ├── MultitrackPlayer.jsx # Multitrack player component
│   ├── ScreenButtons.jsx    # Controls for opening display windows
│   ├── SlideManager.jsx     # Manages presentation slides
│   ├── TrackControl.jsx     # Individual track control component
│   ├── audience-main.jsx    # Entry point for Audience Screen
│   ├── AudienceScreen.jsx   # Audience display component
│   ├── confidence-main.jsx  # Entry point for Confidence Monitor
│   ├── ConfidenceMonitor.jsx# Confidence Monitor component
│   ├── lowerthirds-main.jsx # Entry point for Lower Thirds Window
│   ├── LowerThirdsScreen.jsx# Lower Thirds display component
│   ├── styles/              # CSS stylesheets
│   │   ├── App.css
│   │   ├── audience.css
│   │   ├── confidence.css
│   │   ├── lowerthirds.css
│   │   └── ...
│   └── utils/               # Utility functions
│       ├── audio.js         # Web Audio API utilities
│       ├── lyrics.js        # Lyric parsing and formatting
│       ├── video.js         # Video utilities
│       └── ui.js            # UI helper functions
├── src-tauri/               # Rust backend (Tauri) source code
│   ├── src/                 # Rust application logic
│   │   ├── main.rs
│   │   └── application/     # Backend commands and services
│   ├── tauri.conf.json      # Tauri configuration
│   └── capabilities/        # Tauri capability definitions
├── index.html               # Main application HTML
├── audience.html            # Audience Screen HTML
├── confidence.html          # Confidence Monitor HTML
└── lowerthirds.html         # Lower Thirds Window HTML
```

## 📄 License

MIT License - see LICENSE file for details.

## 🙏 Acknowledgments

- Built with [Tauri](https://tauri.app/) and [React](https://react.dev/)
- Audio processing via [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
- Video and audio conversion powered by [FFmpeg](https://ffmpeg.org/)

---

*HarmonySync Presenter - Empowering worship through technology* 🎵📖✨