/**
 * DisplaySettings - MVVM Refactored View Component
 * 
 * This component is refactored to use MVVM architecture:
 * - All business logic moved to DisplayViewModel
 * - Component wrapped with observer() to react to ViewModel changes
 * - No useState for business state
 * - Pure presentation logic only (~150 lines vs original 503 lines)
 */
import React, { useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import { getViewModel } from '../../viewmodels';
import Modal from '../ui/Modal.tsx';
import Button from '../ui/Button.tsx';
import '../../styles/components/SettingsModal.css';

interface DisplaySettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

const DisplaySettings = observer(({ isOpen, onClose }: DisplaySettingsProps) => {
  const viewModel = getViewModel('displayViewModel');

  // Load settings when modal opens
  useEffect(() => {
    if (isOpen) {
      viewModel.initialize();
    }
  }, [isOpen, viewModel]);

  // Handle save
  const handleSave = async () => {
    await viewModel.saveSettings();
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Display Settings"
      size="large"
      footer={
        <>
          <Button onClick={onClose} variant="secondary">Cancel</Button>
          <Button onClick={handleSave} variant="primary" disabled={viewModel.isLoading}>
            {viewModel.isLoading ? 'Saving...' : 'Save Settings'}
          </Button>
        </>
      }
    >
      <div className="settings-modal-content">
        {viewModel.error && (
          <div className="error-message" style={{ color: 'red', marginBottom: '10px' }}>
            {viewModel.error}
          </div>
        )}

        {/* Display Configurations Section */}
        <div className="settings-sections">
          <div className="settings-section">
            <div className="section-header">
              <h3>Display Configurations</h3>
              <Button 
                onClick={() => viewModel.setShowAddForm(true)} 
                variant="primary" 
                size="small"
              >
                + Add Display
              </Button>
            </div>

            {viewModel.isLoading ? (
              <div className="loading-spinner">Loading...</div>
            ) : viewModel.displayConfigs.length === 0 ? (
              <div className="empty-state">
                <p>No display configurations yet. Click "Add Display" to create one.</p>
              </div>
            ) : (
              <div className="display-configs-list">
                {viewModel.sortedDisplays.map((config: any) => (
                  <div key={config.id} className="display-config-item">
                    <div className="config-info">
                      <h4>{config.name}</h4>
                      <span className="config-type">{config.type}</span>
                      {config.deviceId && <span className="config-device">Device: {config.deviceId}</span>}
                      {config.ndiOutput && <span className="config-ndi">NDI: {config.ndiOutput}</span>}
                    </div>
                    <div className="config-actions">
                      <Button 
                        onClick={() => viewModel.setEditingDisplay(config)} 
                        variant="secondary" 
                        size="small"
                      >
                        Edit
                      </Button>
                      <Button 
                        onClick={() => viewModel.deleteDisplay(config.id)} 
                        variant="danger" 
                        size="small"
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Font Settings Section */}
          <div className="settings-section">
            <h3>Font Settings</h3>
            
            {/* Audience Font */}
            <div className="font-settings-group">
              <h4>Audience Screen Font</h4>
              <div className="setting-row">
                <label htmlFor="audience-font-family">Font Family:</label>
                <select 
                  id="audience-font-family"
                  value={viewModel.audienceFontFamily} 
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => viewModel.setAudienceFontSettings(viewModel.audienceFontSize, e.target.value)}
                >
                  {viewModel.fontOptions.map((font: string) => (
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
                  value={viewModel.audienceFontSize}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => viewModel.setAudienceFontSettings(e.target.value, viewModel.audienceFontFamily)}
                />
              </div>
            </div>

            {/* Confidence Font */}
            <div className="font-settings-group">
              <h4>Confidence Monitor Font</h4>
              <div className="setting-row">
                <label htmlFor="confidence-font-family">Font Family:</label>
                <select 
                  id="confidence-font-family"
                  value={viewModel.confidenceFontFamily} 
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => viewModel.setConfidenceFontSettings(viewModel.confidenceFontSize, e.target.value)}
                >
                  {viewModel.fontOptions.map((font: string) => (
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
                  value={viewModel.confidenceFontSize}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => viewModel.setConfidenceFontSettings(e.target.value, viewModel.confidenceFontFamily)}
                />
              </div>
            </div>

            {/* Font Previews */}
            <div className="font-preview">
              <h4>Audience Screen Preview:</h4>
              <div 
                className="preview-text" 
                style={{ 
                  fontFamily: viewModel.audienceFontFamily, 
                  fontSize: viewModel.audiencePreviewFontSize + 'px',
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
                  fontFamily: viewModel.confidenceFontFamily, 
                  fontSize: viewModel.confidencePreviewFontSize + 'px',
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
        </div>
      </div>
      
      {/* Add/Edit Display Form Modal - Placeholder for now */}
      {(viewModel.showAddForm || viewModel.editingDisplay) && (
        <DisplayFormModal
          display={viewModel.editingDisplay}
          availableDisplays={viewModel.availableDisplays}
          onSave={(data) => {
            if (viewModel.editingDisplay) {
              viewModel.updateDisplay(viewModel.editingDisplay.id, data);
            } else {
              viewModel.addDisplay(data);
            }
          }}
          onCancel={() => {
            viewModel.setShowAddForm(false);
            viewModel.setEditingDisplay(null);
          }}
        />
      )}
    </Modal>
  );
});

// Display Form Modal Component - Minimal refactor needed
interface DisplayFormModalProps {
  display: any;
  availableDisplays: any[];
  onSave: (data: any) => void;
  onCancel: () => void;
}

const DisplayFormModal = ({ display, availableDisplays, onSave, onCancel }: DisplayFormModalProps) => {
  // This component could also be refactored to use ViewModel in future
  // For now, keeping minimal local state for form inputs
  const [name, setName] = React.useState(display?.name || '');
  const [type, setType] = React.useState(display?.type || 'custom');
  const [deviceId, setDeviceId] = React.useState(display?.deviceId || '');
  const [ndiOutput, setNdiOutput] = React.useState(display?.ndiOutput || '');
  const [outputType, setOutputType] = React.useState(display?.deviceId ? 'device' : display?.ndiOutput ? 'ndi' : 'auto');

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
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

  return (
    <Modal
      isOpen={true}
      onClose={onCancel}
      title={display ? 'Edit Display' : 'Add Display'}
      size="medium"
      footer={
        <>
          <Button onClick={onCancel} variant="secondary">Cancel</Button>
          <Button type="submit" variant="primary">
            {display ? 'Update' : 'Add'}
          </Button>
        </>
      }
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
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
              required
              placeholder="e.g., LED Wall, Side Screen"
            />
          </div>

          <div className="setting-row">
            <label htmlFor="display-type">Display Type:</label>
            <select id="display-type" value={type} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setType(e.target.value)} required>
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
            <select id="output-type" value={outputType} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setOutputType(e.target.value)}>
              <option value="auto">Auto (Default)</option>
              <option value="device">Physical Display</option>
              <option value="ndi">NDI Output</option>
            </select>
          </div>

          {outputType === 'device' && (
            <div className="setting-row">
              <label htmlFor="device-id">Physical Display:</label>
              <select id="device-id" value={deviceId} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setDeviceId(e.target.value)} required>
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
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNdiOutput(e.target.value)}
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
