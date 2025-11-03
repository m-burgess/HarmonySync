# Lyrics Fetching Architecture

## System Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         USER INTERACTION                             │
└─────────────────────────────────────────────────────────────────────┘
                                   │
                                   │ 1. Clicks download icon
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    FRONTEND (React)                                  │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  SetlistManager.jsx                                           │  │
│  │  - Detects songs without lyrics.txt                          │  │
│  │  - Shows download icon (📥)                                   │  │
│  │  - Opens modal on click                                       │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                   │                                  │
│                                   │ 2. Opens modal                   │
│                                   ▼                                  │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  LyricsFetcher.jsx                                            │  │
│  │  - Displays form with song title (pre-filled)                │  │
│  │  - Optional artist name field                                │  │
│  │  - Fetch button triggers Tauri command                       │  │
│  └──────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                                   │
                                   │ 3. invoke('fetch_and_save_lyrics')
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    TAURI BRIDGE                                      │
│  - Serializes parameters (song_title, artist, folder_path)          │
│  - Routes to Rust backend                                           │
└─────────────────────────────────────────────────────────────────────┘
                                   │
                                   │ 4. Command invocation
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│                  BACKEND (Rust)                                      │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  commands.rs                                                  │  │
│  │  - fetch_and_save_lyrics()                                    │  │
│  │  - Orchestrates workflow                                      │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                   │                                  │
│                                   │ 5. Delegates to lyrics_fetcher   │
│                                   ▼                                  │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  lyrics_fetcher.rs                                            │  │
│  │  ┌────────────────────────────────────────────────────────┐  │  │
│  │  │  GeniusClient                                           │  │  │
│  │  │  - Creates HTTP client                                  │  │  │
│  │  │  - Sets 30s timeout                                     │  │  │
│  │  └────────────────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                                   │
                                   │ 6. HTTP GET request
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│                 GENIUS API                                           │
│  https://api.genius.com/search?q={encoded_query}                    │
│  - Returns JSON with song matches                                   │
│  - Includes song URLs                                               │
└─────────────────────────────────────────────────────────────────────┘
                                   │
                                   │ 7. Returns search results
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│                  BACKEND (Rust)                                      │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  lyrics_fetcher.rs                                            │  │
│  │  - Selects first result                                       │  │
│  │  - Extracts song URL                                          │  │
│  └──────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                                   │
                                   │ 8. HTTP GET song page
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│                 GENIUS WEB PAGE                                      │
│  https://genius.com/artists/{artist}/{song}                         │
│  - HTML page with lyrics in data-lyrics-container divs              │
└─────────────────────────────────────────────────────────────────────┘
                                   │
                                   │ 9. Returns HTML
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│                  BACKEND (Rust)                                      │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  lyrics_fetcher.rs                                            │  │
│  │  ┌────────────────────────────────────────────────────────┐  │  │
│  │  │  extract_lyrics_from_html()                            │  │  │
│  │  │  - Finds data-lyrics-container elements                │  │  │
│  │  │  - Extracts text content                               │  │  │
│  │  └────────────────────────────────────────────────────────┘  │  │
│  │  ┌────────────────────────────────────────────────────────┐  │  │
│  │  │  clean_html_content()                                  │  │  │
│  │  │  - Removes HTML tags                                   │  │  │
│  │  │  - Converts <br> to newlines                          │  │  │
│  │  │  - Decodes HTML entities (&amp;, &lt;, etc.)          │  │  │
│  │  └────────────────────────────────────────────────────────┘  │  │
│  │  ┌────────────────────────────────────────────────────────┐  │  │
│  │  │  format_lyrics_with_sections()                         │  │  │
│  │  │  - Detects section headers ([Verse], [Chorus])        │  │  │
│  │  │  - Formats for presentation use                       │  │  │
│  │  └────────────────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                                   │
                                   │ 10. Formatted lyrics text
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│                  BACKEND (Rust)                                      │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  commands.rs                                                  │  │
│  │  - save_lyrics_to_file()                                      │  │
│  │  - Constructs path: {folder_path}/lyrics.txt                 │  │
│  │  - fs::write() to disk                                        │  │
│  └──────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                                   │
                                   │ 11. File written
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│                  FILE SYSTEM                                         │
│  {song_folder}/lyrics.txt                                           │
│  Content: Formatted lyrics with sections                            │
└─────────────────────────────────────────────────────────────────────┘
                                   │
                                   │ 12. Success response
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    TAURI BRIDGE                                      │
│  - Serializes response (saved file path)                            │
│  - Returns to frontend                                              │
└─────────────────────────────────────────────────────────────────────┘
                                   │
                                   │ 13. Promise resolves
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    FRONTEND (React)                                  │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  LyricsFetcher.jsx                                            │  │
│  │  - Shows success message                                      │  │
│  │  - Closes modal                                               │  │
│  │  - Calls onLyricsFetched(songItem)                          │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                   │                                  │
│                                   │ 14. Callback                     │
│                                   ▼                                  │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  SetlistManager.jsx                                           │  │
│  │  - Reads lyrics.txt from disk                                │  │
│  │  - Updates setlist item with lyrics                          │  │
│  │  - Shows edit icon (✏️) instead of download icon            │  │
│  └──────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                                   │
                                   │ 15. UI updated
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         USER SEES                                    │
│  ✅ Success message                                                 │
│  ✏️ Edit icon now visible                                           │
│  📄 lyrics.txt ready to use                                         │
└─────────────────────────────────────────────────────────────────────┘
```

## Component Responsibilities

### Frontend Components

**SetlistManager.jsx**
- Display song list with status indicators
- Show download icon for songs without lyrics
- Show edit icon for songs with lyrics
- Manage modal state for lyrics fetching
- Handle callback after successful fetch
- Refresh song list data

**LyricsFetcher.jsx**
- Display modal dialog
- Collect user input (song title, artist)
- Validate input
- Call Tauri command
- Show loading state
- Display success/error messages
- Handle close events (Escape, backdrop click)

### Backend Components

**commands.rs**
- `fetch_and_save_lyrics()`: Orchestrates the workflow
- `fetch_lyrics_from_genius()`: Fetches lyrics only
- `save_lyrics_to_file()`: Saves lyrics to disk
- Error handling and user-friendly messages

**lyrics_fetcher.rs**
- `GeniusClient`: HTTP client with timeout
- `search_song()`: Search Genius API
- `fetch_lyrics_from_url()`: Scrape lyrics page
- `extract_lyrics_from_html()`: Parse HTML
- `clean_html_content()`: Remove tags
- `format_lyrics_with_sections()`: Format for presentation
- `is_section_header()`: Detect section headers

## Data Flow

```
User Input → React State → Tauri Command → Rust Function → HTTP Request
     ↓             ↓              ↓              ↓              ↓
