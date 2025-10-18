# Rust Memory Management Optimization Opportunities

## Executive Summary
This document outlines potential optimizations that could leverage Rust's memory management, zero-cost abstractions, and performance characteristics to improve the RustPresenter application.

---

## 1. Audio Processing & Decoding (HIGH PRIORITY)

### Current State
- **JavaScript** decodes audio files using Web Audio API
- Audio buffers stored in JavaScript Map
- Each audio file is fetched via `fetch()` and decoded in browser
- Large audio files (especially OGG multitrack) consume significant memory

### Rust Optimization Opportunities

#### 1.1 Audio Decoding in Rust
**Benefits:**
- Use `symphonia` or `rodio` crates for faster audio decoding
- Decode audio files directly in Rust without JavaScript bridge overhead
- Stream decoded samples to frontend instead of loading entire buffer
- Better memory control with Rust's ownership system

**Implementation:**
```rust
#[tauri::command]
async fn decode_audio_file(path: String) -> Result<AudioBuffer, String> {
    // Use symphonia for format detection and decoding
    // Return decoded samples as typed arrays
    // Rust handles memory allocation/deallocation efficiently
}

#[tauri::command]
async fn decode_audio_stream(path: String, offset: f64) -> Result<AudioChunk, String> {
    // Stream audio chunks instead of loading entire file
    // Reduces memory footprint significantly
}
```

**Dependencies to Add:**
- `symphonia = "0.5"` - Audio decoding
- `rubato = "0.15"` - Sample rate conversion if needed

---

#### 1.2 Audio Buffer Cache in Rust
**Benefits:**
- Store decoded audio buffers in Rust memory space
- Use `Arc<Mutex<HashMap>>` or `DashMap` for thread-safe cache
- Automatic memory cleanup with RAII
- Can implement LRU eviction policy easily
- Reduces JavaScript heap pressure

**Implementation:**
```rust
use dashmap::DashMap;
use std::sync::Arc;

// Global audio buffer cache
static AUDIO_CACHE: Lazy<Arc<DashMap<String, Arc<Vec<f32>>>>> = 
    Lazy::new(|| Arc::new(DashMap::new()));

#[tauri::command]
async fn get_cached_audio(path: String) -> Result<Vec<f32>, String> {
    if let Some(buffer) = AUDIO_CACHE.get(&path) {
        return Ok(buffer.value().clone());
    }
    
    // Decode and cache
    let decoded = decode_audio_file(&path).await?;
    AUDIO_CACHE.insert(path.clone(), Arc::new(decoded.clone()));
    Ok(decoded)
}

#[tauri::command]
fn clear_audio_cache() {
    AUDIO_CACHE.clear();
}

#[tauri::command]
fn get_cache_memory_usage() -> usize {
    AUDIO_CACHE.iter()
        .map(|entry| entry.value().len() * std::mem::size_of::<f32>())
        .sum()
}
```

**Memory Benefits:**
- Rust's allocator is more efficient than JS heap for large buffers
- Can set memory limits and implement smart eviction
- Better control over when memory is released

---

## 2. File System Operations (MEDIUM PRIORITY)

### Current State
- File reading done via Tauri FS plugin in JavaScript
- Multiple round-trips for folder scanning
- Lyrics parsing happens in JavaScript

### Rust Optimization Opportunities

#### 2.1 Batch File Operations
**Benefits:**
- Read multiple files in parallel using `tokio`
- Return aggregated results in one IPC call
- Reduce JavaScript ↔ Rust bridge overhead

**Implementation:**
```rust
#[derive(Serialize)]
struct FolderContents {
    lyrics: Option<String>,
    audio_files: Vec<AudioFileInfo>,
    video_files: Vec<VideoFileInfo>,
    image_files: Vec<String>,
    background_css: Option<String>,
}

#[tauri::command]
async fn load_folder_contents(path: String) -> Result<FolderContents, String> {
    // Parallel file system operations
    let (lyrics, audio_files, videos, images, css) = tokio::join!(
        read_lyrics_file(&path),
        scan_audio_files(&path),
        scan_video_files(&path),
        scan_image_files(&path),
        load_background_css(&path)
    );
    
    Ok(FolderContents {
        lyrics,
        audio_files,
        video_files: videos,
        image_files: images,
        background_css: css,
    })
}
```

