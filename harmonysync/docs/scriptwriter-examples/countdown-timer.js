/**
 * @name Countdown Timer
 * @description Display a countdown timer on slides
 * @author HarmonySync Team
 * @version 1.0.0
 * @enabled true
 */

// Countdown timer example
async function main() {
  console.log("Starting countdown...");
  
  for (let i = 5; i > 0; i--) {
    await harmony.display.showSlide({
      text: `${i}`,
      background: i <= 3 ? "#ff6b6b" : "#1a1a2e",
      fontSize: "120px",
      textAlign: "center"
    });
    
    console.log(`Countdown: ${i}`);
    await harmony.utils.wait(1000); // Wait 1 second
  }
  
  await harmony.display.showSlide({
    text: "GO!",
    background: "#4caf50",
    fontSize: "120px",
    textAlign: "center"
  });
  
  console.log("Countdown complete!");
}

main();
