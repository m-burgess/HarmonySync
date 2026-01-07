const midi = require('midi');

/**
 * MIDI Manager Module
 * Handles MIDI input/output operations
 */

let midiInput = null;
let midiOutput = null;

/**
 * Get available MIDI input devices
 * @returns {Promise<Array>} List of MIDI inputs
 */
async function getInputs() {
  try {
    const input = new midi.Input();
    const portCount = input.getPortCount();
    const inputs = [];

    for (let i = 0; i < portCount; i++) {
      inputs.push({
        id: i,
        name: input.getPortName(i)
      });
    }

    input.closePort();
    
    return {
      success: true,
      inputs: inputs
    };
  } catch (error) {
    console.error('Error getting MIDI inputs:', error);
    return {
      success: true,
      inputs: []
    };
  }
}

/**
 * Get available MIDI output devices
 * @returns {Promise<Array>} List of MIDI outputs
 */
async function getOutputs() {
  try {
    const output = new midi.Output();
    const portCount = output.getPortCount();
    const outputs = [];

    for (let i = 0; i < portCount; i++) {
      outputs.push({
        id: i,
        name: output.getPortName(i)
      });
    }

    output.closePort();
    
    return {
      success: true,
      outputs: outputs
    };
  } catch (error) {
    console.error('Error getting MIDI outputs:', error);
    return {
      success: true,
      outputs: []
    };
  }
}

/**
 * Execute a MIDI macro
 * @param {object} macroData - Macro data
 * @param {string} macroData.type - Macro type ('midi_note' or 'midi_cc')
 * @param {number} macroData.port - MIDI output port
 * @param {number} macroData.channel - MIDI channel (0-15)
 * @param {number} macroData.note - MIDI note number (for note type)
 * @param {number} macroData.velocity - Note velocity (for note type)
 * @param {number} macroData.controller - CC controller number (for CC type)
 * @param {number} macroData.value - CC value (for CC type)
 * @returns {Promise<object>} Execution result
 */
async function executeMacro(macroData) {
  try {
    const { type, port, channel, note, velocity, controller, value } = macroData;

    if (!midiOutput) {
      midiOutput = new midi.Output();
    }

    // Open the specified MIDI port if not already open
    if (!midiOutput.isPortOpen()) {
      midiOutput.openPort(port || 0);
    }

    if (type === 'midi_note') {
      // Send MIDI note on
      midiOutput.sendMessage([0x90 + (channel || 0), note || 60, velocity || 100]);
      
      // Send MIDI note off after 100ms
      setTimeout(() => {
        if (midiOutput && midiOutput.isPortOpen()) {
          midiOutput.sendMessage([0x80 + (channel || 0), note || 60, 0]);
        }
      }, 100);
    } else if (type === 'midi_cc') {
      // Send MIDI control change
      midiOutput.sendMessage([0xB0 + (channel || 0), controller || 0, value || 0]);
    }

    return {
      success: true,
      message: `MIDI ${type} sent successfully`
    };
  } catch (error) {
    console.error('Error executing MIDI macro:', error);
    throw error;
  }
}

/**
 * Close MIDI connections
 */
function cleanup() {
  if (midiInput && midiInput.isPortOpen()) {
    midiInput.closePort();
  }
  if (midiOutput && midiOutput.isPortOpen()) {
    midiOutput.closePort();
  }
}

module.exports = {
  getInputs,
  getOutputs,
  executeMacro,
  cleanup
};
