import React, { useState, useEffect } from 'react';
import { core, fs } from '../../electron-adapter';
import Modal from '../ui/Modal.jsx';
import Button from '../ui/Button.jsx';
import '../../styles/components/SettingsModal.css';

const AudioSettings = ({ isOpen, onClose }) => {
  const [audioOutputDevice, setAudioOutputDevice] = useState('');
  const [midiInputDevice, setMidiInputDevice] = useState('');
  const [midiOutputDevice, setMidiOutputDevice] = useState('');
  const [availableAudioDevices, setAvailableAudioDevices] = useState([]);
  const [availableMidiInputDevices, setAvailableMidiInputDevices] = useState([]);
  const [availableMidiOutputDevices, setAvailableMidiOutputDevices] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadSettings();
      loadAvailableDevices();
    }
  }, [isOpen]);

  const loadSettings = async () => {
    try {
      setIsLoading(true);
      
      // Get settings directory path
      const settingsDir = await core.invoke('settings:getSettingsPath');
      const settingsPath = `${settingsDir}/audio_settings.json`;
      
      try {
        const settingsContent = await fs.readTextFile(settingsPath);
        const settings = JSON.parse(settingsContent);
        
        setAudioOutputDevice(settings.audioOutputDevice || '');
        setMidiInputDevice(settings.midiInputDevice || '');
        setMidiOutputDevice(settings.midiOutputDevice || '');
      } catch (readError) {
        // File doesn't exist yet, use defaults
        console.log('No audio settings file found, using defaults');
      }
    } catch (error) {
      console.error('Error loading audio settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadAvailableDevices = async () => {
    try {
      // Call Electron IPC to get available audio and MIDI devices
      try {
        const audioDevices = await core.invoke('settings:getAudioDevices');
        setAvailableAudioDevices(audioDevices);
      } catch (error) {
        console.error('Error loading audio devices:', error);
        setAvailableAudioDevices([
          { id: 'default', name: 'Default Audio Device' }
        ]);
      }

      // MIDI devices are handled separately if available
      try {
        const midiInputs = [];
        setAvailableMidiInputDevices(midiInputs);
      } catch (error) {
        console.error('Error loading MIDI input devices:', error);
        setAvailableMidiInputDevices([]);
      }

      try {
        const midiOutputs = [];
        setAvailableMidiOutputDevices(midiOutputs);
      } catch (error) {
        console.error('Error loading MIDI output devices:', error);
        setAvailableMidiOutputDevices([]);
      }
    } catch (error) {
      console.error('Error loading available devices:', error);
    }
  };

  const saveSettings = async () => {
    try {
      setIsLoading(true);
      
      // Save all settings to a JSON file
      const settingsDir = await core.invoke('settings:getSettingsPath');
      const settingsPath = `${settingsDir}/audio_settings.json`;
      
      const settings = {
        audioOutputDevice,
        midiInputDevice,
        midiOutputDevice,
      };
      
      await fs.writeTextFile(settingsPath, JSON.stringify(settings, null, 2));
      
      console.log('Audio settings saved successfully');
      onClose();
    } catch (error) {
      console.error('Error saving audio settings:', error);
      alert('Failed to save audio settings. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const footer = (
    <>
      <Button onClick={onClose} variant="secondary">
        Cancel
      </Button>
      <Button onClick={saveSettings} disabled={isLoading} variant="primary">
        {isLoading ? 'Saving...' : 'Save Settings'}
      </Button>
    </>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Audio/MIDI Settings"
      size="medium"
      footer={footer}
      closeOnOverlayClick={true}
      closeOnEscape={true}
    >
      {isLoading ? (
        <div className="settings-loading">Loading...</div>
      ) : (
        <div className="settings-sections">
          <div className="settings-section">
            <h3>Audio Output</h3>
            <div className="setting-row">
              <label htmlFor="audio-output-device">Output Device:</label>
              <select 
                id="audio-output-device"
                value={audioOutputDevice} 
                onChange={(e) => setAudioOutputDevice(e.target.value)}
              >
                <option value="">System Default</option>
                {availableAudioDevices.map(device => (
                  <option key={device.id} value={device.id}>{device.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="settings-section">
            <h3>MIDI Input</h3>
            <div className="setting-row">
              <label htmlFor="midi-input-device">Input Device:</label>
              <select 
                id="midi-input-device"
                value={midiInputDevice} 
                onChange={(e) => setMidiInputDevice(e.target.value)}
              >
                <option value="">None</option>
                {availableMidiInputDevices.map(device => (
                  <option key={device.id} value={device.id}>{device.name}</option>
                ))}
              </select>
            </div>
            {availableMidiInputDevices.length === 0 && (
              <p className="settings-info-text">
                No MIDI input devices detected
              </p>
            )}
          </div>

          <div className="settings-section">
            <h3>MIDI Output</h3>
            <div className="setting-row">
              <label htmlFor="midi-output-device">Output Device:</label>
              <select 
                id="midi-output-device"
                value={midiOutputDevice} 
                onChange={(e) => setMidiOutputDevice(e.target.value)}
              >
                <option value="">None</option>
                {availableMidiOutputDevices.map(device => (
                  <option key={device.id} value={device.id}>{device.name}</option>
                ))}
              </select>
            </div>
            {availableMidiOutputDevices.length === 0 && (
              <p className="settings-info-text">
                No MIDI output devices detected
              </p>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
};

export default AudioSettings;
