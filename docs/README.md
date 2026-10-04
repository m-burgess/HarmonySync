# HarmonySync Presenter - Modern Worship & Media Software

A comprehensive presentation software built with C++ and Qt, designed for worship services and live events. HarmonySync offers robust multitrack audio playback, dynamic media display, AI-powered lyric synchronization, and flexible presentation capabilities.

## ✨ Key Features

### 🎯 Presentation System
- **Dynamic Slide Management**: Seamlessly navigate through songs and media slides.
- **Confidence Monitor**: Dedicated display for presenters, showing current/next slides, clock, and countdowns.
- **Audience Screen**: Separate, optimized display for the main audience.
- **Lower Thirds Window**: Dedicated output for lower third graphics with chroma key support.

### 🎵 Multitrack Audio Player
- **Flexible Track Controls**: Individual volume faders, LCR pan, and mute controls for each audio track.
- **Efficient Audio Handling**: C++ high-performance audio engine utilizing cross-fading and robust playback syncing.
- **Intuitive Layout**: Track controls arranged in a grid with vertical scrolling for easy access.
- **Config Persistence**: Save/load mixer configurations per song via `song-map.json`.

### 🤖 AI-Powered Lyric Synchronization
- **Automated Timestamps**: Utilize AI (via a Python script wrapper) to automatically assign timestamps to lyrics based on reference audio stems.
- **Live Sync**: Toggle "AUTO-SYNC" to have the presentation automatically advance slides and lyrics in time with multitrack playback.
- **Visual Feedback**: Real-time generation indicators and seamless fallback to manual control.

### 🎥 Media & Display
- **Video Backgrounds**: Support for various video formats with smooth transitions and no crossfade lag during rapid slide switching.
- **Text Centering**: All text on Audience and Confidence Monitors is precisely centered for optimal readability.
- **1080p Output**: Dedicated windows output at 1080p resolution.

## ⚡ Performance & System Requirements

### Recommended System Requirements
- **CPU**: Quad-core processor (Intel Core i5/i7 or AMD Ryzen 5/7)
- **RAM**: 8-16 GB
- **GPU**: Dedicated GPU recommended for Qt Quick hardware-accelerated rendering
- **Storage**: SSD with at least 500 MB free for app + media files
- **OS**: Linux, macOS, or Windows 10/11 (64-bit)

## 🛠️ Getting Started

### Prerequisites
- **CMake** (3.16+)
- **Qt 6** (Core, Gui, Qml, Quick, Multimedia)
- **C++17 Compatible Compiler** (GCC, Clang, MSVC)
- **Python 3** (for AI Lyric Synchronization scripts)

### Installation & Building
```bash
git clone <repository-url>
cd HarmonySync

# Create build directory
mkdir build && cd build

# Configure and build
cmake ..
cmake --build . -j$(nproc)

# Run the application
./harmonysync
```

### Running Tests
The project features a comprehensive C++ unit test suite covering ViewModels, Domain Models, Audio Engine, and Folder Services.

```bash
cd build
cmake --build . -j$(nproc) --target all_tests
ctest --output-on-failure
```

## 📁 Project Structure

```
HarmonySync/
├── src/
│   ├── core/                  # C++ Backend domain models and services
│   │   ├── models/            # ServiceOrder, SongMap, MediaStem
│   │   └── services/          # FolderService, AILyricSyncService, Audio DSP
│   ├── viewmodels/            # Qt C++ ViewModels (SetlistViewModel, AudioMixerViewModel)
│   ├── qml/                   # UI Presentation Layer
│   │   ├── components/        # LyricsPanel, StemMixerPanel, ServiceOrderPanel
│   │   ├── theme/             # Styling constants
│   │   └── main.qml           # Application Window Entry
│   └── main.cpp               # C++ Application Entry Point
├── tests/                     # C++ Unit Tests (test_viewmodels, test_folder_service)
├── scripts/                   # Helper scripts (e.g., ai_lyric_sync.py)
├── docs/                      # Project documentation
└── CMakeLists.txt             # Main CMake configuration
```

## 📄 License
MIT License - see LICENSE file for details.
