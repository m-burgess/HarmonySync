/**
 * @name Scheduled Task Template
 * @description Template for time-based automation
 * @author Your Name
 * @version 1.0.0
 * @enabled true
 */

// This template shows how to create scheduled tasks
// Useful for running actions at specific times or intervals

async function scheduledTask() {
  console.log('Starting scheduled task...');
  
  // Get today's scheduled events
  const todayEvents = await harmony.scheduler.getTodayEvents();
  console.log(`Found ${todayEvents.length} events today`);
  
  for (const event of todayEvents) {
    console.log(`Event: ${event.name} at ${event.time}`);
  }
  
  // Get upcoming events (next 7 days)
  const upcomingEvents = await harmony.scheduler.getUpcomingEvents(7);
  console.log(`Found ${upcomingEvents.length} upcoming events`);
  
  // Check if it's time for a specific action
  const now = new Date();
  const hours = now.getHours();
  const minutes = now.getMinutes();
  
  if (hours === 9 && minutes === 0) {
    // 9:00 AM - Show welcome screen
    await harmony.display.showSlide({
      text: "Good Morning!",
      background: "#1a1a2e"
    });
    console.log('Morning greeting displayed');
  }
  
  if (hours === 10 && minutes === 30) {
    // 10:30 AM - Play pre-service music
    await harmony.macro.execute('preservice-music');
    console.log('Pre-service music started');
  }
  
  // Example: Recurring task every 5 minutes
  setInterval(async () => {
    console.log('Periodic check:', harmony.utils.now());
    // Do something periodically
  }, 5 * 60 * 1000);
  
  console.log('Scheduled task setup complete');
}

// Run the scheduled task
scheduledTask().catch(error => {
  console.error('Scheduled task error:', error);
});
