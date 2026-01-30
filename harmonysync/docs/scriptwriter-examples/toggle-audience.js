/**
 * @name Toggle Audience Window
 * @description Toggle the audience window visibility
 * @author HarmonySync Team
 * @version 1.0.0
 * @enabled true
 */

// Toggle audience window visibility
async function main() {
  console.log("Toggling audience window...");
  await harmony.window.toggle('audience');
  
  // Check if it's visible
  const isVisible = harmony.window.isVisible('audience');
  console.log(`Audience window is now ${isVisible ? 'visible' : 'hidden'}`);
}

main();
