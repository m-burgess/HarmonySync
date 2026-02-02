/**
 * @name MIDI Controller Template
 * @description Template for MIDI note and CC control
 * @author Your Name
 * @version 1.0.0
 * @enabled true
 */

// This template shows how to send MIDI notes and control changes
// Useful for controlling lighting, effects, or external gear

async function midiControl() {
  console.log('Starting MIDI control sequence...');
  
  // Send a MIDI note (note number, velocity, channel, duration)
  await harmony.midi.sendNote(60, 127, 1); // Middle C at full velocity
  
  console.log('Sent MIDI note 60');
  
  // Wait a bit
  await harmony.utils.wait(1000);
  
  // Send another note
  await harmony.midi.sendNote(64, 100, 1); // E at medium velocity
  
  console.log('Sent MIDI note 64');
  
  // Send a control change (CC number, value, channel)
  await harmony.midi.sendCC(7, 127, 1); // Volume to max
  
  console.log('Sent MIDI CC 7 (volume)');
  
  // Example: Sequence of notes for a pattern
  const notes = [60, 62, 64, 65, 67];
  for (const note of notes) {
    await harmony.midi.sendNote(note, 100, 1);
    await harmony.utils.wait(500);
  }
  
  console.log('MIDI sequence complete');
}

// Run the MIDI controller
midiControl().catch(error => {
  console.error('MIDI controller error:', error);
});
