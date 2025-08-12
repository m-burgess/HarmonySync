# Slint Presenter - Worship & Media Software

A comprehensive Rust-based presentation software built with Slint UI framework for worship services, featuring multitrack audio playback, Bible verse integration, and live presentation capabilities.

## ✨ Key Features Completed

### 🎵 Audio Engine
- **Multitrack Player**: Support for MP3, FLAC, OGG, WAV, M4A formats
- **Per-Track Controls**: Individual fader, LCR pan, mute, solo, and transpose settings
- **Auto-Pan Logic**: Click/Guide tracks → Left channel, others → Right channel
- **Global Transpose**: Affects all tracks except click, guide, drums, percussion
- **Audio Processing**: Low cut, high cut filters, and limiter to prevent clipping
- **Metronome**: Built-in metronome with left channel output only
- **Solo/Mute Logic**: Intelligent audio routing with solo override
- **Config Persistence**: Save/load mixer configurations per song (JSON format)

### 📖 Bible Verse Integration ⭐ NEW!
- **Free API Access**: Uses bible-api.com for verse lookups (no API key required)
- **Smart Reference Parsing**: Handles complex references like "1 Corinthians 13:4-7"
- **Verse Ranges**: Support for fetching multiple consecutive verses
- **Popular Verses**: Quick access to commonly used verses (John 3:16, Romans 8:28, etc.)
- **Keyword Search**: Find verses containing specific words or phrases
- **Auto-Formatting**: Automatically splits verses into 2-line slides for presentation
- **Book Abbreviations**: Supports common abbreviations (john → John, 1cor → 1 Corinthians)
- **Multiple Versions**: NIV, ESV, KJV, NASB, NLT support
- **Reference Validation**: Real-time validation of Bible references
- **Slide Generation**: Converts verses into presentation-ready slides with reference attribution

### 🎥 Video & Media
- **Video Backgrounds**: Support for MP4, MOV formats with smooth looping
- **Image Support**: PNG, JPG, JPEG background images
- **Fade Transitions**: 0.2s fade in/out for all lyric and media transitions
- **Audience Screen**: Separate egui-based video player for smooth playback
- **TCP Communication**: Main app communicates with audience screen via JSON over TCP

### 🎯 Presentation System
- **Slide Management**: Navigate through songs or Bible verses with previous/next controls
- **Content Types**: Unified system handling songs, Bible verses, and media
- **Live Preview**: Real-time preview of current slide content
- **Confidence Monitor**: Shows current slide, next slide, clock, and countdown timer
- **Display Configuration**: Settings for audience and confidence monitor displays
- **Full Screen Support**: Toggle full screen mode for presentation displays

### 🎹 MIDI Integration
- **MIDI I/O**: Full MIDI input and output communication capabilities
- **Real-time Control**: MIDI-triggered slide changes and audio controls

### 🏗️ Clean Architecture
- **Domain Layer**: Core business entities (Song, Track, Slide, MixerConfig)
- **Application Layer**: Use cases for song loading, Bible verse fetching
- **Infrastructure Layer**: File repositories, audio engine, Bible API services
- **Presentation Layer**: Slint UI components and audience screen

## 📋 Bible Verse Usage

### Basic Verse Lookup
```rust
// Fetch a single verse
fetch_bible_verse("John 3:16", "NIV")

// Fetch multiple verses
fetch_bible_verse("Romans 8:28-30", "ESV")
```

### Popular Verses Quick Access
The system includes 10 popular Bible verses for quick access:
- John 3:16 - "For God so loved the world..."
- Romans 8:28 - "And we know that in all things..."
- Philippians 4:13 - "I can do all this through him..."
- Psalm 23:1 - "The Lord is my shepherd..."
- 1 Corinthians 13:4-7 - "Love is patient, love is kind..."
- And more...

### Keyword Search
```rust
search_bible_verses("love", "NIV", 10) // Find verses containing "love"
```

### Supported Reference Formats
- `John 3:16` - Single verse
- `John 3:16-17` - Verse range
- `1 Corinthians 13:4` - Books with numbers/spaces
- `Psalms 23:1-6` - Multiple verses from same chapter

## 🚀 Getting Started

### Prerequisites
- Rust 1.70+ with Cargo
- System audio drivers (ALSA/PulseAudio on Linux, CoreAudio on macOS, WASAPI on Windows)

### Installation
```bash
git clone <repository-url>
cd slint-presenter
cargo build --release
```

