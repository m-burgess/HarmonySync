/**
 * @name Send MIDI Sequence
 * @description Send a sequence of MIDI notes
 * @author HarmonySync Team
 * @version 1.0.0
 * @enabled true
 */

// Send a sequence of MIDI notes
async function main() {
  console.log("Sending MIDI sequence...");
  
  const notes = [60, 62, 64, 65, 67]; // C, D, E, F, G
  
  for (const note of notes) {
    await harmony.midi.sendNote(note, 100, 200);
    await harmony.utils.wait(300); // Wait 300ms between notes
    console.log(`Sent MIDI note: ${note}`);
  }
  
  console.log("MIDI sequence complete!");
}

main();
