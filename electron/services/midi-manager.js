let midi;
try {
  midi = require('midi');
} catch (e) {
  // MIDI module is optional and may not be available
  midi = null;
}

let midiOutput = null;
let devices = [];

async function initialize() {
  if (!midi) {
    console.warn('MIDI library not available, MIDI features disabled');
    return [];
  }
  
  try {
    midiOutput = new midi.Output();
    
    // Get available MIDI devices
    const portCount = midiOutput.getPortCount();
    devices = [];
    
    for (let i = 0; i < portCount; i++) {
      devices.push({
        id: i,
        name: midiOutput.getPortName(i)
      });
    }
    
    console.log(`Found ${devices.length} MIDI devices`);
    return devices;
  } catch (error) {
    console.error('Failed to initialize MIDI:', error);
    return [];
  }
}

async function getDevices() {
  if (!midi) {
    return [];
  }
  if (!midiOutput) {
    await initialize();
  }
  return devices;
}

async function sendNote(deviceId, note, velocity, duration) {
  if (!midi) {
    throw new Error('MIDI support not available');
  }
  
  try {
    if (!midiOutput) {
      throw new Error('MIDI not initialized');
    }
    
    // Open the MIDI port if not already open
    if (!midiOutput.isPortOpen()) {
      midiOutput.openPort(deviceId);
    }
    
    // Send note on
    midiOutput.sendMessage([0x90, note, velocity]);
    
    // Send note off after duration
    if (duration > 0) {
      setTimeout(() => {
        midiOutput.sendMessage([0x80, note, 0]);
      }, duration);
    }
    
    return true;
  } catch (error) {
    console.error('Failed to send MIDI note:', error);
    throw error;
  }
}

function close() {
  if (midiOutput) {
    if (midiOutput.isPortOpen()) {
      midiOutput.closePort();
    }
    midiOutput = null;
  }
}

module.exports = {
  initialize,
  getDevices,
  sendNote,
  close
};
