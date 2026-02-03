/**
 * MIDI Manager Service
 * Handles MIDI device management and messaging
 * Note: MIDI support is optional and gracefully degrades if not available
 */

import { BaseElectronService } from '@harmonysync/core';

// ==================== Type Definitions ====================

interface MIDIOutput {
  getPortCount(): number;
  getPortName(port: number): string;
  openPort(port: number): void;
  closePort(): void;
  isPortOpen(): boolean;
  sendMessage(message: number[]): void;
}

interface MIDIModule {
  Output: new () => MIDIOutput;
}

interface MIDIDeviceInfo {
  id: number;
  name: string;
}

// ==================== MIDI Manager Class ====================

/**
 * MIDIManager - Manages MIDI devices and messaging
 * Extends BaseElectronService for consistent service behavior
 * 
 * Note: This service handles the optional MIDI dependency gracefully.
 * If the MIDI module is not installed, the service will still initialize
 * but will log warnings when MIDI operations are attempted.
 */
export class MIDIManager extends BaseElectronService {
  protected readonly serviceName = 'MIDIManager';
  
  private midi: MIDIModule | null = null;
  private midiOutput: MIDIOutput | null = null;
  private devices: MIDIDeviceInfo[] = [];
  private midiAvailable: boolean = false;

  /**
   * Initialize the MIDI manager
   * Attempts to load the MIDI module and detect devices
   */
  protected override async onInitialize(): Promise<void> {
    // Try to load the MIDI module (optional dependency)
    try {
      // Dynamic import to handle optional dependency
      this.midi = require('midi') as MIDIModule;
      this.midiAvailable = true;
      this.log('info', 'MIDI module loaded successfully');
      
      // Attempt to detect devices
      await this.detectDevices();
    } catch (error) {
      this.midi = null;
      this.midiAvailable = false;
      this.log('warn', 'MIDI library not available, MIDI features disabled');
      this.log('warn', 'To enable MIDI support, install the "midi" package: npm install midi');
    }
  }

  /**
   * Clean up MIDI resources
   */
  protected override onDispose(): void {
    this.closeConnection();
    this.midiOutput = null;
    this.midi = null;
    this.devices = [];
  }

  // ==================== Private Helper Methods ====================

  /**
   * Detect available MIDI devices
   */
  private async detectDevices(): Promise<void> {
    if (!this.midi) {
      return;
    }
    
    try {
      this.midiOutput = new this.midi.Output();
      
      // Get available MIDI devices
      const portCount = this.midiOutput.getPortCount();
      this.devices = [];
      
      for (let i = 0; i < portCount; i++) {
        this.devices.push({
          id: i,
          name: this.midiOutput.getPortName(i)
        });
      }
      
      this.log('info', `Found ${this.devices.length} MIDI devices`);
      
      // Log each device
      this.devices.forEach(device => {
        this.log('debug', `MIDI Device ${device.id}: ${device.name}`);
      });
    } catch (error) {
      this.log('error', 'Failed to detect MIDI devices:', error);
      throw error;
    }
  }

  /**
   * Close the current MIDI connection
   */
  private closeConnection(): void {
    if (this.midiOutput && this.midiOutput.isPortOpen()) {
      try {
        this.midiOutput.closePort();
        this.log('info', 'MIDI port closed');
      } catch (error) {
        this.log('error', 'Error closing MIDI port:', error);
      }
    }
  }

  /**
   * Ensure MIDI is available
   */
  private ensureMIDIAvailable(): void {
    if (!this.midiAvailable) {
      throw new Error('MIDI support is not available. Install the "midi" package to enable MIDI features.');
    }
  }

  // ==================== Public API Methods ====================

  /**
   * Get list of available MIDI devices
   * @returns Array of MIDI device information
   */
  public async getDevices(): Promise<MIDIDeviceInfo[]> {
    this.ensureInitialized();
    
    if (!this.midiAvailable) {
      this.log('warn', 'MIDI not available');
      return [];
    }
    
    try {
      if (!this.midiOutput) {
        await this.detectDevices();
      }
      return this.devices;
    } catch (error) {
      this.log('error', 'Failed to get MIDI devices:', error);
      return [];
    }
  }

