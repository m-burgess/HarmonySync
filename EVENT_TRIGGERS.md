# Event Triggers Documentation

## Overview

The Event Trigger system allows scripts to automatically execute in response to application events. This enables powerful event-driven automation without manual intervention.

## Event Types

### Slide Events

- **slideChange** - Fired when the presentation slide changes
  - Event Data: `{ slideIndex: number, slideContent: object }`
  
- **slideLoad** - Fired when slide content is loaded
  - Event Data: `{ slidePath: string, slideContent: object }`

### Video Events

- **videoStart** - Fired when video playback starts
  - Event Data: `{ videoPath: string, duration: number }`

- **videoEnd** - Fired when video playback ends
  - Event Data: `{ videoPath: string }`

- **videoPause** - Fired when video is paused
  - Event Data: `{ videoPath: string, currentTime: number }`

- **videoResume** - Fired when video resumes from pause
  - Event Data: `{ videoPath: string, currentTime: number }`

### Audio Events

- **audioStart** - Fired when audio playback starts
  - Event Data: `{ audioPath: string, duration: number }`

- **audioEnd** - Fired when audio playback ends
  - Event Data: `{ audioPath: string }`

- **audioPause** - Fired when audio is paused
  - Event Data: `{ audioPath: string, currentTime: number }`

- **audioResume** - Fired when audio resumes from pause
  - Event Data: `{ audioPath: string, currentTime: number }`

### Window Events

- **windowShow** - Fired when a window is shown
  - Event Data: `{ windowName: string }`

- **windowHide** - Fired when a window is hidden
  - Event Data: `{ windowName: string }`

### Macro Events

- **macroExecute** - Fired when a macro is executed
  - Event Data: `{ macroId: string, macroName: string }`

### Scheduler Events

- **scheduledEventStart** - Fired when a scheduled event starts
  - Event Data: `{ eventId: number, eventName: string, eventTime: string }`

- **scheduledEventEnd** - Fired when a scheduled event ends
  - Event Data: `{ eventId: number, eventName: string }`

## Registering Triggers

### Via API

```javascript
// Register a trigger
const trigger = await window.electron.invoke('trigger:register', 
  'slideChange',  // event type
  'my-script',    // script ID
  {
    enabled: true,
    priority: 0,
    condition: 'eventData.slideIndex > 0'  // optional condition
  }
);
```

### Via Script Metadata

Add an `@event` tag to your script metadata:

```javascript
/**
 * @name My Event Handler
 * @description Handles slide changes
 * @author Your Name
 * @version 1.0.0
 * @event slideChange
 */

async function onSlideChange() {
  // Access event data
  const slideIndex = harmony.event.data.slideIndex;
  console.log(`Slide changed to: ${slideIndex}`);
  
  // Your automation here
  if (slideIndex === 0) {
    await harmony.window.show('audience');
  }
}

onSlideChange();
```

## Accessing Event Data

Event data is available in scripts through the `harmony.event` object:

```javascript
// Get event type
const eventType = harmony.event.type;

// Get event data
const eventData = harmony.event.data;

// Get event timestamp
const timestamp = harmony.event.timestamp;

// Check if this is a test event
const isTest = harmony.event.isTest;
```

## Trigger Options

### Priority

Controls the execution order when multiple triggers are registered for the same event. Higher priority triggers execute first.

```javascript
{
  priority: 10  // Default is 0
}
```

### Condition

Optional JavaScript expression that must evaluate to `true` for the trigger to execute:

```javascript
{
  condition: 'eventData.slideIndex > 0'  // Only trigger for slides after first
}
```

```javascript
{
  condition: 'eventData.videoPath.includes("intro")'  // Only for intro videos
}
```

## Managing Triggers

### List All Triggers

```javascript
const triggers = await window.electron.invoke('trigger:getAll');
```

### Enable/Disable Triggers

```javascript
// Disable a trigger
await window.electron.invoke('trigger:disable', triggerId);

// Enable a trigger
await window.electron.invoke('trigger:enable', triggerId);
```

### Remove Triggers

