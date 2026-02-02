/**
 * @name Basic Script Template
 * @description A simple template for creating new scripts
 * @author Your Name
 * @version 1.0.0
 * @enabled true
 */

// This is a basic script template to get you started
// Replace this code with your own custom automation

async function main() {
  // Your code here
  console.log('Script is running!');
  
  // Example: Display a message
  await harmony.display.showSlide({
    text: "Hello from my script!",
    background: "#1a1a2e"
  });
  
  // Example: Wait 2 seconds
  await harmony.utils.wait(2000);
  
  // Example: Log the current time
  console.log('Current time:', harmony.utils.now());
}

// Run the main function
main().catch(error => {
  console.error('Script error:', error);
});
