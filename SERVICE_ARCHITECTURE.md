# Service Architecture Migration - Summary

## Overview

This document summarizes the implementation of dedicated Node.js/Electron services as part of the migration from Rust/Tauri to a more maintainable service-oriented architecture.

## Services Created

### 1. Video Service (`electron/services/video-service.js`)

Handles all video-related operations:

**Key Functions:**
- `getVideoMetadata(videoPath)` - Extract comprehensive video metadata
- `transcodeVideo(inputPath, progressCallback)` - Transcode videos to H.264/AAC for compatibility
- `generateThumbnail(videoPath, timestamp, size)` - Generate video thumbnails
- `extractFrames(videoPath, intervalSeconds)` - Extract frames at intervals
- `getVideoDuration(videoPath)` - Get video duration
- `needsTranscoding(videoPath)` - Check if transcoding is needed
- `optimizeForStreaming(inputPath)` - Optimize for web streaming

### 2. YouTube Service (`electron/services/youtube-service.js`)

Handles YouTube-specific operations:

**Key Functions:**
- `transcodeForYouTube(inputPath, progressCallback)` - Transcode with YouTube recommended settings
- `validateForYouTube(videoPath)` - Validate against YouTube requirements (size, duration, codecs)
- `addYouTubeLink(db, presentationId, url)` - Store YouTube links
- `getYouTubeLinks(db, presentationId)` - Retrieve YouTube links
- `deleteYouTubeLink(db, linkId)` - Remove YouTube links
- `extractYouTubeId(url)` - Parse YouTube video IDs from URLs
- `getYouTubeThumbnailUrl(videoIdOrUrl, quality)` - Get thumbnail URLs
- `isValidYouTubeUrl(url)` - Validate YouTube URLs
- `generateEmbedUrl(videoIdOrUrl, options)` - Generate embed URLs

### 3. Image Service (`electron/services/image-service.js`)

Handles image operations using Sharp library:

**Key Functions:**
- `getImageMetadata(imagePath)` - Extract image metadata (dimensions, format, etc.)
- `generateThumbnail(imagePath, width, height)` - Generate image thumbnails
- `convertFormat(inputPath, format, options)` - Convert between formats (JPEG, PNG, WebP, TIFF)
- `resizeImage(imagePath, width, height, options)` - Resize with flexible options
- `optimizeForWeb(imagePath)` - Optimize for web display
- `addTextOverlay(imagePath, text, options)` - Add text overlays
- `loadAndCache(imagePath)` - Load and cache images
- `clearCache(olderThanDays)` - Clear old cached images
- `getDominantColor(imagePath)` - Extract dominant colors
- `isSupportedImage(filePath)` - Check format support

**Supported Formats:** JPG, JPEG, PNG, GIF, BMP, WebP, TIFF, SVG

### 4. Text Service (`electron/services/text-service.js`)

Handles text and CSS operations:

**Key Functions:**
- `generateBackgroundCSS(options)` - Generate animated gradient backgrounds
- `writeBackgroundCSS(dirPath, css)` - Write CSS to file
- `generateAndSaveCSS(dirPath, options)` - Generate and save background CSS
- `formatLyrics(lyrics)` - Format lyrics with section markers
- `splitLyricsIntoSlides(lyrics, linesPerSlide)` - Split into presentation slides
- `generateSlideHTML(text, style)` - Generate HTML for slides
- `escapeHtml(text)` - Escape HTML special characters
- `extractTextFromFile(filePath)` - Extract text from files
- `wordWrap(text, maxWidth)` - Word wrap text
- `generateTextCSS(style)` - Generate CSS for text styling
- `countWords(text)` - Count words
- `getTextStats(text)` - Get text statistics

## Integration

### IPC Handlers Updated

All new services are registered in `electron/ipc-handlers.js` with the following prefixes:

- `video:*` - Video service endpoints
- `youtube:*` - YouTube service endpoints
- `image:*` - Image service endpoints
- `text:*` - Text service endpoints

### Main Process Integration

Updated `electron/main.js` to:
1. Import all new services
2. Pass services to IPC handlers
3. Maintain backward compatibility with existing `ffmpeg:*` endpoints

### Database Updates

Extended `electron/services/database.js`:
- Added `getConnection()` method for service access
- Added `youtube_links` table for storing YouTube video links

## Dependencies Added

```json
{
  "sharp": "^0.33.0"  // High-performance image processing
}
```

## Backward Compatibility

Maintained compatibility with existing code:
- Original `ffmpeg:*` endpoints still work
- Services can be used independently or together
- No breaking changes to existing frontend code

## Benefits

1. **Better Separation of Concerns** - Each service handles a specific domain
2. **Easier Maintenance** - Services can be updated independently
3. **Improved Testability** - Services can be tested in isolation
4. **Better Code Organization** - Clear structure and responsibility
5. **Extensibility** - Easy to add new services or extend existing ones

## Migration from Rust

This implementation replaces the following Rust functionality:
- Video transcoding and metadata extraction (from `commands.rs`)
- YouTube-specific video handling (from `commands.rs`)
- CSS generation (from `commands.rs`)
- Thumbnail generation (from `commands.rs`)

All functionality previously in Rust is now available through Node.js services with improved modularity and maintainability.

## Next Steps

1. Install dependencies: `npm install`
2. Test all service endpoints
3. Update frontend code to use new service endpoints where beneficial
4. Archive Rust codebase once full migration is verified
5. Update end-user documentation

## Testing

To test the services:

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev
```

Test each service through the IPC endpoints:
- Video service: Try video metadata extraction and transcoding
- YouTube service: Test URL validation and link management
- Image service: Try thumbnail generation and format conversion
- Text service: Test CSS generation and lyrics formatting
