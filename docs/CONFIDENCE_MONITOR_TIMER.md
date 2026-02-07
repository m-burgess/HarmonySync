# Confidence Monitor Timer Feature

## Overview

The Confidence Monitor now includes a dynamic timer component that displays at the bottom of the screen when a timer is active. The timer changes color based on how much time has elapsed to provide visual feedback to presenters.

## Timer Events

The confidence monitor listens for the following events to control the timer display:

### `timer-started`

Emitted when a timer is started from the main screen.

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

### `timer-update`

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

### `timer-stopped`

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

Here's an example of how to implement a timer in the main application:

```typescript
class TimerService {
  private intervalId: NodeJS.Timeout | null = null;
  private startTime: number = 0;
  private totalTime: number = 0;

  start(durationInSeconds: number) {
    this.totalTime = durationInSeconds;
    this.startTime = Date.now();
    
    // Notify confidence monitor
    event.emit('timer-started', { total: this.totalTime });
    
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

- The timer only appears when active (when `timer.active` is true)
- The timer automatically hides when stopped
- The timer display is non-intrusive and doesn't block content
- The color transitions happen smoothly via CSS transitions
