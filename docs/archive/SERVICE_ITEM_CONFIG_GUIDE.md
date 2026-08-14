# Service Item Config.json Guide

## Overview

Each service item folder can contain a `config.json` file that customizes how that specific item behaves when displayed. This allows fine-grained control over slides, images, videos, and other content without modifying the core application.

## File Location

```
service-order.zip
└── ServiceName/
    └── 01 - Item Name/
        ├── slides/
        ├── videos/
        ├── images/
        ├── lyrics.txt (optional)
        └── config.json (optional)
```

## Config.json Structure

### Basic Template

```json
{
  "youtubeLinks": [],
  "lyricsLink": null,
  "loopImages": false,
  "autoplayBackgroundVideo": false
}
```

## Configuration Options

### 1. YouTube Links (`youtubeLinks`)

**Type:** `string[]` or `string` (single URL)

**Purpose:** Specify YouTube video links to be loaded as slides for this service item.

**Usage:**
```json
{
  "youtubeLinks": [
    "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    "https://www.youtube.com/watch?v=9bZkp7q19f0"
  ]
}
```

Or single URL:
```json
{
  "youtubeLinks": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
}
```

**Notes:**
- URLs are processed in order
- Full YouTube URLs or shortened URLs (youtu.be) work
- Videos will be embedded as presentation slides

### 2. Lyrics Link (`lyricsLink`)

**Type:** `string` (URL) or `null`

**Purpose:** Specify a URL to fetch lyrics if no `lyrics.txt` file exists in the item folder.

**Usage:**
```json
{
  "lyricsLink": "https://api.genius.com/songs/12345"
}
```

**Behavior:**
- Only used if `lyrics.txt` is not present in the item folder
- If both exist, `lyrics.txt` takes priority
- Useful for dynamically fetching lyrics from services

### 3. Loop Images (`loopImages`)

**Type:** `boolean` (default: `false`)

**Purpose:** Control whether background images loop/cycle continuously.

**Usage:**
```json
{
  "loopImages": true
}
```

**Behavior:**
- When `true`: Images will cycle through continuously during the item display
- When `false`: Images display once or stay on final image
- Useful for worship services with multiple background visuals

### 4. Autoplay Background Video (`autoplayBackgroundVideo`)

**Type:** `boolean` (default: `false`)

**Purpose:** Control whether background videos play automatically.

**Usage:**
```json
{
  "autoplayBackgroundVideo": true
}
```

**Behavior:**
- When `true`: Background videos start playing immediately
- When `false`: Videos require manual playback control
- Useful for creating ambient visual experiences without user interaction

## Complete Example

```json
{
  "youtubeLinks": [
    "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
  ],
  "lyricsLink": "https://genius.com/song-lyrics",
  "loopImages": true,
  "autoplayBackgroundVideo": true
}
```

## Creating Config Files

### Method 1: Automatic Template Creation

Use the service order import dialog to create a template:

```typescript
// In your renderer process
const result = await window.electron.serviceOrderCreateConfigTemplate(
  '/path/to/item/folder',
  false  // overwrite existing?
);

if (result.success) {
  console.log('Config template created at:', result.configPath);
}
```

### Method 2: Get Default Template

Get a reference template structure:

```typescript
const result = await window.electron.serviceOrderGetConfigTemplate();
if (result.success) {
  console.log('Default template:', result.template);
}
```

### Method 3: Manual Creation

Create `config.json` in the item folder with your preferred settings.

## API Reference

### Frontend APIs

#### Create Config Template
```typescript
window.electron.serviceOrderCreateConfigTemplate(
  itemPath: string,
  overwrite?: boolean
): Promise<{ success: boolean; configPath?: string; error?: string }>
```

#### Get Config Template
```typescript
window.electron.serviceOrderGetConfigTemplate(): Promise<{
  success: boolean;
  template?: ItemConfig;
  error?: string
}>
```

### Backend Service

The `ServiceOrderImporter` class handles config loading:

```typescript
// Load config from item folder
private async loadItemConfig(itemPath: string): Promise<ItemConfig | undefined>

// Create config template
async createConfigTemplate(
  itemPath: string,
  overwrite: boolean = false
): Promise<string>

// Get default template
static getDefaultConfigTemplate(): ItemConfig
```

## TypeScript Types

```typescript
export interface ItemConfig {
  /**
   * YouTube links to be loaded as slides
   * Array of URLs or single URL
   */
  youtubeLinks?: string[] | string;

  /**
   * Lyrics link for the lyric fetcher
   * Used if lyrics.txt file is not present
   */
  lyricsLink?: string;

  /**
   * Loop background images
   * If true, images will cycle through continuously
   */
  loopImages?: boolean;

  /**
   * Autoplay background video
   * If true, video will start playing automatically
   */
  autoplayBackgroundVideo?: boolean;

  /**
   * Additional custom settings (extensible)
   */
  [key: string]: any;
}

export interface ServiceItem {
  id: string;
  name: string;
  path: string;
  type: 'folder' | 'song' | 'presentation' | 'video' | 'image';
  sortOrder: number;
  config?: ItemConfig;  // ← Config is now part of ServiceItem
  children?: ServiceItem[];
}
```

## Best Practices

### 1. Always Validate URLs
```json
{
  "youtubeLinks": "https://www.youtube.com/watch?v=VALID_ID"
}
```

### 2. Use Null for Empty Settings
```json
{
  "lyricsLink": null,
  "youtubeLinks": []
}
```

### 3. Comment Your Config
If using JSON with comments (some parsers support this):
```json
{
  // Worship song - loop visuals and autoplay video
  "loopImages": true,
  "autoplayBackgroundVideo": true,
  "lyricsLink": "https://genius.com/worship-song"
}
```

### 4. Test Configuration
After creating a config file:
1. Import the service order
2. Verify the item loads with expected behavior
3. Adjust settings as needed

## Troubleshooting

### Config Not Loading
- **Check:** Filename is exactly `config.json` (case-sensitive on Linux/Mac)
- **Check:** Valid JSON syntax (use JSON validator)
- **Check:** File is in the item folder, not service root

### YouTube Not Embedding
- **Check:** URLs are valid and accessible
- **Check:** Not blocked by CORS or regional restrictions
- **Check:** App has internet connectivity

### Lyrics Not Fetching
- **Check:** `lyrics.txt` doesn't exist in folder
- **Check:** `lyricsLink` is valid URL
- **Check:** API endpoint returns valid response

## Future Enhancements

Potential additions to `ItemConfig`:

```json
{
  "duration": 0,              // Override item duration
  "transitionEffect": "fade", // Slide transition type
  "customBgColor": "#000000", // Background color override
  "fontSize": 16,             // Text size for lyrics
  "videoStartTime": 30,       // Start video at timestamp
  "soundVolume": 0.8,         // Audio volume level
  "customCSS": {}             // Custom styling
}
```

These can be added as needed without breaking existing configs.
