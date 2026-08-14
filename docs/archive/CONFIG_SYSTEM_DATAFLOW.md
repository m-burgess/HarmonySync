# Config System Data Flow

## Overview

This diagram shows how `config.json` flows through the entire application from file to runtime.

## 1. Service Order Structure

```
service-order.zip
    ↓
[Extract with ServiceOrderImporter]
    ↓
extracted-service-orders/
└── service-uuid/
    └── ServiceName/
        ├── 01 - Item Name/
        │   ├── slides/
        │   ├── videos/
        │   ├── images/
        │   └── config.json ← ENTRY POINT
        ├── 02 - Item Name/
        │   └── config.json
        └── 03 - Item Name/
            └── config.json
```

## 2. Loading Phase

```
ServiceOrderImporter.parseItems(folderPath)
    ↓
for each item directory {
    ↓
    loadItemConfig(itemPath) {
        config.json exists? ← CHECK FILE
            ├─ YES: fs.readFile() → JSON.parse() → ItemConfig
            └─ NO: return undefined
        ↓
        return ItemConfig | undefined
    }
    ↓
    ServiceItem { 
        id, name, path, type, sortOrder, 
        config: ItemConfig  ← ATTACH CONFIG
    }
}
    ↓
ServiceItem[] returned to caller
```

## 3. IPC Bridge

```
Renderer Process
    ↓
window.electron.serviceOrderGetService(serviceId)
    ↓ IPC Channel: 'service-order:getService'
Main Process (ipc-handlers.ts)
    ↓
serviceOrderImporter.getServiceOrder(serviceId)
    ↓
Returns ServiceOrderMetadata {
    id, name, path,
    items: ServiceItem[] {
        └── config: ItemConfig  ← INCLUDED
    },
    extractedAt
}
    ↓ IPC Response
Renderer Process
```

## 4. Configuration Structure

```
ItemConfig {
  ┌─────────────────────────────────────────────────┐
  │ youtubeLinks?: string[] | string                │
  │   → Embed YouTube videos as slides              │
  │   → Can be array of URLs or single URL          │
  │                                                 │
  │ lyricsLink?: string                             │
  │   → Fetch lyrics from external URL              │
  │   → Used only if lyrics.txt missing             │
  │   → Useful for API-based lyric sources          │
  │                                                 │
  │ loopImages?: boolean (default: false)           │
  │   → Cycle through background images             │
  │   → Continuous loop for ambient visuals         │
  │                                                 │
  │ autoplayBackgroundVideo?: boolean (default: false)│
  │   → Auto-start background video                 │
  │   → Reduces manual interaction                  │
  │                                                 │
  │ [key: string]: any                              │
  │   → Extensible for future properties            │
  └─────────────────────────────────────────────────┘
}
```

## 5. Full Request-Response Cycle

### Scenario: Get Service with Configs

```
RENDERER (React Component)
    │
    ├─ User clicks "Load Service"
    │
    ├─ window.electron.serviceOrderGetService('service-uuid')
    │
    └─ Awaits promise...
        │
        ↓ IPC: 'service-order:getService' + serviceId
        │
        ├──────────────────────────────────────────────────────┐
        │ MAIN PROCESS (ipc-handlers.ts)                       │
        │                                                      │
        │  ipcMain.handle('service-order:getService', ...)    │
        │    ↓                                                 │
        │    serviceOrderImporter.getServiceOrder(serviceId)  │
        │      ↓                                               │
        │      servicePath = getPath(serviceId)               │
        │      ↓                                               │
        │      items = parseItems(servicePath)                │
        │        ↓                                             │
        │        for each item in servicePath:                │
        │          ├─ readdir() → get directories             │
        │          ├─ loadItemConfig(itemPath)                │
        │          │   ├─ Check if config.json exists         │
        │          │   ├─ Read and parse JSON                 │
        │          │   └─ Return ItemConfig                   │
        │          ├─ Create ServiceItem { config }           │
        │          └─ Add to items array                      │
        │      ↓                                               │
        │      Return ServiceOrderMetadata {                  │
        │        items: [                                     │
        │          { id, name, path, config: {...} },        │
        │          { id, name, path, config: {...} },        │
        │          ...                                        │
        │        ]                                            │
        │      }                                              │
        │                                                      │
        └──────────────────────────────────────────────────────┘
        │
        ↓ IPC Response with full metadata
        │
RENDERER
    ├─ serviceOrderMetadata = result
    ├─ serviceOrderMetadata.items[0].config
    │  → { youtubeLinks: [...], loopImages: true, ... }
    │
    └─ Render UI with config values
```

## 6. Creating New Configs

### Template Creation Flow

