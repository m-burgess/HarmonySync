/**
 * @name Event Handler Template
 * @description Template for creating event-driven scripts
 * @author Your Name
 * @version 1.0.0
 * @enabled true
 * @event slideChange
 */

// This script will automatically run when the specified event occurs
// Access event data through the harmony.event object

async function onEvent() {
  // Get event information
  const eventType = harmony.event.type;
  const eventData = harmony.event.data;
  
  console.log(`Event triggered: ${eventType}`, eventData);
  
  // Handle different event types
  if (eventType === 'slideChange') {
    const slideIndex = eventData.slideIndex;
    console.log(`Slide changed to index: ${slideIndex}`);
    
    // Do something based on the slide
    if (slideIndex === 0) {
      // Show audience window on first slide
      await harmony.window.show('audience');
    }
  }
  
  if (eventType === 'videoStart') {
    console.log('Video started:', eventData.videoPath);
    // Optionally dim lights, etc.
  }
  
  if (eventType === 'scheduledEventStart') {
    console.log('Scheduled event started:', eventData.eventName);
    // Execute scheduled actions
  }
}

// Run the event handler
onEvent().catch(error => {
  console.error('Event handler error:', error);
});