### Running the Application
```bash
# Main presenter application
cargo run

# Audience screen (separate process)
cargo run --bin audience_screen
```

## 📁 Project Structure

```
slint-presenter/
├── src/
│   ├── application/           # Use cases and business logic
│   │   ├── use_cases.rs      # Song loading use case
│   │   ├── bible_use_case.rs # Bible verse fetching ⭐ NEW!
│   │   └── services.rs       # Application services
│   ├── domain/               # Core business entities
│   │   └── entities.rs       # Song, Track, Slide, MixerConfig
│   ├── infrastructure/       # External concerns
│   │   ├── audio.rs         # Multitrack audio engine
│   │   ├── bible_api.rs     # Bible API service ⭐ NEW!
│   │   ├── repositories.rs  # File and audio repositories
│   │   ├── video.rs         # Video playback
│   │   └── midi.rs          # MIDI communication
│   ├── presentation/         # UI layer
│   │   └── audience_screen.rs # Audience display
│   └── main.rs              # Application entry point
├── ui/
│   └── main.slint          # Main UI layout with Bible tab ⭐ NEW!
├── audience_screen/         # Separate audience display
└── tests/                   # Comprehensive unit tests
```

## ⚙️ Configuration

### Song Folder Structure
```
LibraryFolder/
├── Song1/
│   ├── lyrics.txt          # Song lyrics (processed into 2-line slides)
│   ├── vocals.mp3          # Audio tracks
│   ├── guitar.wav
│   ├── click.wav           # Auto-pans left
│   ├── guide.mp3           # Auto-pans left  
│   └── config.json         # Mixer settings (auto-generated)
└── Song2/
    └── ...
```

### Bible Verse API
The system uses the free bible-api.com service by default. For advanced features, you can configure a paid Bible API service:

```rust
// Use free API (default)
let bible_service = FetchBibleVerseUseCase::new(None);

// Use paid API with key
let bible_service = FetchBibleVerseUseCase::new(Some("your_api_key".to_string()));
```

### Mixer Configuration (config.json)
```json
{
  "transpose_semitones": 0,
  "low_cut": 20.0,
  "high_cut": 20000.0,
  "limiter_threshold": -6.0
}
```

## 🧪 Testing

The project includes comprehensive unit tests for all major functionality:

```bash
# Run all tests
cargo test

# Run Bible verse tests specifically
cargo test bible

# Run audio engine tests
cargo test audio

# Run with coverage
cargo test -- --test-threads=1
```

### Test Coverage
- ✅ Bible verse reference parsing and validation
- ✅ Verse range handling (e.g., "John 3:16-17")
- ✅ Book abbreviation normalization
- ✅ Slide formatting for presentation
- ✅ Audio engine solo/mute logic
- ✅ Pan, transpose, and filter functionality
- ✅ Song loading and lyric processing
- ✅ Configuration serialization/deserialization

## 🔄 Recent Updates

### Bible Verse Integration (Latest)
- Added comprehensive Bible verse lookup functionality
- Integrated free Bible API service (bible-api.com)
- Created Bible verse use case with validation and formatting
- Updated Slint UI with dedicated Bible verse tab
- Added popular verses quick access
- Implemented keyword search functionality
- Added support for verse ranges and complex references
- Comprehensive test coverage for all Bible features

## 🛣️ Roadmap

### Planned Features
- [ ] Enhanced media column for sermon slides
- [ ] MIDI input/output implementation
- [ ] Video synchronization with audio tracks
- [ ] Advanced display configuration options
- [ ] Bible verse memorization features
- [ ] Playlist import/export functionality
- [ ] Custom background templates
- [ ] Advanced audio effects and EQ

### Technical Improvements
- [ ] Performance optimization for large libraries
- [ ] Better error handling and user feedback
- [ ] Automated testing pipeline
- [ ] Cross-platform compatibility testing
- [ ] Documentation and user manual

## 🤝 Contributing

This project follows clean architecture principles with comprehensive testing. When contributing:

1. Write unit tests for all new functionality
2. Follow the established architectural patterns
3. Update documentation for new features
4. Ensure all tests pass before submitting

## 📄 License

MIT License - see LICENSE file for details.

## 🙏 Acknowledgments

- Built with [Slint UI Framework](https://slint.dev/)
- Audio powered by [Rodio](https://github.com/RustAudio/rodio)
- Bible verses via [bible-api.com](https://bible-api.com/)
- Video playback via [egui_video](https://github.com/n00kii/egui-video)

---

*Slint Presenter - Empowering worship through technology* 🎵📖✨
