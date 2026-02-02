# HarmonySync Scripting API Documentation

Complete reference for the HarmonySync Scripting API - create custom automation, macros, and plugins using JavaScript.

## Overview

The HarmonySync Scripting API allows users to create custom scripts that control all aspects of the presentation software. Scripts run in a secure sandboxed environment with access to a curated API.

## Getting Started

### Creating a Script

1. Open the Script Editor window
2. Click "New Script"
3. Write your JavaScript code
4. Use the `harmony` global object to access the API
5. Click "Test Run" to validate
6. Click "Save" to save your script

### Basic Script Structure

```javascript
/**
 * @name My Script Name
 * @description What this script does
 * @author Your Name
 * @version 1.0.0
 * @enabled true
 */

async function main() {
  // Your code here
  await harmony.display.showSlide({ text: "Hello!" });
}

main();
```

## API Reference

### harmony.display

Control content display across multiple windows.

#### `showSlide(content)`
Display a slide on all presentation windows.

```javascript
await harmony.display.showSlide({
  text: "Welcome!",
  background: "#1a1a2e",
  fontSize: "48px",
  textAlign: "center"
});
```

#### `showVideo(videoPath, options)`
Display a video file.

```javascript
await harmony.display.showVideo("/path/to/video.mp4", {
  autoplay: true,
  loop: false
});
```

#### `blackScreen()`
Show black screen on all displays.

```javascript
await harmony.display.blackScreen();
```

#### `clearAll()`
Clear all displays.

```javascript
await harmony.display.clearAll();
```

#### `updateLowerThirds(text)`
Update lower thirds text overlay.

```javascript
await harmony.display.updateLowerThirds("Now playing: Amazing Grace");
```

#### `sendToDisplay(windowName, message)`
Send custom message to specific display.

```javascript
await harmony.display.sendToDisplay('audience', {
  type: 'custom',
  data: { foo: 'bar' }
});
```

### harmony.audio

Control audio operations.

#### `convertToOgg(inputPath, outputPath)`
Convert audio to OGG format.

```javascript
await harmony.audio.convertToOgg(
  "/path/to/input.mp3",
  "/path/to/output.ogg"
);
```

#### `transpose(inputPath, outputPath, semitones)`
Transpose audio by semitones.

```javascript
await harmony.audio.transpose(
  "/path/to/input.mp3",
  "/path/to/output.mp3",
  2  // Transpose up 2 semitones
);
```

#### `getMetadata(audioPath)`
Get audio file metadata.

```javascript
const metadata = await harmony.audio.getMetadata("/path/to/audio.mp3");
console.log(metadata.duration, metadata.bitrate);
```

### harmony.video

Control video operations.

#### `getMetadata(videoPath)`
Get video file metadata.

```javascript
const metadata = await harmony.video.getMetadata("/path/to/video.mp4");
console.log(metadata.width, metadata.height, metadata.duration);
```

#### `generateThumbnail(videoPath, outputPath, options)`
Generate video thumbnail.

```javascript
await harmony.video.generateThumbnail(
  "/path/to/video.mp4",
  "/path/to/thumb.jpg",
  { timestamp: "00:00:05" }
);
```

### harmony.image

Control image operations.

#### `getMetadata(imagePath)`
Get image metadata.

```javascript
const metadata = await harmony.image.getMetadata("/path/to/image.jpg");
console.log(metadata.width, metadata.height, metadata.format);
```

#### `generateThumbnail(imagePath, outputPath, options)`
Generate image thumbnail.

```javascript
await harmony.image.generateThumbnail(
  "/path/to/image.jpg",
  "/path/to/thumb.jpg",
  { width: 200, height: 200 }
);
```

#### `resize(imagePath, outputPath, options)`
Resize image.

```javascript
await harmony.image.resize(
  "/path/to/image.jpg",
  "/path/to/resized.jpg",
  { width: 1920, height: 1080 }
);
```

### harmony.text

Control text operations.

#### `generateGradient(options)`
Generate CSS gradient background.

```javascript
const css = harmony.text.generateGradient({
  colors: ['#ff6b6b', '#4ecdc4', '#45b7d1'],
  angle: 45
});
```

#### `formatLyrics(lyrics)`
Format raw lyrics text.

```javascript
const formatted = harmony.text.formatLyrics(rawLyricsText);
```

#### `splitLyrics(lyrics, options)`
Split lyrics into slides.