**Performance Gain:**
- Reduces IPC calls from ~5-10 to 1
- Parallel I/O operations
- Less serialization overhead

---

#### 2.2 Lyrics Parsing in Rust
**Benefits:**
- String operations are faster in Rust
- No JSON serialization of intermediate results
- Can implement more sophisticated parsing (regex optimization)

**Implementation:**
```rust
#[derive(Serialize, Deserialize)]
struct Slide {
    text: Vec<String>,
    section: String,
}

#[tauri::command]
fn parse_lyrics(lyrics_text: String) -> Vec<Slide> {
    let mut slides = Vec::new();
    let mut current_section = String::from("Intro");
    let mut current_slide_lines = Vec::new();
    
    for line in lyrics_text.lines() {
        let line = line.trim();
        if line.is_empty() {
            continue;
        }
        
        // Check for section marker [Section Name]
        if let Some(section) = line.strip_prefix('[').and_then(|s| s.strip_suffix(']')) {
            current_section = section.to_string();
            continue;
        }
        
        current_slide_lines.push(line.to_string());
        
        if current_slide_lines.len() == 2 {
            slides.push(Slide {
                text: current_slide_lines.clone(),
                section: current_section.clone(),
            });
            current_slide_lines.clear();
        }
    }
    
    // Handle remaining lines
    if !current_slide_lines.is_empty() {
        slides.push(Slide {
            text: current_slide_lines,
            section: current_section,
        });
    }
    
    slides
}
```

---

## 3. Video Thumbnail Generation (CURRENT - ALREADY OPTIMIZED)

**Already using Rust with `ffmpeg-next`** ✅
- Good use of async operations
- Could consider thumbnail cache with expiration
- Could add batch thumbnail generation

**Potential Enhancement:**
```rust
// Cache thumbnails to avoid regeneration
static THUMBNAIL_CACHE: Lazy<Arc<DashMap<String, String>>> = 
    Lazy::new(|| Arc::new(DashMap::new()));
```

---

## 4. Database Operations (MEDIUM PRIORITY)

### Current State
- Using SQLite via `rusqlite` for presentations and songs
- Some operations might be synchronous

### Optimization Opportunities

#### 4.1 Async Database Pool
**Implementation:**
```rust
use sqlx::{SqlitePool, sqlite::SqlitePoolOptions};

static DB_POOL: Lazy<Arc<Mutex<Option<SqlitePool>>>> = 
    Lazy::new(|| Arc::new(Mutex::new(None)));

#[tauri::command]
async fn batch_load_presentations(ids: Vec<i64>) -> Result<Vec<Presentation>, String> {
    let pool = DB_POOL.lock().await.as_ref().unwrap().clone();
    
    // Load multiple presentations in parallel
    let futures: Vec<_> = ids.iter()
        .map(|id| load_presentation_by_id(*id, &pool))
        .collect();
    
    let results = futures::future::try_join_all(futures).await?;
    Ok(results)
}
```

**Benefits:**
- Non-blocking database queries
- Connection pooling
- Better concurrent access

---

## 5. Image Processing (LOW PRIORITY)

### Potential Use Cases
- Image resizing/optimization before display
- Thumbnail generation for images
- Format conversion (HEIC to JPEG, etc.)

**Implementation:**
```rust
use image::{DynamicImage, imageops::FilterType};

#[tauri::command]
async fn optimize_image(path: String, max_width: u32) -> Result<Vec<u8>, String> {
    let img = image::open(path).map_err(|e| e.to_string())?;
    
    let resized = if img.width() > max_width {
        img.resize(max_width, u32::MAX, FilterType::Lanczos3)
    } else {
        img
    };
    
    let mut bytes = Vec::new();
    resized.write_to(&mut bytes, image::ImageFormat::Jpeg)
        .map_err(|e| e.to_string())?;
    
    Ok(bytes)
}
```

---

## 6. Service Worker / Background Processing (MEDIUM PRIORITY)

### Use Cases
- Preload songs in background while user is viewing slides
- Index song library in background
- Generate missing thumbnails in background

