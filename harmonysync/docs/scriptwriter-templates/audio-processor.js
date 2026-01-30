/**
 * @name Audio Processor Template
 * @description Template for audio file processing
 * @author Your Name
 * @version 1.0.0
 * @enabled true
 */

// This template shows how to process audio files
// Useful for batch processing or automation

async function audioProcessing() {
  console.log('Starting audio processing...');
  
  const audioFile = '/path/to/audio.mp3';
  
  // Get audio metadata
  const metadata = await harmony.audio.getMetadata(audioFile);
  console.log('Audio metadata:', metadata);
  console.log(`Duration: ${metadata.duration}s`);
  console.log(`Format: ${metadata.format}`);
  console.log(`Channels: ${metadata.channels}`);
  
  // Convert to OGG format
  const outputFile = '/path/to/output.ogg';
  await harmony.audio.convertToOgg(audioFile, outputFile);
  console.log('Audio converted to OGG');
  
  // Transpose audio (shift pitch)
  const transposedFile = '/path/to/transposed.ogg';
  await harmony.audio.transpose(audioFile, transposedFile, {
    semitones: 2, // Shift up 2 semitones
    preserveRhythm: true // Keep rhythm section
  });
  console.log('Audio transposed');
  
  console.log('Audio processing complete');
}

// Run the audio processor
audioProcessing().catch(error => {
  console.error('Audio processor error:', error);
});
