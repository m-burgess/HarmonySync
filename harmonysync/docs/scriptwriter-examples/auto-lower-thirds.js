/**
 * @name Auto Lower Thirds
 * @description Automatically cycle through lower thirds messages
 * @author HarmonySync Team
 * @version 1.0.0
 * @enabled true
 */

// Auto-cycling lower thirds
async function main() {
  console.log("Starting auto lower thirds...");
  
  const messages = [
    "Welcome to the service!",
    "Turn off your phone",
    "Offering will be collected",
    "Join us for lunch after!",
    "Visit our website"
  ];
  
  for (const message of messages) {
    await harmony.display.updateLowerThirds(message);
    console.log(`Updated lower thirds: ${message}`);
    await harmony.utils.wait(5000); // Show each message for 5 seconds
  }
  
  // Clear lower thirds
  await harmony.display.updateLowerThirds("");
  console.log("Auto lower thirds complete!");
}

main();