```javascript
await window.electron.invoke('trigger:unregister', triggerId);
```

### Test Triggers

Test a trigger with sample data:

```javascript
const result = await window.electron.invoke('trigger:test', 
  triggerId,
  { slideIndex: 5 }  // test data
);
```

## Emitting Events

Manually emit events for testing or custom workflows:

```javascript
await window.electron.invoke('event:emit', 
  'slideChange',
  { slideIndex: 10, slideContent: {...} }
);
```

## Best Practices

### 1. Keep Triggers Fast

Triggers should execute quickly to avoid blocking the application:

```javascript
async function onSlideChange() {
  // Good: Quick operations
  await harmony.display.updateLowerThirds('Slide changed');
  
  // Bad: Long-running operations
  // await processLargeFile();  // Do this in a separate script
}
```

### 2. Handle Errors

Always wrap trigger code in try-catch:

```javascript
async function onSlideChange() {
  try {
    await harmony.display.showSlide({...});
  } catch (error) {
    console.error('Trigger error:', error);
  }
}
```

### 3. Use Conditions

Filter events with conditions instead of checking in code:

```javascript
// Good: Use condition
{
  eventType: 'slideChange',
  condition: 'eventData.slideIndex === 0'
}

// Less efficient: Check in code
async function onSlideChange() {
  if (harmony.event.data.slideIndex !== 0) return;
  // ...
}
```

### 4. Set Appropriate Priority

Use priority to control execution order:

```javascript
// Critical setup (runs first)
{
  priority: 100,
  eventType: 'slideChange'
}

// Normal processing
{
  priority: 0,
  eventType: 'slideChange'
}

// Cleanup (runs last)
{
  priority: -100,
  eventType: 'slideChange'
}
```

## Example Workflows

### Auto-Show Windows

```javascript
/**
 * @event slideChange
 */
async function autoShowWindows() {
  const slideIndex = harmony.event.data.slideIndex;
  
  if (slideIndex === 0) {
    // Show audience on first slide
    await harmony.window.show('audience');
  }
  
  if (slideIndex === 5) {
    // Show lower thirds on slide 5
    await harmony.window.show('lowerThirds');
  }
}
```

### MIDI Light Sync

```javascript
/**
 * @event videoStart
 */
async function syncLightsToVideo() {
  const videoPath = harmony.event.data.videoPath;
  
  if (videoPath.includes('intro')) {
    // Trigger intro lighting
    await harmony.midi.sendNote(60, 127);
  } else if (videoPath.includes('outro')) {
    // Trigger outro lighting
    await harmony.midi.sendNote(64, 127);
  }
}
```

### Scheduled Actions

```javascript
/**
 * @event scheduledEventStart
 */
async function handleScheduledEvent() {
  const eventName = harmony.event.data.eventName;
  
  if (eventName === 'Pre-Service Music') {
    await harmony.macro.execute('preservice-music-macro');
  } else if (eventName === 'Service Start') {
    await harmony.window.show('audience');
    await harmony.display.showSlide({ text: 'Welcome!' });
  }
}
```

## Troubleshooting

### Trigger Not Executing

1. Check if trigger is enabled
2. Verify script is enabled
3. Check condition (if any)
4. View console for errors
5. Test trigger manually

### Multiple Triggers Firing

Use priority and conditions to control execution order and filtering.

### Performance Issues

- Reduce number of active triggers
- Use conditions to filter events
- Keep trigger scripts simple and fast
- Move complex logic to separate scripts

## API Reference

All trigger-related IPC handlers:

- `trigger:register` - Register new trigger
- `trigger:unregister` - Remove trigger
- `trigger:getAll` - Get all triggers
- `trigger:enable` - Enable trigger
- `trigger:disable` - Disable trigger
- `trigger:test` - Test trigger execution
- `event:list` - List available event types
- `event:emit` - Manually emit event

## See Also

- [SCRIPTING_API.md](SCRIPTING_API.md) - Full scripting API reference
- [Script Templates](harmonysync/script-templates/) - Ready-to-use examples
- [Example Scripts](harmonysync/example-scripts/) - More examples
