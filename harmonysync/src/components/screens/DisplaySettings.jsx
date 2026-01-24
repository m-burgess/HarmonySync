import React, { useState, useEffect } from 'react';
import { core, fs } from '../../electron-adapter';
import Modal from '../ui/Modal.jsx';
import Button from '../ui/Button.jsx';
import '../../styles/components/SettingsModal.css';

const DisplaySettings = ({ isOpen, onClose }) => {
  const [displayConfigs, setDisplayConfigs] = useState([]);
  const [availableDisplays, setAvailableDisplays] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [editingDisplay, setEditingDisplay] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  
  // Legacy font settings (still stored separately for now)
  const [audienceFontSize, setAudienceFontSize] = useState('72');
  const [confidenceFontSize, setConfidenceFontSize] = useState('72');
  const [audienceFontFamily, setAudienceFontFamily] = useState('Arial');
  const [confidenceFontFamily, setConfidenceFontFamily] = useState('Arial');

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
      loadDisplayConfigs();
      loadLegacySettings();
      loadAvailableDisplays();
    }
  }, [isOpen]);

  const loadDisplayConfigs = async () => {
    try {
      setIsLoading(true);
      const configs = await core.invoke('displayConfig:getAll');
      setDisplayConfigs(configs);
    } catch (error) {
      console.error('Error loading display configs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadLegacySettings = async () => {
    try {
      // Load legacy font settings from display_settings.json
      const settingsDir = await core.invoke('settings:getSettingsPath');
      const settingsPath = `${settingsDir}/display_settings.json`;
      
      try {
        const settingsContent = await fs.readTextFile(settingsPath);
        const settings = JSON.parse(settingsContent);
        
        setAudienceFontSize(settings.audienceFontSize || '72');
        setConfidenceFontSize(settings.confidenceFontSize || '72');
        setAudienceFontFamily(settings.audienceFontFamily || 'Arial');
        setConfidenceFontFamily(settings.confidenceFontFamily || 'Arial');
      } catch (readError) {
        // File doesn't exist yet, use defaults
        console.log('No display settings file found, using defaults');
      }
    } catch (error) {
      console.error('Error loading legacy settings:', error);
    }
  };

  const loadAvailableDisplays = async () => {
    try {
      const displays = await core.invoke('settings:getDisplays');
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
      
      // Save legacy font settings
      const settingsDir = await core.invoke('settings:getSettingsPath');
      const settingsPath = `${settingsDir}/display_settings.json`;
      
      const settings = {
        audienceFontSize,
        confidenceFontSize,
        audienceFontFamily,
        confidenceFontFamily
      };
      
      await fs.writeTextFile(settingsPath, JSON.stringify(settings, null, 2));
      
      onClose();
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Error saving settings: ' + error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddDisplay = async (displayData) => {
    try {
      setIsLoading(true);
      await core.invoke('displayConfig:create', { config: displayData });
      await loadDisplayConfigs();
      setShowAddForm(false);
    } catch (error) {
      console.error('Error adding display:', error);
      alert('Error adding display: ' + error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateDisplay = async (id, updates) => {
    try {
      setIsLoading(true);
      await core.invoke('displayConfig:update', { id, updates });
      await loadDisplayConfigs();
      setEditingDisplay(null);
    } catch (error) {
      console.error('Error updating display:', error);
      alert('Error updating display: ' + error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteDisplay = async (id) => {
    if (!confirm('Are you sure you want to delete this display?')) {
      return;
    }
    
    try {
      setIsLoading(true);
      await core.invoke('displayConfig:delete', { id });
      await loadDisplayConfigs();
    } catch (error) {
      console.error('Error deleting display:', error);
      alert('Error deleting display: ' + error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleEnabled = async (id, enabled) => {
    try {
      await core.invoke('displayConfig:update', { id, updates: { enabled } });
      await loadDisplayConfigs();
    } catch (error) {
      console.error('Error toggling display:', error);
      alert('Error toggling display: ' + error);
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
      size="large"
      footer={footer}
      closeOnOverlayClick={true}
      closeOnEscape={true}
    >
      {isLoading ? (
        <div className="settings-loading">Loading...</div>
      ) : (
        <div className="settings-sections">
          <div className="settings-section">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3>Display Configurations</h3>
              <Button onClick={() => setShowAddForm(true)} variant="primary" style={{ fontSize: '14px', padding: '8px 16px' }}>
                Add Display
              </Button>
            </div>
            
            <div style={{ marginTop: '16px' }}>
              {displayConfigs.length === 0 ? (
                <p style={{ color: '#888', fontStyle: 'italic' }}>No displays configured</p>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #333' }}>
                      <th style={{ textAlign: 'left', padding: '8px' }}>Name</th>
                      <th style={{ textAlign: 'left', padding: '8px' }}>Type</th>
                      <th style={{ textAlign: 'left', padding: '8px' }}>Device/Output</th>
                      <th style={{ textAlign: 'center', padding: '8px' }}>Enabled</th>
                      <th style={{ textAlign: 'right', padding: '8px' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayConfigs.sort((a, b) => a.order - b.order).map(config => (
                      <tr key={config.id} style={{ borderBottom: '1px solid #222' }}>
                        <td style={{ padding: '8px' }}>{config.name}</td>
                        <td style={{ padding: '8px', textTransform: 'capitalize' }}>{config.type}</td>
                        <td style={{ padding: '8px', fontSize: '12px', color: '#888' }}>
                          {config.deviceId ? `Device: ${availableDisplays.find(d => d.id === config.deviceId)?.name || config.deviceId}` : 
                           config.ndiOutput ? `NDI: ${config.ndiOutput}` : 
                           'Auto'}
                        </td>
                        <td style={{ padding: '8px', textAlign: 'center' }}>
                          <input 
                            type="checkbox" 
                            checked={config.enabled}
                            onChange={(e) => handleToggleEnabled(config.id, e.target.checked)}
                          />
                        </td>
                        <td style={{ padding: '8px', textAlign: 'right' }}>
                          <Button 
                            onClick={() => setEditingDisplay(config)} 
                            variant="secondary"
                            style={{ fontSize: '12px', padding: '4px 8px', marginRight: '4px' }}
                          >
                            Edit
                          </Button>
                          <Button 
                            onClick={() => handleDeleteDisplay(config.id)} 
                            variant="secondary"
                            style={{ fontSize: '12px', padding: '4px 8px', backgroundColor: '#c44', color: 'white' }}
                          >
                            Delete
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
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
      
      {/* Add/Edit Display Form Modal */}
      {(showAddForm || editingDisplay) && (
        <DisplayFormModal
          display={editingDisplay}
          availableDisplays={availableDisplays}
          onSave={editingDisplay ? (data) => handleUpdateDisplay(editingDisplay.id, data) : handleAddDisplay}
          onCancel={() => {
            setShowAddForm(false);
            setEditingDisplay(null);
          }}
        />
      )}
    </Modal>
  );
};

// Display Form Modal Component
const DisplayFormModal = ({ display, availableDisplays, onSave, onCancel }) => {
  const [name, setName] = useState(display?.name || '');
  const [type, setType] = useState(display?.type || 'custom');
  const [deviceId, setDeviceId] = useState(display?.deviceId || '');
  const [ndiOutput, setNdiOutput] = useState(display?.ndiOutput || '');
  const [outputType, setOutputType] = useState(display?.deviceId ? 'device' : display?.ndiOutput ? 'ndi' : 'auto');

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const data = {
      name,
      type,
      deviceId: outputType === 'device' ? deviceId : '',
      ndiOutput: outputType === 'ndi' ? ndiOutput : '',
      enabled: true
    };
    
    onSave(data);
  };

  const modalFooter = (
    <>
      <Button onClick={onCancel} variant="secondary">
        Cancel
      </Button>
      <Button onClick={handleSubmit} variant="primary">
        {display ? 'Update' : 'Add'}
      </Button>
    </>
  );

  return (
    <Modal
      isOpen={true}
      onClose={onCancel}
      title={display ? 'Edit Display' : 'Add Display'}
      size="medium"
      footer={modalFooter}
      closeOnOverlayClick={false}
      closeOnEscape={true}
    >
      <form onSubmit={handleSubmit}>
        <div className="settings-sections">
          <div className="setting-row">
            <label htmlFor="display-name">Display Name:</label>
            <input
              type="text"
              id="display-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="e.g., LED Wall, Side Screen"
            />
          </div>

          <div className="setting-row">
            <label htmlFor="display-type">Display Type:</label>
            <select
              id="display-type"
              value={type}
              onChange={(e) => setType(e.target.value)}
              required
            >
              <option value="audience">Audience</option>
              <option value="confidence">Confidence Monitor</option>
              <option value="lower-thirds">Lower Thirds</option>
              <option value="lyrics">Lyrics</option>
              <option value="scripture">Scripture</option>
              <option value="graphics">Graphics</option>
              <option value="custom">Custom</option>
            </select>
          </div>

          <div className="setting-row">
            <label htmlFor="output-type">Output Type:</label>
            <select
              id="output-type"
              value={outputType}
              onChange={(e) => setOutputType(e.target.value)}
            >
              <option value="auto">Auto (Default)</option>
              <option value="device">Physical Display</option>
              <option value="ndi">NDI Output</option>
            </select>
          </div>

          {outputType === 'device' && (
            <div className="setting-row">
              <label htmlFor="device-id">Physical Display:</label>
              <select
                id="device-id"
                value={deviceId}
                onChange={(e) => setDeviceId(e.target.value)}
                required
              >
                <option value="">Select Display...</option>
                {availableDisplays.map(display => (
                  <option key={display.id} value={display.id}>{display.name}</option>
                ))}
              </select>
            </div>
          )}

          {outputType === 'ndi' && (
            <div className="setting-row">
              <label htmlFor="ndi-output">NDI Output Name:</label>
              <input
                type="text"
                id="ndi-output"
                value={ndiOutput}
                onChange={(e) => setNdiOutput(e.target.value)}
                required
                placeholder="e.g., HarmonySync-Output1"
              />
            </div>
          )}
        </div>
      </form>
    </Modal>
  );
};

export default DisplaySettings;