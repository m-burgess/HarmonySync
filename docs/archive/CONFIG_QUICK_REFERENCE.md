# Service Item Config - Quick Reference

## What Is It?

A `config.json` file that goes in each service item folder to customize its behavior.

## Where Does It Go?

```
service-order.zip
└── ServiceName/
    └── 01 - Item Name/
        └── config.json ← HERE
```

## Quick Start

### Step 1: Create Template
```typescript
const result = await window.electron.serviceOrderCreateConfigTemplate(
  '/path/to/item/folder'
);
```

### Step 2: Edit config.json
```json
{
  "youtubeLinks": ["https://youtube.com/watch?v=VIDEO_ID"],
  "lyricsLink": null,
  "loopImages": true,
  "autoplayBackgroundVideo": false
}
```

### Step 3: Load Service
```typescript
const service = await window.electron.serviceOrderGetService(serviceId);
const config = service.items[0].config;
```

## Configuration Options

| Option | Type | Default | Purpose |
|--------|------|---------|---------|
| `youtubeLinks` | `string[]` or `string` | `[]` | Embed YouTube videos as slides |
| `lyricsLink` | `string` or `null` | `null` | Fetch lyrics from URL (if no lyrics.txt) |
| `loopImages` | `boolean` | `false` | Cycle through background images |
| `autoplayBackgroundVideo` | `boolean` | `false` | Auto-start background video |

## Examples

### Worship Song with Loop Visuals
```json
{
  "youtubeLinks": [],
  "lyricsLink": null,
  "loopImages": true,
  "autoplayBackgroundVideo": true
}
```

### Teaching with YouTube
```json
{
  "youtubeLinks": "https://youtube.com/watch?v=dQw4w9WgXcQ",
  "lyricsLink": null,
  "loopImages": false,
  "autoplayBackgroundVideo": false
}
```

### Multiple YouTube Videos
```json
{
  "youtubeLinks": [
    "https://youtube.com/watch?v=VIDEO1",
    "https://youtube.com/watch?v=VIDEO2",
    "https://youtube.com/watch?v=VIDEO3"
  ],
  "lyricsLink": null,
  "loopImages": false,
  "autoplayBackgroundVideo": false
}
```

### Prayer with Dynamic Lyrics
```json
{
  "youtubeLinks": [],
  "lyricsLink": "https://genius.com/api/song-lyrics",
  "loopImages": true,
  "autoplayBackgroundVideo": false
}
```

## API Reference

```typescript
// Load service with all configs
const service = await window.electron.serviceOrderGetService(serviceId);
const itemConfig = service.items[0].config;

// Create config template
const result = await window.electron.serviceOrderCreateConfigTemplate(itemPath);

// Get template reference
const template = await window.electron.serviceOrderGetConfigTemplate();
```

## TypeScript

```typescript
interface ItemConfig {
  youtubeLinks?: string[] | string;
  lyricsLink?: string;
  loopImages?: boolean;
  autoplayBackgroundVideo?: boolean;
  [key: string]: any; // Extensible
}
```

## Notes

- Config is **optional** - items work without it
- File must be named exactly `config.json` (case-sensitive)
- Must be valid JSON format
- Falls back to `lyrics.txt` if `lyricsLink` not set
- URLs must be valid and accessible
- Settings apply only to that specific item

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Config not loading | Check filename, JSON syntax, file location |
| YouTube not showing | Verify URL is valid, check internet connection |
| Lyrics not fetching | Check URL is valid, ensure `lyrics.txt` doesn't exist in folder |
| Video not autoplaying | May need user interaction first (browser security) |

## File Structure Example

```
service.zip
├── Morning Worship 2/2/26/
│   ├── 01 - Welcome/
│   │   ├── slides/
│   │   ├── videos/
│   │   ├── images/
│   │   ├── lyrics.txt
│   │   └── config.json ← Item-specific config
│   │
│   ├── 02 - Worship Song 1/
│   │   ├── slides/
│   │   ├── images/
│   │   ├── background.mp4
│   │   └── config.json
│   │
│   └── 03 - Message/
│       ├── slides/
│       ├── notes.txt
│       └── config.json
```

## Minimal Config
```json
{}
```
Uses all defaults. Works fine!

## Full-Featured Config
```json
{
  "youtubeLinks": ["https://youtube.com/watch?v=ABC123"],
  "lyricsLink": "https://genius.com/song",
  "loopImages": true,
  "autoplayBackgroundVideo": true
}
```

---

**For detailed guide:** See [SERVICE_ITEM_CONFIG_GUIDE.md](SERVICE_ITEM_CONFIG_GUIDE.md)  
**For data flow:** See [CONFIG_SYSTEM_DATAFLOW.md](CONFIG_SYSTEM_DATAFLOW.md)  
**For implementation:** See [CONFIG_SYSTEM_IMPLEMENTATION.md](CONFIG_SYSTEM_IMPLEMENTATION.md)
