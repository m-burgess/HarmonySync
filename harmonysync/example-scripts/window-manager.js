/**
 * @name Window Manager
 * @description Show/hide all windows in sequence
 * @author HarmonySync Team
 * @version 1.0.0
 * @enabled true
 */

// Demonstrate window management
async function main() {
  console.log("Window management demo...");
  
  // Show audience window
  console.log("Showing audience window...");
  await harmony.window.show('audience');
  await harmony.utils.wait(2000);
  
  // Show confidence window
  console.log("Showing confidence window...");
  await harmony.window.show('confidence');
  await harmony.utils.wait(2000);
  
  // Show lower thirds
  console.log("Showing lower thirds...");
  await harmony.window.show('lowerThirds');
  await harmony.utils.wait(2000);
  
  // Hide all
  console.log("Hiding all windows...");
  await harmony.window.hide('audience');
  await harmony.window.hide('confidence');
  await harmony.window.hide('lowerThirds');
  
  console.log("Window demo complete!");
}

main();