  /**
   * Send a MIDI note
   * @param deviceId - MIDI device ID
   * @param note - MIDI note number (0-127)
   * @param velocity - Note velocity (0-127)
   * @param duration - Note duration in milliseconds (0 = no note off)
   * @returns Success status
   */
  public async sendNote(
    deviceId: number,
    note: number,
    velocity: number,
    duration: number = 100
  ): Promise<boolean> {
    this.ensureInitialized();
    this.ensureMIDIAvailable();

    try {
      // Validate parameters
      if (note < 0 || note > 127) {
        throw new Error('MIDI note must be between 0 and 127');
      }
      
      if (velocity < 0 || velocity > 127) {
        throw new Error('MIDI velocity must be between 0 and 127');
      }
      
      if (!this.midiOutput) {
        throw new Error('MIDI not initialized');
      }
      
      // Open the MIDI port if not already open
      if (!this.midiOutput.isPortOpen()) {
        this.midiOutput.openPort(deviceId);
        this.log('info', `Opened MIDI port ${deviceId}`);
      }
      
      // Send note on (0x90 = Note On on channel 1)
      this.midiOutput.sendMessage([0x90, note, velocity]);
      this.log('debug', `Sent MIDI Note On: note=${note}, velocity=${velocity}`);
      
      // Send note off after duration
      if (duration > 0) {
        setTimeout(() => {
          if (this.midiOutput) {
            // 0x80 = Note Off on channel 1
            this.midiOutput.sendMessage([0x80, note, 0]);
            this.log('debug', `Sent MIDI Note Off: note=${note}`);
          }
        }, duration);
      }
      
      return true;
    } catch (error) {
      return this.handleError('sendNote', error);
    }
  }

  /**
   * Send a MIDI control change (CC) message
   * @param deviceId - MIDI device ID
   * @param controller - Controller number (0-127)
   * @param value - Controller value (0-127)
   * @returns Success status
   */
  public async sendCC(
    deviceId: number,
    controller: number,
    value: number
  ): Promise<boolean> {
    this.ensureInitialized();
    this.ensureMIDIAvailable();

    try {
      // Validate parameters
      if (controller < 0 || controller > 127) {
        throw new Error('MIDI controller must be between 0 and 127');
      }
      
      if (value < 0 || value > 127) {
        throw new Error('MIDI value must be between 0 and 127');
      }
      
      if (!this.midiOutput) {
        throw new Error('MIDI not initialized');
      }
      
      // Open the MIDI port if not already open
      if (!this.midiOutput.isPortOpen()) {
        this.midiOutput.openPort(deviceId);
        this.log('info', `Opened MIDI port ${deviceId}`);
      }
      
      // Send CC message (0xB0 = Control Change on channel 1)
      this.midiOutput.sendMessage([0xB0, controller, value]);
      this.log('debug', `Sent MIDI CC: controller=${controller}, value=${value}`);
      
      return true;
    } catch (error) {
      return this.handleError('sendCC', error);
    }
  }

  /**
   * Send a raw MIDI message
   * @param deviceId - MIDI device ID
   * @param message - Raw MIDI message bytes
   * @returns Success status
   */
  public async sendRawMessage(
    deviceId: number,
    message: number[]
  ): Promise<boolean> {
    this.ensureInitialized();
    this.ensureMIDIAvailable();

    try {
      if (!this.midiOutput) {
        throw new Error('MIDI not initialized');
      }
      
      // Validate message
      if (!Array.isArray(message) || message.length === 0) {
        throw new Error('Invalid MIDI message');
      }
      
      // Validate all bytes are in valid range
      for (const byte of message) {
        if (byte < 0 || byte > 255) {
          throw new Error('MIDI message bytes must be between 0 and 255');
        }
      }
      
      // Open the MIDI port if not already open
      if (!this.midiOutput.isPortOpen()) {
        this.midiOutput.openPort(deviceId);
        this.log('info', `Opened MIDI port ${deviceId}`);
      }
      
      // Send raw message
      this.midiOutput.sendMessage(message);
      this.log('debug', `Sent raw MIDI message: [${message.join(', ')}]`);
      
      return true;
    } catch (error) {
      return this.handleError('sendRawMessage', error);
    }
  }

  /**
   * Close MIDI connection
   */
  public close(): void {
    this.closeConnection();
  }

  /**
   * Check if MIDI is available
   * @returns True if MIDI module is loaded and available
   */
  public isMIDIAvailable(): boolean {
    return this.midiAvailable;
  }

  /**
   * Check if a MIDI port is currently open
   * @returns True if a MIDI port is open
   */
  public isPortOpen(): boolean {
    return this.midiOutput ? this.midiOutput.isPortOpen() : false;
  }
}

// ==================== Default Export ====================

/**
 * Create and export a singleton instance
 */
let midiManagerInstance: MIDIManager | null = null;

export function getMIDIManager(): MIDIManager {
  if (!midiManagerInstance) {
    midiManagerInstance = new MIDIManager();
  }
  return midiManagerInstance;
}

export default MIDIManager;