```javascript
const slides = harmony.text.splitLyrics(formatted, {
  linesPerSlide: 4
});
```

### harmony.window

Control window visibility and behavior.

#### `show(windowName)`
Show a window.

```javascript
await harmony.window.show('audience');
await harmony.window.show('confidence');
await harmony.window.show('lowerThirds');
await harmony.window.show('main');
```

#### `hide(windowName)`
Hide a window.

```javascript
await harmony.window.hide('audience');
```

#### `toggle(windowName)`
Toggle window visibility.

```javascript
await harmony.window.toggle('audience');
```

#### `isVisible(windowName)`
Check if window is visible.

```javascript
if (harmony.window.isVisible('audience')) {
  console.log("Audience window is visible");
}
```

### harmony.midi

Control MIDI output.

#### `sendNote(note, velocity, duration)`
Send MIDI note.

```javascript
await harmony.midi.sendNote(60, 127, 100);  // Middle C, full velocity, 100ms
```

#### `sendCC(controller, value)`
Send MIDI control change.

```javascript
await harmony.midi.sendCC(7, 100);  // Volume CC, value 100
```

### harmony.macro

Execute existing macros.

#### `execute(macroId, options)`
Execute a macro.

```javascript
await harmony.macro.execute('start_preservice_music');
```

### harmony.scheduler

Access scheduled events.

#### `getTodayEvents(db)`
Get today's scheduled events.

```javascript
const events = await harmony.scheduler.getTodayEvents(db);
console.log(events);
```

#### `getUpcomingEvents(db, hours)`
Get upcoming events.

```javascript
const events = await harmony.scheduler.getUpcomingEvents(db, 24);
```

### harmony.utils

Utility functions.

#### `wait(ms)`
Wait for specified milliseconds.

```javascript
await harmony.utils.wait(1000);  // Wait 1 second
```

#### `now()`
Get current timestamp.

```javascript
const timestamp = harmony.utils.now();
```

#### `formatDate(date, format)`
Format date.

```javascript
const formatted = harmony.utils.formatDate(new Date());
```

## Security

Scripts run in a sandboxed environment with:
- No filesystem access (except userData)
- No network access
- 10-second execution timeout (configurable)
- Limited API surface
- Error handling with stack traces

## Examples

### Example 1: Countdown Timer

```javascript
async function countdown() {
  for (let i = 5; i > 0; i--) {
    await harmony.display.showSlide({
      text: `${i}`,
      fontSize: "120px"
    });
    await harmony.utils.wait(1000);
  }
  await harmony.display.showSlide({ text: "GO!" });
}

countdown();
```

### Example 2: MIDI Sequence

```javascript
async function playSequence() {
  const notes = [60, 62, 64, 65, 67];
  for (const note of notes) {
    await harmony.midi.sendNote(note, 100, 200);
    await harmony.utils.wait(300);
  }
}

playSequence();
```

### Example 3: Auto Lower Thirds

```javascript
async function rotateLowerThirds() {
  const messages = [
    "Welcome!",
    "Turn off phones",
    "Offering at 10:30"
  ];
  
  for (const msg of messages) {
    await harmony.display.updateLowerThirds(msg);
    await harmony.utils.wait(5000);
  }
}

rotateLowerThirds();
```

## Script Sharing

Export your scripts to share with the community:

1. Click "Export" in the Script Editor
2. Save the `.js` file
3. Share on GitHub or community forums

Import scripts from others:

1. Click "Import" in the Script Editor
2. Select the `.js` file
3. The script will be added to your library

## Best Practices

1. **Use async/await** - Most API functions are asynchronous
2. **Add error handling** - Wrap risky operations in try-catch
3. **Test scripts** - Use "Test Run" before saving
4. **Document your code** - Use JSDoc comments
5. **Keep scripts focused** - One script = one task
6. **Use console.log** - For debugging and progress tracking

## Troubleshooting

### Script won't execute
- Check syntax with "Validate"
- Ensure all await keywords are present
- Check console for errors

### Timeout errors
- Scripts have 10s execution limit
- Break long operations into smaller scripts
- Use progress logging

### API not working
- Ensure function names are correct
- Check parameter types
- Verify window/service is available

## Support

For help and community scripts:
- GitHub: github.com/m-burgess/RustPresenter
- Documentation: See SERVICE_ARCHITECTURE.md
- Examples: harmonysync/example-scripts/

---

*Version 1.0.0 - Updated January 2026*
