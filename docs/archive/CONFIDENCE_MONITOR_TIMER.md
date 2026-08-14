# Confidence Monitor Timer Feature

## Overview

The Confidence Monitor includes a dynamic timer component that displays at the bottom of the screen when enabled. The timer changes color based on how much time has elapsed to provide visual feedback to presenters.

**Important:** The timer stays hidden until explicitly enabled via the `confidence-timer-enable` event from the main window.

## Timer Events

The confidence monitor listens for the following events to control the timer:

### Timer Visibility Control

#### `confidence-timer-enable`

Enables the timer display on the confidence monitor. The timer will remain hidden until this event is sent, even if timer events are being received.

**Payload:** None

**Example:**
```javascript
event.emit('confidence-timer-enable');
```

#### `confidence-timer-disable`

Disables the timer display on the confidence monitor. The timer data continues to update but the display is hidden.

**Payload:** None

**Example:**
```javascript
event.emit('confidence-timer-disable');
```

### Timer Data Events

#### `timer-started`

Emitted when a timer is started from the main screen. This updates the timer data but does not show the timer unless it's enabled.

**Payload:**
```typescript
{
  total: number  // Total time in seconds
}
```

**Example:**
```javascript
event.emit('timer-started', { total: 600 }); // 10 minute timer
```

#### `timer-update`

Emitted periodically to update the timer's elapsed time.

**Payload:**
```typescript
{
  elapsed: number,  // Elapsed time in seconds
  total: number     // Total time in seconds
}
```

**Example:**
```javascript
event.emit('timer-update', { elapsed: 300, total: 600 }); // 5 minutes elapsed of 10 minute timer
```

#### `timer-stopped`

Emitted when a timer is stopped or completes.

**Payload:** None

**Example:**
```javascript
event.emit('timer-stopped');
```

## Timer Display States

The timer component has three visual states based on progress:

### Normal State (0-74% complete)
- **Background:** Dark grey with transparency (rgba(64, 64, 64, 0.85))
- **Text Color:** White
- **Use Case:** Normal countdown display

### Warning State (75-89% complete)
- **Background:** Bright orange (rgba(255, 140, 0, 0.9))
- **Text Color:** White
- **Use Case:** Alerts presenter that time is running out

### Critical State (90-100% complete)
- **Background:** Bright red (rgba(255, 0, 0, 0.9))
- **Text Color:** White
- **Animation:** Pulsing effect
- **Use Case:** Urgent notification that time is almost up

## Implementation Example

Here's an example of how to implement a timer in the main application with visibility control:

```typescript
class TimerService {
  private intervalId: NodeJS.Timeout | null = null;
  private startTime: number = 0;
  private totalTime: number = 0;

  start(durationInSeconds: number, showOnConfidence: boolean = false) {
    this.totalTime = durationInSeconds;
    this.startTime = Date.now();
    
    // Notify confidence monitor of timer data
    event.emit('timer-started', { total: this.totalTime });
    
    // Optionally enable timer display on confidence monitor
    if (showOnConfidence) {
      event.emit('confidence-timer-enable');
    }
    
    // Update every second
    this.intervalId = setInterval(() => {
      const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
      
      if (elapsed >= this.totalTime) {
        this.stop();
        return;
      }
      
      event.emit('timer-update', { 
        elapsed: elapsed, 
        total: this.totalTime 
      });
    }, 1000);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    
    event.emit('timer-stopped');
  }
  
  showOnConfidence() {
    event.emit('confidence-timer-enable');
  }
  
  hideFromConfidence() {
    event.emit('confidence-timer-disable');
  }
}
```

## Visual Design

- **Position:** Bottom center of the screen, floating above all content
- **Font Size:** 56px, bold
- **Border Radius:** 12px for rounded corners
- **Shadow:** Drop shadow for depth
- **Backdrop Filter:** Blur effect for better readability over content
- **Z-index:** 1000 (floats above main content)

## Notes

- **The timer stays hidden by default** until the `confidence-timer-enable` event is sent from the main window
- Timer data (`timer-started`, `timer-update`, `timer-stopped`) can be sent independently of visibility control
- The timer will not display during lyrics mode, even when enabled, to avoid distraction during worship
- The timer automatically hides when stopped (via `timer-stopped` event)
- The timer display is non-intrusive and doesn't block content
- The color transitions happen smoothly via CSS transitions
- To use the timer, the main window must:
  1. Send `confidence-timer-enable` to make timer visible
  2. Send `timer-started` with duration to initialize timer
  3. Send `timer-update` periodically to update the countdown
  4. Send `timer-stopped` when timer completes
  5. Optionally send `confidence-timer-disable` to hide timer without stopping it
