/**
 * Settings Modal with Tabs
 * 
 * Container for all settings pages with tab navigation
 */
import React, { useState } from 'react';
import Modal from '../ui/Modal';
import DisplaySettings from '../screens/DisplaySettings';
import ServiceOrderSettings from '../screens/ServiceOrderSettings';
import '../../styles/components/SettingsModal.css';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'display' | 'serviceOrder';
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, initialTab = 'display' }) => {
  const [activeTab, setActiveTab] = useState(initialTab);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Settings"
      size="large"
      className="settings-modal"
    >
      <div className="settings-tabs">
        <button
          className={`settings-tab ${activeTab === 'display' ? 'active' : ''}`}
          onClick={() => setActiveTab('display')}
        >
          Display
        </button>
        <button
          className={`settings-tab ${activeTab === 'serviceOrder' ? 'active' : ''}`}
          onClick={() => setActiveTab('serviceOrder')}
        >
          Service Order Import
        </button>
      </div>

      <div className="settings-content">
        {activeTab === 'display' && (
          <DisplaySettings isOpen={isOpen} onClose={onClose} />
        )}
        {activeTab === 'serviceOrder' && (
          <ServiceOrderSettings />
        )}
      </div>
    </Modal>
  );
};

export default SettingsModal;
