/**
 * Service Order Import Dialog Component
 * 
 * Shows when a service order zip is detected, displays preview and allows import
 */
import React, { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import '../../styles/components/ServiceOrderImport.css';

// Types
interface ServiceItem {
  id: string;
  name: string;
  path: string;
  type: 'folder' | 'song' | 'presentation' | 'video' | 'image';
  sortOrder: number;
}

interface ServiceOrderMetadata {
  id: string;
  name: string;
  path: string;
  items: ServiceItem[];
  extractedAt: Date;
}

interface ImportResult {
  success: boolean;
  metadata?: ServiceOrderMetadata;
  validation?: {
    valid: boolean;
    errors: string[];
    warnings: string[];
  };
  error?: string;
}

interface ServiceOrderImportDialogProps {
  zipPath: string | null;
  isOpen: boolean;
  onImport: (metadata: ServiceOrderMetadata) => void;
  onCancel: () => void;
}

const ServiceOrderImportDialog: React.FC<ServiceOrderImportDialogProps> = ({
  zipPath,
  isOpen,
  onImport,
  onCancel,
}) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load preview when dialog opens
  useEffect(() => {
    if (isOpen && zipPath) {
      loadPreview();
    }
  }, [isOpen, zipPath]);

  const loadPreview = () => {
    if (!zipPath) return;
    
    // For now, just show zip filename without extracting
    const fileName = zipPath.split(/[\\/]/).pop() || zipPath;
    setImportResult({
      success: true,
      metadata: {
        id: 'preview',
        name: fileName.replace('.zip', ''),
        path: zipPath,
        items: [],
        extractedAt: new Date(),
      },
    });
  };

  const handleImport = async () => {
    if (!zipPath) return;

    try {
      setLoading(true);
      setError(null);

      const result = await (window as any).electronAPI.serviceOrderImportZip(zipPath);

      if (result.success && result.metadata) {
        onImport(result.metadata);
      } else {
        setError(result.error || 'Import failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setLoading(false);
    }
  };

  const getItemIcon = (type: ServiceItem['type']): string => {
    switch (type) {
      case 'song': return '🎵';
      case 'presentation': return '📊';
      case 'video': return '🎬';
      case 'image': return '🖼️';
      case 'folder':
      default: return '📁';
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onCancel}
      title="Service Order Found"
      size="large"
      footer={
        <>
          <Button onClick={onCancel} variant="secondary" disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleImport} variant="primary" disabled={loading}>
            {loading ? 'Importing...' : 'Import Service Order'}
          </Button>
        </>
      }
    >
      <div className="service-order-import-content">
        {loading && !importResult ? (
          <div className="loading-state">
            <div className="spinner" />
            <p>Loading preview...</p>
          </div>
        ) : error ? (
          <div className="error-state">
            <p>❌ {error}</p>
          </div>
        ) : importResult ? (
          <>
            {/* Service Name */}
            <div className="service-name">
              <h3>{importResult.metadata?.name}</h3>
              <p className="service-path">{zipPath}</p>
            </div>

            {/* Validation Warnings */}
            {importResult.validation?.warnings && importResult.validation.warnings.length > 0 && (
              <div className="warnings">
                <h4>⚠️ Warnings</h4>
                <ul>
                  {importResult.validation.warnings.map((warning, index) => (
                    <li key={index}>{warning}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Items Preview */}
            {importResult.metadata && importResult.metadata.items.length > 0 && (
              <div className="items-preview">
                <h4>Items ({importResult.metadata.items.length})</h4>
                <ul className="items-list">
                  {importResult.metadata.items.map((item) => (
                    <li key={item.id} className="item">
                      <span className="item-icon">{getItemIcon(item.type)}</span>
                      <span className="item-name">{item.name}</span>
                      <span className="item-type">{item.type}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Import Info */}
            <div className="import-info">
              <p>
                This service order will be extracted and made available in your service order list.
              </p>
            </div>
          </>
        ) : null}
      </div>
    </Modal>
  );
};

export default ServiceOrderImportDialog;
