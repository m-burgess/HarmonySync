/**
 * @name Display Black Screen
 * @description Show black screen on all displays
 * @author HarmonySync Team
 * @version 1.0.0
 * @enabled true
 */

// Simple example: Display black screen
async function main() {
  console.log("Showing black screen...");
  await harmony.display.blackScreen();
  console.log("Black screen displayed!");
}

main();
