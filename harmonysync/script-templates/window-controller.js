/**
 * @name Window Controller Template
 * @description Template for managing multiple windows
 * @author Your Name
 * @version 1.0.0
 * @enabled true
 */

// This template shows how to control multiple application windows
// Useful for complex presentation setups

async function windowControl() {
  console.log('Starting window control...');
  
  // Show the audience window
  await harmony.window.show('audience');
  console.log('Audience window shown');
  
  // Wait a moment
  await harmony.utils.wait(1000);
  
  // Show the confidence monitor
  await harmony.window.show('confidence');
  console.log('Confidence window shown');
  
  // Wait a moment
  await harmony.utils.wait(1000);
  
  // Show lower thirds
  await harmony.window.show('lowerThirds');
  console.log('Lower thirds window shown');
  
  // Check if audience window is visible
  const isAudienceVisible = await harmony.window.isVisible('audience');
  console.log('Audience visible:', isAudienceVisible);
  
  // Example: Hide all windows after presentation
  await harmony.utils.wait(60000); // Wait 1 minute
  
  await harmony.window.hide('audience');
  await harmony.window.hide('confidence');
  await harmony.window.hide('lowerThirds');
  
  console.log('All windows hidden');
  
  // Example: Toggle window visibility
  await harmony.window.toggle('audience');
  console.log('Audience window toggled');
}

// Run the window controller
windowControl().catch(error => {
  console.error('Window controller error:', error);
});
