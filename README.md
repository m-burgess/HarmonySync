# HarmonySync

A presentation application built with C++ and Qt for worship services and live events. It includes multitrack audio playback, media display, lyric synchronization, and separate presentation windows.

## Key Features

### Presentation
- Dynamic slide management for songs and media.
- Confidence monitor for presenters, showing current and next slides, a clock, and countdowns.
- Audience screen for the main audience.
- Lower thirds window with chroma key support.

### Multitrack audio
- Volume faders, LCR pan, and mute for each track.
- C++ audio engine with cross-fading and playback syncing.
- Track controls in a grid with vertical scrolling.
- Mixer settings saved and loaded per song in `song-map.json`.

### Lyric synchronization
- A Python script wrapper can assign timestamps to lyrics from reference audio stems.
- AUTO-SYNC can advance slides and lyrics with multitrack playback.
- Manual control remains available.

### Media and display
- Video backgrounds, with transitions that avoid crossfade lag during rapid slide changes.
- Text on the audience screen and confidence monitor is centered.
- Output windows at 1080p.

## System requirements

- CPU: Quad-core (Intel Core i5/i7 or AMD Ryzen 5/7)
- RAM: 8-16 GB
- GPU: Dedicated GPU recommended for Qt Quick hardware-accelerated rendering
- Storage: SSD with at least 500 MB free for the app and media
- OS: Linux, macOS, or Windows 10/11 (64-bit)

## Getting started

### Prerequisites
- CMake 3.16 or newer
- Qt 6 (Core, Gui, Qml, Quick, Multimedia)
- A C++17 compiler (GCC, Clang, or MSVC)
- Python 3, for the lyric synchronization scripts

### Build and run

```bash
git clone <repository-url>
cd HarmonySync

mkdir build && cd build
cmake ..
cmake --build . -j$(nproc)

./harmonysync
```

### Tests

```bash
cd build
cmake --build . -j$(nproc) --target all_tests
ctest --output-on-failure
```

The C++ tests cover view models, domain models, the audio engine, and folder services.

## Project structure

```
HarmonySync/
├── src/
│   ├── core/                  # Domain models and services
│   │   ├── models/            # ServiceOrder, SongMap, MediaStem
│   │   └── services/          # FolderService, AILyricSyncService, audio DSP
│   ├── viewmodels/            # Qt view models (SetlistViewModel, AudioMixerViewModel)
│   ├── qml/                   # QML interface
│   │   ├── components/        # LyricsPanel, StemMixerPanel, ServiceOrderPanel
│   │   ├── theme/
│   │   └── main.qml
│   └── main.cpp
├── tests/
├── scripts/                   # Including ai_lyric_sync.py
├── docs/
└── CMakeLists.txt
```

## License

MIT License. See [docs/LICENSE](docs/LICENSE).
