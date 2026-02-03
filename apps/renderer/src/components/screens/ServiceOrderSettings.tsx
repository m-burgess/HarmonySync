/**
 * Service Order Settings Screen Component
 * 
 * Allows configuration of service order import settings:
 * - Watch folder path
 * - Auto-import on startup
 * - Cleanup settings
 * - View/manage imported services
 */
import React, { useState, useEffect } from 'react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import '../../styles/components/ServiceOrderSettings.css';

interface ServiceOrderSettings {
  watchFolder: string;
  autoImportOnStartup: boolean;
  cleanupOldServices: boolean;
  maxServiceAge: number;
}

interface ServiceOrderMetadata {
  id: string;
  name: string;
  path: string;
  items: any[];
  extractedAt: Date;
}

interface Message {
  type: 'success' | 'error';
  text: string;
}

const ServiceOrderSettings: React.FC = () => {
  const [settings, setSettings] = useState<ServiceOrderSettings>({
    watchFolder: '',
    autoImportOnStartup: false,
    cleanupOldServices: true,
    maxServiceAge: 7,
  });
  const [importedServices, setImportedServices] = useState<ServiceOrderMetadata[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<Message | null>(null);

  useEffect(() => {
    loadSettings();
    loadImportedServices();
  }, []);

  const loadSettings = async () => {
    try {
      const result = await (window as any).electronAPI.settingsGetServiceOrder();
      if (result.success && result.settings) {
        setSettings(result.settings);
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  const saveSettings = async (newSettings: ServiceOrderSettings) => {
    try {
      setSettings(newSettings);
      const result = await (window as any).electronAPI.settingsUpdateServiceOrder(newSettings);
      if (result.success) {
        showMessage('success', 'Settings saved successfully');
      } else {
        showMessage('error', result.error || 'Failed to save settings');
      }
    } catch (error) {
      console.error('Failed to save settings:', error);
      showMessage('error', 'Failed to save settings');
    }
  };

  const loadImportedServices = async () => {
    try {
      const result = await (window as any).electronAPI.serviceOrderListImported();
      if (result.success) {
        setImportedServices(result.services);
      }
    } catch (error) {
      console.error('Failed to load imported services:', error);
    }
  };

  const handleBrowseFolder = async () => {
    try {
      const paths = await (window as any).electronAPI.openDirectory({ multiple: false });
      if (paths && paths.length > 0) {
        saveSettings({ ...settings, watchFolder: paths[0] });
      }
    } catch (error) {
      console.error('Failed to select folder:', error);
    }
  };

  const handleScanNow = async () => {
    if (!settings.watchFolder) {
      showMessage('error', 'Please set a watch folder first');
      return;
    }

    try {
      setLoading(true);
      const result = await (window as any).electronAPI.serviceOrderScanForZips(settings.watchFolder);

      if (result.success && result.zips.length > 0) {
        showMessage('success', `Found ${result.zips.length} service order(s), importing...`);
        console.log('Found zips:', result.zips);
        
        // Import each zip file
        let importedCount = 0;
        let failedCount = 0;
        const errors: string[] = [];
        
        for (const zipPath of result.zips) {
          try {
            console.log('Importing zip:', zipPath);
            const importResult = await (window as any).electronAPI.serviceOrderImportZip(zipPath);
            console.log('Import result:', importResult);
            
            if (importResult.success) {
              importedCount++;
              console.log('✅ Imported:', importResult.metadata.name);
            } else {
              failedCount++;
              const errorMsg = importResult.error || 'Unknown error';
              errors.push(errorMsg);
              console.error('❌ Failed to import:', zipPath, errorMsg);
            }
          } catch (error) {
            failedCount++;
            const errorMsg = error instanceof Error ? error.message : String(error);
            errors.push(errorMsg);
            console.error('❌ Error importing:', zipPath, error);
          }
        }
        
        // Reload imported services list
        await loadImportedServices();
        
        if (failedCount === 0) {
          showMessage('success', `Successfully imported ${importedCount} service order(s)`);
        } else {
          showMessage('error', `Imported ${importedCount}, failed ${failedCount}. Errors: ${errors.join(', ')}`);
        }
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

  const handleClearImported = async () => {
    if (!window.confirm('Are you sure you want to delete all imported service orders?')) {
      return;
    }

    try {
      setLoading(true);
      for (const service of importedServices) {
        await (window as any).electronAPI.serviceOrderDeleteService(service.id);
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

  const handleDeleteService = async (serviceId: string) => {
    try {
      setLoading(true);
      const result = await (window as any).electronAPI.serviceOrderDeleteService(serviceId);
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

  const handleCleanupOld = async () => {
    try {
      setLoading(true);
      const result = await (window as any).electronAPI.serviceOrderCleanup(settings.maxServiceAge);
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

  const handleLoadService = async (serviceId: string) => {
    try {
      setLoading(true);
      const result = await (window as any).electronAPI.serviceOrderLoad(serviceId);
      if (result.success) {
        showMessage('success', `Loaded service order with ${result.itemCount} items`);
        // Refresh after a brief delay to show the message
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } else {
        showMessage('error', result.error || 'Failed to load service');
      }
    } catch (error) {
      console.error('Failed to load service:', error);
      showMessage('error', 'Failed to load service order');
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  return (
    <div className="service-order-settings">
      <h2>Service Order Import Settings</h2>

      {message && (
        <div className={`message ${message.type}`}>
          {message.type === 'success' ? '✓' : '✕'} {message.text}
        </div>
      )}

      <div className="settings-section">
        <h3>Watch Folder</h3>
        <p className="description">The folder to monitor for zipped service orders.</p>
        <div className="folder-input-group">
          <Input
            type="text"
            value={settings.watchFolder}
            onChange={(e) => saveSettings({ ...settings, watchFolder: e.target.value })}
            placeholder="/path/to/watch/folder"
          />
          <Button onClick={handleBrowseFolder}>Browse</Button>
        </div>
        <Button onClick={handleScanNow} disabled={loading || !settings.watchFolder}>
          {loading ? 'Scanning...' : 'Scan Now'}
        </Button>
      </div>

      <div className="settings-section">
        <h3>Auto-Import</h3>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={settings.autoImportOnStartup}
            onChange={(e) => saveSettings({ ...settings, autoImportOnStartup: e.target.checked })}
          />
          <span>Automatically check for service orders on app startup</span>
        </label>
        <p className="note">
          When enabled, the app will scan the watch folder when it starts and prompt you to import
          any found service orders.
        </p>
      </div>

      <div className="settings-section">
        <h3>Cleanup</h3>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={settings.cleanupOldServices}
            onChange={(e) => saveSettings({ ...settings, cleanupOldServices: e.target.checked })}
          />
          <span>Automatically cleanup old service orders</span>
        </label>
        <div className="cleanup-age">
          <label>
            Delete services older than:
            <input
              type="number"
              value={settings.maxServiceAge}
              onChange={(e) => saveSettings({ ...settings, maxServiceAge: parseInt(e.target.value, 10) })}
              min={1}
              max={365}
              className="age-input"
            />
            days
          </label>
        </div>
        <Button onClick={handleCleanupOld} disabled={loading} variant="secondary">
          {loading ? 'Cleaning...' : 'Cleanup Old Services Now'}
        </Button>
      </div>

      <div className="settings-section">
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
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <Button
                      onClick={() => handleLoadService(service.id)}
                      disabled={loading}
                      variant="primary"
                      size="small"
                    >
                      Load
                    </Button>
                    <Button
                      onClick={() => handleDeleteService(service.id)}
                      disabled={loading}
                      variant="secondary"
                      size="small"
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            <Button onClick={handleClearImported} disabled={loading} variant="secondary">
              {loading ? 'Clearing...' : 'Clear All Imported Services'}
            </Button>
          </>
        )}
      </div>
    </div>
  );
};

export default ServiceOrderSettings;