**Implementation:**
```rust
use tokio::task::JoinHandle;

struct BackgroundProcessor {
    tasks: Vec<JoinHandle<()>>,
}

impl BackgroundProcessor {
    fn preload_songs(&mut self, paths: Vec<String>) {
        let handle = tokio::spawn(async move {
            for path in paths {
                // Decode and cache in background
                let _ = preload_audio_file(path).await;
            }
        });
        self.tasks.push(handle);
    }
}
```

---

## 7. Memory Monitoring & Profiling (HIGH PRIORITY)

### Add Memory Metrics Command
**Benefits:**
- Monitor cache sizes
- Track memory usage
- Implement auto-cleanup thresholds

**Implementation:**
```rust
#[derive(Serialize)]
struct MemoryStats {
    audio_cache_size: usize,
    audio_cache_count: usize,
    thumbnail_cache_size: usize,
    total_rust_heap: usize,
}

#[tauri::command]
fn get_memory_stats() -> MemoryStats {
    MemoryStats {
        audio_cache_size: get_audio_cache_memory(),
        audio_cache_count: AUDIO_CACHE.len(),
        thumbnail_cache_size: get_thumbnail_cache_memory(),
        total_rust_heap: get_rust_heap_size(),
    }
}

#[tauri::command]
fn auto_cleanup_if_needed(threshold_mb: usize) {
    let current = get_memory_stats();
    let threshold_bytes = threshold_mb * 1024 * 1024;
    
    if current.audio_cache_size > threshold_bytes {
        // Implement LRU eviction
        evict_least_recently_used_audio();
    }
}
```

---

## Implementation Priority & Impact

### High Priority (Do First)
1. **Audio Decoding in Rust** - Biggest performance & memory win
2. **Audio Buffer Cache in Rust** - Reduces JS heap pressure significantly
3. **Memory Monitoring** - Enables data-driven optimization

### Medium Priority
4. **Batch File Operations** - Reduces IPC overhead
5. **Lyrics Parsing in Rust** - Minor performance gain, cleaner architecture
6. **Background Preloading** - Better user experience

### Low Priority
7. **Image Processing** - Only if users report image performance issues
8. **Database Pool** - Current implementation likely sufficient

---

## Recommended Cargo Dependencies

Add to `Cargo.toml`:
```toml
[dependencies]
# Audio processing
symphonia = { version = "0.5", features = ["all"] }
rubato = "0.15"  # Sample rate conversion

# Async database (if upgrading from rusqlite)
sqlx = { version = "0.8", features = ["sqlite", "runtime-tokio-native-tls"] }

# Thread-safe collections
dashmap = "6.0"

# Memory profiling
jemalloc-ctl = "0.5"  # For memory stats
```

---

## Estimated Performance Gains

| Optimization | Memory Reduction | CPU Improvement | IPC Reduction |
|-------------|------------------|-----------------|---------------|
| Audio Decoding in Rust | 30-50% | 20-40% | N/A |
| Audio Cache in Rust | 20-30% | 10-20% | N/A |
| Batch File Ops | 5-10% | 15-25% | 80-90% |
| Lyrics Parsing | <5% | 5-10% | N/A |
| Background Preload | Variable | N/A | Better UX |

---

## Next Steps

1. **Profile Current Memory Usage** - Establish baseline metrics
2. **Implement Memory Monitoring** - Add visibility into current usage
3. **Prototype Audio Decoding** - Test `symphonia` integration
4. **Measure Impact** - Compare before/after metrics
5. **Iterate** - Focus on highest-impact optimizations first

---

## Notes on Trade-offs

### Pros of Moving to Rust:
- ✅ Better memory management (RAII, ownership)
- ✅ Faster processing (especially audio decoding)
- ✅ Reduced garbage collection pressure in JS
- ✅ Type safety and compile-time guarantees
- ✅ Better control over memory allocation

### Cons to Consider:
- ❌ More complex codebase (Rust learning curve)
- ❌ Longer compile times during development
- ❌ Need to serialize data across IPC boundary
- ❌ Less flexibility than dynamic JS for some operations

### Recommendation:
Focus on **data-heavy operations** (audio, video, file I/O) in Rust, keep **UI logic** in JavaScript/React.
