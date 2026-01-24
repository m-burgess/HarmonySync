# Scheduler Feature

## Overview

The Scheduler feature allows users to schedule macros to run automatically at specific times on specific days of the week. This is particularly useful for recurring tasks like starting and stopping pre-service music or sending MIDI notes at scheduled times.

## UI Changes

### Calendar Icon Added to Activity Bar

A new calendar icon has been added to the left activity bar, positioned between "Service Order" and "Pre-Service Music" icons. Clicking this icon opens the Scheduler panel.

## Features

### 1. Common Macros

The scheduler includes pre-defined common macros stored in `src/data/common_macros.json`:

#### Pre-Service Music Macros
- **Start Pre-service Music**: Starts playing pre-service music from the configured YouTube playlist
- **Stop Pre-service Music**: Stops the pre-service music playback

#### MIDI Note Macros
- **MIDI Notes C4-C5**: Sends MIDI note on messages with velocity 127 for notes C4 through C5 (MIDI notes 60-72)
  - Each note is labeled with its musical name (e.g., "C4", "C#4", "D4")
  - Can be used to trigger external MIDI devices or software

### 2. Scheduling Interface

The scheduler provides an intuitive interface with:

1. **Schedule New Event Section**:
   - Dropdown to select from available macros (grouped by Pre-service Music and MIDI Notes)
   - Day of week selector (Sunday through Saturday)
   - Time picker (24-hour format)
   - "Recurring weekly" checkbox

2. **Scheduled Events List**:
   - Shows all scheduled events
   - Each event displays its macro name, day, and time
   - Checkbox to enable/disable events without deleting them
   - Delete button to remove events

3. **Weekly Overview Calendar**:
   - Visual calendar showing scheduled events for each day of the week
   - Events displayed as blue chips showing their scheduled time

### 3. Event Management

- **Add Events**: Create new scheduled events using the form at the top
- **Enable/Disable Events**: Toggle checkboxes to temporarily enable or disable events
- **Delete Events**: Click trash icon to remove events permanently
- **Persistent Storage**: All scheduled events are saved in browser localStorage

### 4. Automatic Execution

The scheduler automatically:
- Checks for scheduled events every minute when the scheduler panel is open
- Executes matching events by calling the backend `execute_macro` command
- Emits appropriate events (start-preservice-music, stop-preservice-music, send-midi-note) to the application

## Usage Examples

### Example 1: Automated Pre-Service Music Every Saturday

1. Click the calendar icon in the activity bar
2. In the "Select Macro" dropdown, choose "Start Pre-service Music"
3. Select "Saturday" as the day
4. Set time to "16:30" (4:30 PM)
5. Ensure "Recurring weekly" is checked
6. Click "Add Scheduled Event"

7. Add a second event to stop the music:
   - Select "Stop Pre-service Music"
   - Choose "Saturday"
   - Set time to "16:55" (4:55 PM)
   - Ensure "Recurring weekly" is checked
   - Click "Add Scheduled Event"

Now, every Saturday at 4:30 PM, the pre-service music will start automatically, and at 4:55 PM it will stop.

### Example 2: MIDI Note Trigger

Schedule a MIDI note to be sent every Sunday:

1. Click the calendar icon
2. Select "MIDI C4 (Middle C)" from the macro dropdown
3. Choose "Sunday"
4. Set time to "10:00"
5. Enable "Recurring weekly"
6. Click "Add Scheduled Event"

## Technical Implementation

### Files Added/Modified

**New Files:**
- `harmonysync/src/components/screens/Scheduler.jsx` - Main scheduler component
- `harmonysync/src/data/common_macros.json` - Macro definitions
- `SCHEDULER_FEATURE.md` - This documentation

**Modified Files:**
- `harmonysync/src/App.jsx` - Added calendar icon, scheduler state, and event listeners
- `harmonysync/src-tauri/src/application/commands.rs` - Added `execute_macro` command
- `harmonysync/src-tauri/src/lib.rs` - Registered `execute_macro` command

### Architecture

**Frontend:**
- React component with state management for scheduled events
- Uses localStorage for persistence
- Checks events every minute via setInterval
- Calls backend command to execute macros

**Backend:**
- New `execute_macro` IPC command
- Emits events to main window based on macro action:
  - `start-preservice-music`
  - `stop-preservice-music`  
  - `send-midi-note` (with note and velocity payload)

**Event Flow:**
1. User creates scheduled event in UI
2. Event stored in localStorage
3. Every minute, scheduler checks for matching events
4. When match found, calls `execute_macro` backend command
5. Backend emits appropriate event to main window
6. App.jsx listens for events and triggers appropriate actions

## Data Structure

### Macro Definition (common_macros.json)
```json
{
  "id": "start_preservice_music",
  "name": "Start Pre-service Music",
  "action": "start_preservice_music",
  "description": "Start playing pre-service music from YouTube playlist"
}
```

### Scheduled Event (localStorage)
```json
{
  "id": 1729130400000,
  "macroId": "start_preservice_music",
  "macroName": "Start Pre-service Music",
  "day": "Saturday",
  "time": "16:30",
  "recurring": true,
  "enabled": true
}
```

## Future Enhancements

1. **More Macro Types**: Slide navigation, display control, lighting cues
2. **One-Time Events**: Non-recurring events with specific dates  
3. **Event History**: Log of executed scheduled events
4. **Export/Import**: Save/load scheduler configurations
5. **Conflict Detection**: Warn about overlapping events
6. **Custom MIDI**: Support for more complex MIDI messages
7. **Remote Control**: API to trigger macros remotely
8. **Notifications**: Alert user before/after event execution

## Testing

To test the scheduler:

1. **Manual UI Test**:
   - Build and run the application: `npm run tauri dev`
   - Click the calendar icon
   - Create a test event scheduled 1-2 minutes in the future
   - Verify the event appears in the list
   - Wait for the scheduled time and verify execution
   - Test enable/disable toggle
   - Test delete functionality

2. **Build Test**:
   ```bash
   cd harmonysync
   npm run build  # Frontend should build without errors
   ```

## Notes

- Events only execute while the application is running
- Scheduler checks events only when the scheduler panel is open
- Times are in 24-hour format
- MIDI functionality requires system MIDI device configuration
- All events stored in browser localStorage (not persisted to database)

