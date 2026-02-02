/**
 * @name Data Processor Template
 * @description Template for data manipulation and processing
 * @author Your Name
 * @version 1.0.0
 * @enabled true
 */

// This template shows how to process and manipulate data
// Useful for generating reports, parsing files, or data transformation

async function dataProcessing() {
  console.log('Starting data processing...');
  
  // Example: Process lyrics data
  const lyricsText = `
    Verse 1:
    This is the first line
    This is the second line
    
    Chorus:
    This is the chorus line
    Repeating chorus line
    
    Verse 2:
    Another verse line
    Final verse line
  `;
  
  // Format lyrics
  const formatted = await harmony.text.formatLyrics(lyricsText);
  console.log('Formatted lyrics:', formatted);
  
  // Split into slides
  const slides = await harmony.text.splitLyrics(formatted, {
    linesPerSlide: 4,
    splitOnSections: true
  });
  
  console.log(`Created ${slides.length} slides`);
  
  // Display each slide
  for (let i = 0; i < slides.length; i++) {
    console.log(`Slide ${i + 1}:`, slides[i]);
    
    await harmony.display.showSlide({
      text: slides[i],
      background: "#1a1a2e",
      fontSize: "32px"
    });
    
    await harmony.utils.wait(5000);
  }
  
  // Example: Date and time formatting
  const now = harmony.utils.now();
  const formatted Date = harmony.utils.formatDate(now, 'YYYY-MM-DD HH:mm:ss');
  console.log('Current date/time:', formattedDate);
  
  // Example: Generate statistics
  const stats = {
    totalSlides: slides.length,
    processingTime: Date.now() - startTime,
    timestamp: formattedDate
  };
  
  console.log('Processing statistics:', stats);
  
  console.log('Data processing complete');
}

const startTime = Date.now();

// Run the data processor
dataProcessing().catch(error => {
  console.error('Data processor error:', error);
});
