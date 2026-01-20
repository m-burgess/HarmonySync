/**
 * @name Slide Automation Template
 * @description Template for automated slide progression
 * @author Your Name
 * @version 1.0.0
 * @enabled true
 */

// This template shows how to automate slide presentations
// with timing, transitions, and content display

async function slideAutomation() {
  console.log('Starting slide automation...');
  
  // Slide 1: Welcome
  await harmony.display.showSlide({
    text: "Welcome to the Presentation",
    background: "#1a1a2e",
    fontSize: "48px"
  });
  
  console.log('Showing slide 1');
  await harmony.utils.wait(5000); // Show for 5 seconds
  
  // Slide 2: Main content
  await harmony.display.showSlide({
    text: "Main Content\n\nKey Points:\n• Point 1\n• Point 2\n• Point 3",
    background: "#16213e",
    fontSize: "32px"
  });
  
  console.log('Showing slide 2');
  await harmony.utils.wait(10000); // Show for 10 seconds
  
  // Slide 3: Video
  await harmony.display.showVideo('/path/to/video.mp4');
  
  console.log('Playing video');
  await harmony.utils.wait(30000); // Video duration
  
  // Slide 4: Conclusion
  await harmony.display.showSlide({
    text: "Thank You!",
    background: "#0f3460",
    fontSize: "48px"
  });
  
  console.log('Showing conclusion slide');
  await harmony.utils.wait(5000);
  
  // Clear displays
  await harmony.display.clearAll();
  
  console.log('Slide automation complete');
}

// Run the automation
slideAutomation().catch(error => {
  console.error('Slide automation error:', error);
});
