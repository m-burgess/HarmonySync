import React, { useState, useEffect } from 'react';
import { core, fs } from '../../electron-adapter';
import Modal from '../ui/Modal.jsx';
import Button from '../ui/Button.jsx';
import '../../styles/components/SettingsModal.css';

const DisplaySettings = ({ isOpen, onClose }) => {
  const [audienceDisplay, setAudienceDisplay] = useState('');
  const [confidenceDisplay, setConfidenceDisplay] = useState('');
  const [lowerThirdsDisplay, setLowerThirdsDisplay] = useState('');
  const [audienceFontSize, setAudienceFontSize] = useState('72');
  const [confidenceFontSize, setConfidenceFontSize] = useState('72');
  const [audienceFontFamily, setAudienceFontFamily] = useState('Arial');
  const [confidenceFontFamily, setConfidenceFontFamily] = useState('Arial');
  const [availableDisplays, setAvailableDisplays] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Font options
  const fontOptions = [
    'Arial',
    'Helvetica',
    'Times New Roman',
    'Georgia',
    'Verdana',
    'Tahoma',
    'Trebuchet MS',
    'Courier New',
    'Lucida Console',
    'Impact',
    'Comic Sans MS',
    'Palatino',
    'Garamond',
    'Bookman',
    'Avant Garde'
  ];

  // Preview font size scaling
  const PREVIEW_SCALE_FACTOR = 3;
  const PREVIEW_MAX_SIZE = 48;

  useEffect(() => {
    if (isOpen) {
      loadSettings();
      loadAvailableDisplays();
    }
  }, [isOpen]);

  const loadSettings = async () => {
    try {
      setIsLoading(true);
      
      // Use Tauri's fs plugin to read settings from a JSON file
      const appDataPath = await TauriPath.appDataDir();
      const settingsPath = await TauriPath.join(appDataPath, 'display_settings.json');
      
      try {
        const settingsContent = await TauriFs.readTextFile(settingsPath);
        const settings = JSON.parse(settingsContent);
        
        setAudienceDisplay(settings.audienceDisplay || '');
        setConfidenceDisplay(settings.confidenceDisplay || '');
        setLowerThirdsDisplay(settings.lowerThirdsDisplay || '');
        setAudienceFontSize(settings.audienceFontSize || '72');
        setConfidenceFontSize(settings.confidenceFontSize || '72');
        setAudienceFontFamily(settings.audienceFontFamily || 'Arial');
        setConfidenceFontFamily(settings.confidenceFontFamily || 'Arial');
      } catch (readError) {
        // File doesn't exist yet, use defaults
        console.log('No settings file found, using defaults');
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadAvailableDisplays = async () => {
    try {
      // Call Rust command to get actual display information
      const displays = await TauriCore.invoke('get_available_displays');
      setAvailableDisplays(displays);
    } catch (error) {
      console.error('Error loading available displays:', error);
      // Fallback to basic display list if command fails
      setAvailableDisplays([
        { id: 'primary', name: 'Primary Display' },
        { id: 'secondary', name: 'Secondary Display' }
      ]);
    }
  };

  const saveSettings = async () => {
    try {
      setIsLoading(true);
      
      // Save all settings to a JSON file
      const appDataPath = await TauriPath.appDataDir();
      const settingsPath = await TauriPath.join(appDataPath, 'display_settings.json');
      
      const settings = {
        audienceDisplay,
        confidenceDisplay,
        lowerThirdsDisplay,
        audienceFontSize,
        confidenceFontSize,
        audienceFontFamily,
        confidenceFontFamily
      };
      
      await TauriFs.writeTextFile(settingsPath, JSON.stringify(settings, null, 2));
      
      // Emit event to update other windows
      await TauriCore.invoke('plugin:event|emit', {
        event: 'font-settings-changed',
        payload: { audienceFontSize, confidenceFontSize, audienceFontFamily, confidenceFontFamily }
      });
      
      onClose();
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Error saving settings: ' + error);
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
        {isLoading ? 'Saving...' : 'Save'}
      </Button>
    </>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Display Settings"
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
            <h3>Display Assignment</h3>
            <div className="setting-row">
              <label htmlFor="audience-display">Audience Screen:</label>
              <select 
                id="audience-display"
                value={audienceDisplay} 
                onChange={(e) => setAudienceDisplay(e.target.value)}
              >
                <option value="">Auto (Default)</option>
                {availableDisplays.map(display => (
                  <option key={display.id} value={display.id}>{display.name}</option>
                ))}
              </select>
            </div>
            
            <div className="setting-row">
              <label htmlFor="confidence-display">Confidence Monitor:</label>
              <select 
                id="confidence-display"
                value={confidenceDisplay} 
                onChange={(e) => setConfidenceDisplay(e.target.value)}
              >
                <option value="">Auto (Default)</option>
                {availableDisplays.map(display => (
                  <option key={display.id} value={display.id}>{display.name}</option>
                ))}
              </select>
            </div>
            
            <div className="setting-row">
              <label htmlFor="lower-thirds-display">Lower Thirds:</label>
              <select 
                id="lower-thirds-display"
                value={lowerThirdsDisplay} 
                onChange={(e) => setLowerThirdsDisplay(e.target.value)}
              >
                <option value="">Auto (Default)</option>
                {availableDisplays.map(display => (
                  <option key={display.id} value={display.id}>{display.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="settings-section">
            <h3>Audience Screen Font</h3>
            <div className="setting-row">
              <label htmlFor="audience-font-family">Font Family:</label>
              <select 
                id="audience-font-family"
                value={audienceFontFamily} 
                onChange={(e) => setAudienceFontFamily(e.target.value)}
              >
                {fontOptions.map(font => (
                  <option key={font} value={font}>{font}</option>
                ))}
              </select>
            </div>
            
            <div className="setting-row">
              <label htmlFor="audience-font-size">Font Size (px):</label>
              <input 
                type="number" 
                id="audience-font-size"
                min="24" 
                max="200" 
                value={audienceFontSize}
                onChange={(e) => setAudienceFontSize(e.target.value)}
              />
            </div>
          </div>

          <div className="settings-section">
            <h3>Confidence Monitor Font</h3>
            <div className="setting-row">
              <label htmlFor="confidence-font-family">Font Family:</label>
              <select 
                id="confidence-font-family"
                value={confidenceFontFamily} 
                onChange={(e) => setConfidenceFontFamily(e.target.value)}
              >
                {fontOptions.map(font => (
                  <option key={font} value={font}>{font}</option>
                ))}
              </select>
            </div>
            
            <div className="setting-row">
              <label htmlFor="confidence-font-size">Font Size (px):</label>
              <input 
                type="number" 
                id="confidence-font-size"
                min="24" 
                max="200" 
                value={confidenceFontSize}
                onChange={(e) => setConfidenceFontSize(e.target.value)}
              />
            </div>
          </div>

          <div className="font-preview">
            <h4>Audience Screen Preview:</h4>
            <div 
              className="preview-text" 
              style={{ 
                fontFamily: audienceFontFamily, 
                fontSize: Math.min(parseInt(audienceFontSize) / PREVIEW_SCALE_FACTOR, PREVIEW_MAX_SIZE) + 'px',
                color: 'white',
                backgroundColor: '#000',
                padding: '10px',
                textAlign: 'center',
                borderRadius: '4px',
                marginBottom: '10px'
              }}
            >
              SAMPLE LYRIC TEXT
            </div>
            
            <h4>Confidence Monitor Preview:</h4>
            <div 
              className="preview-text" 
              style={{ 
                fontFamily: confidenceFontFamily, 
                fontSize: Math.min(parseInt(confidenceFontSize) / PREVIEW_SCALE_FACTOR, PREVIEW_MAX_SIZE) + 'px',
                color: 'white',
                backgroundColor: '#000',
                padding: '10px',
                textAlign: 'center',
                borderRadius: '4px'
              }}
            >
              CURRENT | NEXT
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
};

export default DisplaySettings;