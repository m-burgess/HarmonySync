# Script Templates

This directory contains ready-to-use script templates to help you create custom automation quickly.

## Available Templates

### 1. Basic Script (`basic-script.js`)
A simple template for creating new scripts with basic structure and examples.

**Use cases:**
- Learning the scripting API
- Simple one-off tasks
- Quick prototyping

### 2. Event Handler (`event-handler.js`)
Template for creating event-driven scripts that respond to application events.

**Use cases:**
- Auto-execute on slide changes
- Respond to video/audio playback
- Handle scheduled events

**Supported Events:**
- `slideChange` - When presentation slide changes
- `slideLoad` - When slide content loads
- `videoStart`, `videoEnd`, `videoPause`, `videoResume` - Video events
- `audioStart`, `audioEnd`, `audioPause`, `audioResume` - Audio events
- `windowShow`, `windowHide` - Window visibility
- `macroExecute` - Macro execution
- `scheduledEventStart`, `scheduledEventEnd` - Scheduler events

### 3. MIDI Controller (`midi-controller.js`)
Template for sending MIDI notes and control changes.

**Use cases:**
- Triggering lighting cues
- Controlling external gear
- MIDI sequences and patterns

### 4. Slide Automation (`slide-automation.js`)
Template for automated slide presentations with timing.

**Use cases:**
- Auto-advancing presentations
- Timed content display
- Unattended presentations

### 5. Window Controller (`window-controller.js`)
Template for managing multiple application windows.

**Use cases:**
- Complex multi-screen setups
- Automated window management
- Presentation mode switching

### 6. Audio Processor (`audio-processor.js`)
Template for audio file processing and manipulation.

**Use cases:**
- Batch audio conversion
- Audio transposition
- Metadata extraction

### 7. Scheduled Task (`scheduled-task.js`)
Template for time-based automation and recurring tasks.

**Use cases:**
- Running tasks at specific times
- Periodic checks
- Time-triggered actions

### 8. Display Effects (`display-effects.js`)
Template for visual effects and transitions.

**Use cases:**
- Countdown timers
- Flashing alerts
- Animated backgrounds
- Lower thirds animations

### 9. Data Processor (`data-processor.js`)
Template for data manipulation and processing.

**Use cases:**
- Lyrics formatting
- Data transformation
- Report generation

### 10. Plugin Template (`plugin-template.js`)
Advanced template for creating full-featured plugins.

**Use cases:**
- Complex automation systems
- Adding new features
- Long-running background tasks

## How to Use Templates

1. Open Script Editor in HarmonySync
2. Click "Load Template" button
3. Select a template from the list
4. Customize the template code for your needs
5. Save as a new script

## Customization Tips

- Update the `@name`, `@description`, and `@author` fields
- Modify the code to fit your specific use case
- Test scripts thoroughly before using in production
- Use `console.log()` for debugging
- Handle errors with try-catch blocks

## API Reference

All templates use the HarmonySync Scripting API (`harmony.*`). See SCRIPTING_API.md for complete documentation.

**Available Namespaces:**
- `harmony.display` - Display control
- `harmony.audio` - Audio operations
- `harmony.video` - Video operations
- `harmony.image` - Image processing
- `harmony.text` - Text/CSS generation
- `harmony.window` - Window management
- `harmony.midi` - MIDI control
- `harmony.macro` - Macro execution
- `harmony.scheduler` - Event scheduling
- `harmony.utils` - Utility functions
- `harmony.debug` - Debugging tools

## Contributing

Have a useful template? Share it with the community!

1. Export your script
2. Add documentation
3. Submit to the community repository

## Support

For help with scripting:
- Read SCRIPTING_API.md for API documentation
- Check example-scripts/ for more examples
- Ask in the community forums