```
RENDERER
    │
    ├─ User clicks "Create Config Template"
    │
    ├─ window.electron.serviceOrderCreateConfigTemplate(itemPath)
    │
    └─ Awaits promise...
        │
        ↓ IPC: 'service-order:createConfigTemplate' + itemPath
        │
        ├──────────────────────────────────────────────────────┐
        │ MAIN PROCESS (ipc-handlers.ts)                       │
        │                                                      │
        │  ipcMain.handle('service-order:createConfigTemplate',)
        │    ↓                                                 │
        │    serviceOrderImporter.createConfigTemplate(...)   │
        │      ↓                                               │
        │      configPath = itemPath + '/config.json'         │
        │      ↓                                               │
        │      template = {                                   │
        │        youtubeLinks: [],                            │
        │        lyricsLink: undefined,                       │
        │        loopImages: false,                           │
        │        autoplayBackgroundVideo: false               │
        │      }                                              │
        │      ↓                                               │
        │      fs.writeFile(configPath, JSON.stringify(...))  │
        │      ↓                                               │
        │      Return { success: true, configPath }           │
        │                                                      │
        └──────────────────────────────────────────────────────┘
        │
        ↓ IPC Response
        │
RENDERER
    ├─ success = true
    ├─ configPath = '/path/to/item/config.json'
    │
    └─ Show "Config created successfully!" toast
```

## 7. Config Usage in Application

```
When Rendering Service Item:

ServiceItem {
  id: "uuid-123"
  name: "Opening Song"
  config: {
    youtubeLinks: ["https://youtube.com/watch?v=..."],
    lyricsLink: null,
    loopImages: true,
    autoplayBackgroundVideo: true
  }
}

→ Slide Renderer
  ├─ Load YouTube videos from youtubeLinks
  ├─ Fetch lyrics from lyricsLink (if available)
  ├─ Enable image looping based on loopImages flag
  └─ Auto-start video if autoplayBackgroundVideo true

→ Display Configuration
  ├─ Apply theme settings
  ├─ Size/position elements
  └─ Respect user preferences
```

## 8. File System View After Import

```
~/.harmonysync/
└── imported-service-orders/
    └── 123e4567-e89b-12d3-a456-426614174000/
        └── Sunday Service 2026-02-02/
            ├── 01 - Opening Worship/
            │   ├── slides/
            │   │   ├── slide1.png
            │   │   └── slide2.png
            │   ├── videos/
            │   │   └── background.mp4
            │   ├── images/
            │   │   └── backdrop.jpg
            │   ├── lyrics.txt
            │   └── config.json ← Configuration loaded automatically
            │       {
            │         "youtubeLinks": [],
            │         "lyricsLink": null,
            │         "loopImages": true,
            │         "autoplayBackgroundVideo": true
            │       }
            │
            ├── 02 - Message/
            │   ├── slides/
            │   └── config.json
            │
            └── 03 - Prayer/
                ├── images/
                └── config.json
```

## 9. Component Integration Example

```typescript
// In React Component
const [service, setService] = useState<ServiceOrderMetadata>();

// Load service with configs
const loadService = async (serviceId: string) => {
  const result = await window.electron.serviceOrderGetService(serviceId);
  setService(result);
};

// Render with config values
{service?.items.map(item => (
  <ServiceItemCard key={item.id}>
    <h3>{item.name}</h3>
    
    {/* Use YouTube links from config */}
    {item.config?.youtubeLinks && (
      <YoutubeEmbed urls={item.config.youtubeLinks} />
    )}
    
    {/* Show if images should loop */}
    {item.config?.loopImages && (
      <ImageCarousel autoLoop={true} />
    )}
    
    {/* Use lyrics link from config */}
    {item.config?.lyricsLink && (
      <LyricsDisplay url={item.config.lyricsLink} />
    )}
    
    {/* Autoplay video if configured */}
    {item.config?.autoplayBackgroundVideo && (
      <VideoPlayer autoplay={true} />
    )}
  </ServiceItemCard>
))}
```

## 10. API Methods Reference

```typescript
// Get service with configs already loaded
await window.electron.serviceOrderGetService(serviceId)
→ ServiceOrderMetadata { items: ServiceItem[] with configs }

// Create template for new item
await window.electron.serviceOrderCreateConfigTemplate(itemPath)
→ { success: boolean; configPath?: string }

// Get reference template
await window.electron.serviceOrderGetConfigTemplate()
→ { success: boolean; template?: ItemConfig }
```

## Summary

The config system provides a flexible, extensible way to customize service items:

1. **File Level**: `config.json` in item folder
2. **Parse Level**: `loadItemConfig()` reads and validates
3. **Model Level**: `ItemConfig` interface defines structure
4. **Data Level**: `ServiceItem.config` carries data through system
5. **API Level**: IPC handlers expose to renderer
6. **UI Level**: React components use config to customize behavior
7. **Extension**: New properties can be added without breaking existing configs

This architecture ensures clean separation of concerns while maintaining type safety and extensibility.
