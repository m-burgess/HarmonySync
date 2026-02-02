/**
 * @name Display Effects Template
 * @description Template for visual effects and transitions
 * @author Your Name
 * @version 1.0.0
 * @enabled true
 */

// This template shows how to create visual effects
// Useful for enhancing presentations with animations

async function displayEffects() {
  console.log('Starting display effects...');
  
  // Effect 1: Flashing text alert
  for (let i = 0; i < 3; i++) {
    await harmony.display.showSlide({
      text: "ALERT!",
      background: "#ff0000",
      fontSize: "64px"
    });
    await harmony.utils.wait(500);
    
    await harmony.display.blackScreen();
    await harmony.utils.wait(500);
  }
  
  // Effect 2: Countdown timer
  for (let i = 10; i >= 0; i--) {
    await harmony.display.showSlide({
      text: `${i}`,
      background: "#1a1a2e",
      fontSize: "120px"
    });
    await harmony.utils.wait(1000);
  }
  
  // Effect 3: Animated gradient background
  const gradientCSS = await harmony.text.generateGradient({
    colors: ['#ff6b6b', '#4ecdc4', '#45b7d1'],
    duration: '5s'
  });
  
  await harmony.display.showSlide({
    text: "Animated Background",
    backgroundCSS: gradientCSS,
    fontSize: "48px"
  });
  
  await harmony.utils.wait(10000);
  
  // Effect 4: Lower thirds animation
  const messages = [
    "Welcome to the show",
    "Thank you for joining us",
    "Visit our website"
  ];
  
  for (const message of messages) {
    await harmony.display.updateLowerThirds(message);
    await harmony.utils.wait(5000);
  }
  
  // Clear displays
  await harmony.display.clearAll();
  
  console.log('Display effects complete');
}

// Run the display effects
displayEffects().catch(error => {
  console.error('Display effects error:', error);
});
