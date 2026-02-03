/**
 * Service Order Settings Component
 * 
 * This component allows users to configure service order import settings:
 * - Watch folder path
 * - Auto-import on startup
 * - Clear imported services
 * 
 * Usage:
 * - Add to Settings page
 * - Persists settings to ~/.harmonysync/app-settings.json
 * - Allows manual scan of watch folder
 */

import React, { useState, useEffect } from 'react';

// ==================== Types ====================

interface ServiceOrderSettings {
  watchFolder: string;
  autoImportOnStartup: boolean;
  cleanupOldServices: boolean;
  maxServiceAge: number; // days
}

interface ServiceOrderMetadata {
  id: string;
  name: string;
  path: string;
  items: any[];
  extractedAt: Date;
}

// ==================== Component ====================

export const ServiceOrderSettingsPanel: React.FC = () => {
  const [settings, setSettings] = useState<ServiceOrderSettings>({
    watchFolder: '',
    autoImportOnStartup: true,
    cleanupOldServices: true,
    maxServiceAge: 7,
  });
  const [importedServices, setImportedServices] = useState<ServiceOrderMetadata[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Load settings on mount
  useEffect(() => {
    loadSettings();
    loadImportedServices();
  }, []);

  /**
   * Load settings from storage
   */
  const loadSettings = async () => {
    try {
      // In real implementation, load from persistent storage
      // For now, using localStorage as example
      const saved = localStorage.getItem('serviceOrderSettings');
      if (saved) {
        setSettings(JSON.parse(saved));
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  /**
   * Save settings to storage
   */
  const saveSettings = async (newSettings: ServiceOrderSettings) => {
    try {
      setSettings(newSettings);
      // In real implementation, save via Electron API
      localStorage.setItem('serviceOrderSettings', JSON.stringify(newSettings));
      showMessage('success', 'Settings saved successfully');
    } catch (error) {
      console.error('Failed to save settings:', error);
      showMessage('error', 'Failed to save settings');
    }
  };

  /**
   * Load imported services
   */
  const loadImportedServices = async () => {
    try {
      const result = await window.electronAPI.serviceOrderListImported();
      if (result.success) {
        setImportedServices(result.services);
      }
    } catch (error) {
      console.error('Failed to load imported services:', error);
    }
  };

  /**
   * Browse for watch folder
   */
  const handleBrowseFolder = async () => {
    try {
      const paths = await window.electronAPI.openDirectory({ multiple: false });
      if (paths && paths.length > 0) {
        saveSettings({ ...settings, watchFolder: paths[0] });
      }
    } catch (error) {
      console.error('Failed to select folder:', error);
    }
  };

  /**
   * Manual scan for service orders
   */
  const handleScanNow = async () => {
    if (!settings.watchFolder) {
      showMessage('error', 'Please set a watch folder first');
      return;
    }

    try {
      setLoading(true);
      const result = await window.electronAPI.serviceOrderScanForZips(settings.watchFolder);

      if (result.success && result.zips.length > 0) {
        showMessage('success', `Found ${result.zips.length} service order(s)`);
        // In real implementation, show import dialog
        console.log('Found zips:', result.zips);
      } else {
        showMessage('success', 'No service orders found in watch folder');
      }
    } catch (error) {
      console.error('Failed to scan folder:', error);
      showMessage('error', 'Failed to scan folder');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Clear all imported services
   */
  const handleClearImported = async () => {
    if (!window.confirm('Are you sure you want to delete all imported service orders?')) {
      return;
    }

    try {
      setLoading(true);
      for (const service of importedServices) {
        await window.electronAPI.serviceOrderDeleteService(service.id);
      }
      await loadImportedServices();
      showMessage('success', 'All imported services cleared');
    } catch (error) {
      console.error('Failed to clear services:', error);
      showMessage('error', 'Failed to clear services');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Delete a specific service
   */
  const handleDeleteService = async (serviceId: string) => {
    try {
      setLoading(true);
      const result = await window.electronAPI.serviceOrderDeleteService(serviceId);
      if (result.success) {
        await loadImportedServices();
        showMessage('success', 'Service deleted');
      } else {
        showMessage('error', result.error || 'Failed to delete service');
      }
    } catch (error) {
      console.error('Failed to delete service:', error);
      showMessage('error', 'Failed to delete service');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Cleanup old services
   */
  const handleCleanupOld = async () => {
    try {
      setLoading(true);
      const result = await window.electronAPI.serviceOrderCleanup(settings.maxServiceAge);
      if (result.success) {
        await loadImportedServices();
        showMessage('success', `Cleaned up ${result.deleted} old service order(s)`);
      } else {
        showMessage('error', result.error || 'Failed to cleanup');
      }
    } catch (error) {
      console.error('Failed to cleanup:', error);
      showMessage('error', 'Failed to cleanup old services');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Show temporary message
   */
  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  return (
    <div className="service-order-settings">
      <h2>Service Order Import Settings</h2>

      {/* Message Banner */}
      {message && (
        <div className={`message ${message.type}`}>
          {message.type === 'success' ? '✓' : '✕'} {message.text}
        </div>
      )}

      {/* Watch Folder Setting */}
      <div className="setting-section">
        <h3>Watch Folder</h3>
        <p className="setting-description">
          The folder to monitor for zipped service orders.
        </p>
        <div className="folder-input">
          <input
            type="text"
            value={settings.watchFolder}
            onChange={(e) => saveSettings({ ...settings, watchFolder: e.target.value })}
            placeholder="/path/to/watch/folder"
            className="folder-path"
          />
          <button onClick={handleBrowseFolder} className="browse-button">
            Browse
          </button>
        </div>
        <button
          onClick={handleScanNow}
          disabled={loading || !settings.watchFolder}
          className="scan-button"
        >
          {loading ? 'Scanning...' : 'Scan Now'}
        </button>
      </div>

      {/* Auto-Import Setting */}
      <div className="setting-section">
        <h3>Auto-Import</h3>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={settings.autoImportOnStartup}
            onChange={(e) =>
              saveSettings({ ...settings, autoImportOnStartup: e.target.checked })
            }
          />
          <span>Automatically check for service orders on app startup</span>
        </label>
        <p className="setting-note">
          When enabled, the app will scan the watch folder when it starts and prompt you to import
          any found service orders.
        </p>
      </div>

      {/* Cleanup Settings */}
      <div className="setting-section">
        <h3>Cleanup</h3>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={settings.cleanupOldServices}
            onChange={(e) =>
              saveSettings({ ...settings, cleanupOldServices: e.target.checked })
            }
          />
          <span>Automatically cleanup old service orders</span>
        </label>
        <div className="cleanup-age">
          <label>
            Delete services older than:
            <input
              type="number"
              value={settings.maxServiceAge}
              onChange={(e) =>
                saveSettings({ ...settings, maxServiceAge: parseInt(e.target.value, 10) })
              }
              min={1}
              max={365}
              className="age-input"
            />
            days
          </label>
        </div>
        <button onClick={handleCleanupOld} disabled={loading} className="cleanup-button">
          {loading ? 'Cleaning...' : 'Cleanup Old Services Now'}
        </button>
      </div>

      {/* Imported Services List */}
      <div className="setting-section">
        <h3>Imported Service Orders ({importedServices.length})</h3>
        {importedServices.length === 0 ? (
          <p className="no-services">No imported service orders</p>
        ) : (
          <>
            <div className="services-list">
              {importedServices.map((service) => (
                <div key={service.id} className="service-item">
                  <div className="service-info">
                    <div className="service-name">{service.name}</div>
                    <div className="service-meta">
                      {service.items.length} items • Imported:{' '}
                      {new Date(service.extractedAt).toLocaleDateString()}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteService(service.id)}
                    disabled={loading}
                    className="delete-button"
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
            <button
              onClick={handleClearImported}
              disabled={loading}
              className="clear-all-button"
            >
              {loading ? 'Clearing...' : 'Clear All Imported Services'}
            </button>
          </>
        )}
      </div>

      {/* Styles */}
      <style jsx>{`
        .service-order-settings {
          max-width: 800px;
          padding: 24px;
        }

        h2 {
          margin: 0 0 24px 0;
          color: #333;
          font-size: 1.75rem;
        }

        h3 {
          margin: 0 0 12px 0;
          color: #333;
          font-size: 1.125rem;
        }

        .message {
          padding: 12px 16px;
          border-radius: 4px;
          margin-bottom: 20px;
          font-weight: 500;
        }

        .message.success {
          background: #d4edda;
          color: #155724;
          border: 1px solid #c3e6cb;
        }

        .message.error {
          background: #f8d7da;
          color: #721c24;
          border: 1px solid #f5c6cb;
        }

        .setting-section {
          margin-bottom: 32px;
          padding: 20px;
          background: #f9f9f9;
          border-radius: 8px;
          border: 1px solid #e0e0e0;
        }

        .setting-description {
          margin: 0 0 12px 0;
          color: #666;
          font-size: 0.875rem;
        }

        .setting-note {
          margin: 8px 0 0 24px;
          color: #666;
          font-size: 0.875rem;
          font-style: italic;
        }

        .folder-input {
          display: flex;
          gap: 8px;
          margin-bottom: 12px;
        }

        .folder-path {
          flex: 1;
          padding: 8px 12px;
          border: 1px solid #ccc;
          border-radius: 4px;
          font-size: 0.875rem;
        }

        .browse-button,
        .scan-button,
        .cleanup-button,
        .delete-button,
        .clear-all-button {
          padding: 8px 16px;
          border-radius: 4px;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          border: none;
          transition: background-color 0.2s;
        }

        .browse-button {
          background: #007bff;
          color: white;
        }

        .browse-button:hover {
          background: #0056b3;
        }

        .scan-button {
          background: #28a745;
          color: white;
        }

        .scan-button:hover:not(:disabled) {
          background: #1e7e34;
        }

        .cleanup-button {
          background: #ffc107;
          color: #333;
        }

        .cleanup-button:hover:not(:disabled) {
          background: #e0a800;
        }

        .clear-all-button {
          background: #dc3545;
          color: white;
          margin-top: 12px;
        }

        .clear-all-button:hover:not(:disabled) {
          background: #c82333;
        }

        button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .checkbox-label {
          display: flex;
          align-items: center;
          cursor: pointer;
          font-size: 0.875rem;
        }

        .checkbox-label input[type='checkbox'] {
          margin-right: 8px;
          width: 18px;
          height: 18px;
          cursor: pointer;
        }

        .cleanup-age {
          margin: 12px 0 12px 24px;
          font-size: 0.875rem;
        }

        .age-input {
          width: 60px;
          margin: 0 8px;
          padding: 4px 8px;
          border: 1px solid #ccc;
          border-radius: 4px;
          text-align: center;
        }

        .no-services {
          color: #666;
          font-style: italic;
          margin: 0;
        }

        .services-list {
          margin: 12px 0;
        }

        .service-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px;
          background: white;
          border: 1px solid #e0e0e0;
          border-radius: 4px;
          margin-bottom: 8px;
        }

        .service-item:last-child {
          margin-bottom: 0;
        }

        .service-info {
          flex: 1;
        }

        .service-name {
          font-weight: 500;
          color: #333;
          margin-bottom: 4px;
        }

        .service-meta {
          font-size: 0.75rem;
          color: #666;
        }

        .delete-button {
          background: #dc3545;
          color: white;
          padding: 6px 12px;
          font-size: 0.75rem;
        }

        .delete-button:hover:not(:disabled) {
          background: #c82333;
        }
      `}</style>
    </div>
  );
};

export default ServiceOrderSettingsPanel;