Song Title    Form Data    JSON Params   GeniusClient    Genius API
  Artist                                                      ↓
Folder Path                                            Search Results
     ↓                                                        ↓
                                                        Song URL
                                                            ↓
                                                        HTML Page
                                                            ↓
Formatted Lyrics ← Text Processing ← HTML Parsing ← Response Body
     ↓
lyrics.txt File
     ↓
Success Message → UI Update → User Feedback
```

## Error Handling Flow

```
                   ┌─── Network Error ───┐
                   │                      │
API Call ──────────┼─── Timeout ─────────┼──→ Error Message
                   │                      │
                   └─── Invalid Response ─┘
                             │
                             ▼
                    anyhow::Error
                             │
                             ▼
                    Result<T, String>
                             │
                             ▼
                    Tauri Response
                             │
                             ▼
                    JavaScript catch()
                             │
                             ▼
                    User-Friendly Dialog
```

## Security Boundaries

```
┌────────────────────────────────────────┐
│  UNTRUSTED INPUT                       │
│  - Song title from user                │
│  - Artist name from user               │
└────────────────────────────────────────┘
            │
            │ URL Encoding (urlencoding crate)
            ▼
┌────────────────────────────────────────┐
│  SAFE API REQUEST                      │
│  - Encoded query string                │
│  - HTTPS only                          │
│  - 30s timeout                         │
└────────────────────────────────────────┘
            │
            ▼
┌────────────────────────────────────────┐
│  EXTERNAL API RESPONSE                 │
│  - JSON from Genius                    │
│  - HTML from song page                 │
└────────────────────────────────────────┘
            │
            │ HTML Sanitization
            ▼
┌────────────────────────────────────────┐
│  CLEAN TEXT OUTPUT                     │
│  - Plain text only                     │
│  - No HTML tags                        │
│  - No script execution                 │
└────────────────────────────────────────┘
            │
            │ File System Write (with validation)
            ▼
┌────────────────────────────────────────┐
│  TRUSTED FILE                          │
│  - lyrics.txt in validated path        │
│  - No directory traversal              │
└────────────────────────────────────────┘
```

## Performance Characteristics

- **Search Request**: ~200-500ms (network dependent)
- **Lyrics Fetch**: ~500-1000ms (network dependent)
- **HTML Parsing**: ~5-10ms (CPU)
- **File Write**: ~1-5ms (disk)
- **Total Time**: ~1-2 seconds typical

## Scalability Notes

- Each fetch is independent (no shared state)
- No caching (future enhancement opportunity)
- Genius API rate limits apply (server-side)
- Concurrent fetches are possible
- Memory footprint is minimal (~10KB per request)
