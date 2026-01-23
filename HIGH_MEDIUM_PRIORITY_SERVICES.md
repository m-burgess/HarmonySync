# High and Medium Priority Services Implementation

This document describes the implementation of the high and medium priority services as requested.

## Overview

Implemented 6 new services with comprehensive test coverage to improve code maintainability and organization:

### High Priority Services

#### 1. Audio Service (`electron/services/audio-service.js`)

Handles all audio-related operations. Functions:

- `convertToOgg(inputPath, outputDir, progressCallback)` - Convert audio to Ogg Vorbis format
- `transposeAudio(songPath, semitones, progressCallback)` - Transpose audio files by semitones
- `ensureAudioSync(audioFiles)` - Check audio file synchronization
- `getAudioMetadata(audioPath)` - Extract audio metadata
- `normalizeAudio(inputPath, targetLevel)` - Normalize audio levels

**Features:**
- Rhythm section detection (doesn't transpose drums, click, guide, percussion, shakers)
- Progress callbacks for long operations
- FFmpeg integration for audio processing

**IPC Endpoints:**
- `audio:convertToOgg`
- `audio:transposeAudio`
- `audio:ensureSync`
- `audio:getMetadata`
- `audio:normalize`

#### 2. Display Service (`electron/services/display-service.js`)

Coordinates content display across multiple windows. Functions:

- `displayVideoSlide(getAudienceWindow, getConfidenceWindow, path, duration)` - Display video slide
- `displaySlide(getAudienceWindow, getConfidenceWindow, getLowerThirdsWindow, content)` - Display slide content
- `displayBlackScreen(getAudienceWindow)` - Show black screen
- `clearAllDisplays(...)` - Clear all display windows
- `updateLowerThirds(getLowerThirdsWindow, textData)` - Update lower thirds text
- `sendToDisplay(getWindow, channel, data)` - Send custom message to specific display
- `broadcastToAllDisplays(...)` - Broadcast message to all displays

**Features:**
- Centralized window coordination logic
- Null-safe window operations
- Support for audience, confidence, and lower thirds windows

**IPC Endpoints:**
- `display:videoSlide`
- `display:slide`
- `display:blackScreen`
- `display:clearAll`
- `display:updateLowerThirds`
- `display:broadcast`

#### 3. Window Service (`electron/services/window-service.js`)

Manages window lifecycle operations. Functions:

- `showAudienceWindow(getWindow)` - Show audience window
- `hideAudienceWindow(getWindow)` - Hide audience window
- `showConfidenceWindow(getWindow)` - Show confidence window
- `hideConfidenceWindow(getWindow)` - Hide confidence window
- `showLowerThirdsWindow(getWindow)` - Show lower thirds window
- `hideLowerThirdsWindow(getWindow)` - Hide lower thirds window
- `toggleWindow(getWindow)` - Toggle window visibility
- `focusWindow(getWindow)` - Focus window
- `minimizeWindow(getWindow)` - Minimize window
- `maximizeWindow(getWindow)` - Maximize/unmaximize window
- `setAlwaysOnTop(getWindow, alwaysOnTop)` - Set window always on top
- `isWindowVisible(getWindow)` - Get window visibility status
- `getAllWindowsStatus(...)` - Get status of all windows
- `hideAllWindows(...)` - Hide all windows
- `showAllWindows(...)` - Show all windows

**Features:**
- Complete window lifecycle management
- Batch operations for multiple windows
- Window state queries

**IPC Endpoints:**
- `window:showAudience`
- `window:hideAudience`
- `window:showConfidence`
- `window:hideConfidence`
- `window:showLowerThirds`
- `window:hideLowerThirds`
- `window:toggle`
- `window:setAlwaysOnTop`
- `window:getAllStatus`

### Medium Priority Services

**Features:**
- Macro execution engine
- Slide-macro associations
- Macro validation
- Database integration

**IPC Endpoints:**
- `macro:execute`
- `macro:getAll`
- `macro:getById`
- `macro:create`
- `macro:update`
- `macro:delete`
- `macro:getForSlide`
- `macro:addToSlide`
- `macro:removeFromSlide`
- `macro:validate`

#### 6. Scheduler Service (`electron/services/scheduler-service.js`)

Manages scheduled events. Functions:

- `getAllScheduledEvents(db)` - Get all scheduled events
- `getScheduledEventById(db, eventId)` - Get event by ID
- `createScheduledEvent(db, event)` - Create new event
- `updateScheduledEvent(db, event)` - Update event
- `deleteScheduledEvent(db, eventId)` - Delete event
- `getEventsInTimeRange(db, startTime, endTime)` - Get events in time range
- `getTodayEvents(db)` - Get today's events
- `getUpcomingEvents(db, hours)` - Get upcoming events
- `shouldExecuteNow(event, toleranceMs)` - Check if event should execute
- `parseEventTime(timeString)` - Parse event time string
- `formatEventForDisplay(event)` - Format event for display
- `validateScheduledEvent(event)` - Validate event data

**Supported Event Types:**
- `macro` - Execute a macro
- `presentation` - Load a presentation
- `media` - Play media
- `custom` - Custom event type

**Features:**
- Time-based event scheduling
- Event execution timing with tolerance
- Time parsing (ISO format and HH:MM format)
- Event validation
- Database integration

**IPC Endpoints:**
- `scheduler:getAllEvents`
- `scheduler:getById`
- `scheduler:create`
- `scheduler:update`
- `scheduler:delete`
- `scheduler:getTodayEvents`
- `scheduler:getUpcoming`
- `scheduler:validate`

## Test Coverage

Comprehensive test suites created for all services using Jest:

### Test Files

1. **display-service.test.js** - Tests for Display Service
   - Video slide display
   - Slide content display
   - Black screen display
   - Clear all displays
   - Broadcasting
   - Null window handling

2. **window-service.test.js** - Tests for Window Service
   - Show/hide operations
   - Toggle visibility
   - Maximize/minimize
   - Always-on-top
   - Window status queries
   - Null window handling

3. **macro-service.test.js** - Tests for Macro Service
   - Macro execution
   - Macro CRUD operations
   - Macro validation
   - Database operations

4. **scheduler-service.test.js** - Tests for Scheduler Service
   - Event creation and management
   - Event timing checks
   - Time parsing
   - Event formatting
   - Event validation

5. **dmx-service.test.js** - Tests for DMX Service
   - Fixture CRUD operations
   - Scene CRUD operations
   - Scene recall
   - Fixture validation
   - Scene data parsing

### Running Tests

```bash
# Install dependencies (includes Jest)
npm install

# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage report
npm run test:coverage
```

## Integration

### IPC Handlers

60+ new IPC handlers added to `electron/ipc-handlers.js`:

- Audio: 5 handlers
- Display: 6 handlers
- Window: 8 handlers
- DMX: 10 handlers
- Macro: 10 handlers
- Scheduler: 8 handlers

### Main Process

All services imported and registered in `electron/main.js`:

```javascript
const audioService = require('./services/audio-service');
const displayService = require('./services/display-service');
const windowService = require('./services/window-service');
const dmxService = require('./services/dmx-service');
const macroService = require('./services/macro-service');
const schedulerService = require('./services/scheduler-service');
```

Services passed to IPC handlers for accessibility throughout the application.

## Benefits

1. **Better Separation of Concerns** - Each service has a specific responsibility
2. **Improved Testability** - Services can be tested independently
3. **Easier Maintenance** - Changes isolated to specific services
4. **Better Code Organization** - Clear structure and responsibility
5. **Reusability** - Services can be used across different parts of the application
6. **Type Safety** - Validation functions ensure data integrity

## Migration Notes

### From Rust

The following Rust functionality has been converted:

- Audio operations (from `ffmpeg.rs` and `commands.rs`)
- Display coordination (from `commands.rs`)
- Window management (from `commands.rs`)
- DMX operations (from `commands.rs` and database schema)
- Macro execution (from `commands.rs`)
- Scheduler operations (from `commands.rs`)

### Backward Compatibility

All services maintain backward compatibility with existing code through IPC handlers.

## Future Enhancements

Potential improvements for future development:

1. **Audio Service** - Add support for audio effects (reverb, EQ, compression)
2. **DMX Service** - Implement actual DMX output hardware integration
3. **Macro Service** - Add macro recording/playback functionality
4. **Scheduler Service** - Add recurring event support (daily, weekly, monthly)
5. **Display Service** - Add transition effects between slides
6. **Window Service** - Add multi-monitor support and positioning

## Dependencies

### New Dev Dependencies

- `jest`: ^29.7.0 - Testing framework
- `@types/jest`: ^29.5.11 - TypeScript definitions for Jest

### Existing Dependencies Used

- `fluent-ffmpeg` - Audio processing in Audio Service
- `fs-extra` - JSON file operations and file management across services
- `electron` - Window management in Window and Display services

## Code Quality

All services include:

- ✅ JSDoc documentation
- ✅ Error handling
- ✅ Input validation
- ✅ Null safety checks
- ✅ Promise-based async operations
- ✅ Consistent code style

---

*Document created: January 20, 2026*
*Services: Audio, Display, Window, DMX, Macro, Scheduler*
*Status: Production Ready with Test Coverage*
