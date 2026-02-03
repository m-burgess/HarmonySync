/**
 * Service Order Import Dialog
 * 
 * This component shows a dialog when a service order zip is detected in the watch folder.
 * It displays the service order details and allows the user to import or cancel.
 * 
 * Usage:
 * - Triggered when app detects a zip in the watch folder
 * - Shows service order name and items
 * - Displays validation warnings
 * - Imports on user confirmation
 */

import React, { useState, useEffect } from 'react';

// ==================== Types ====================

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
  zipPath: string;
  onImport: (metadata: ServiceOrderMetadata) => void;
  onCancel: () => void;
}

// ==================== Component ====================

export const ServiceOrderImportDialog: React.FC<ServiceOrderImportDialogProps> = ({
  zipPath,
  onImport,
  onCancel,
}) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [preview, setPreview] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load preview when dialog opens
  useEffect(() => {
    loadPreview();
  }, [zipPath]);

  /**
   * Load service order preview without extracting
   */
  const loadPreview = async () => {
    try {
      setLoading(true);
      setError(null);

      // For now, just show zip filename
      // In full implementation, you could peek into zip without extracting
      const fileName = zipPath.split(/[\\/]/).pop() || zipPath;
      setPreview({
        success: true,
        metadata: {
          id: 'preview',
          name: fileName.replace('.zip', ''),
          path: zipPath,
          items: [],
          extractedAt: new Date(),
        },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load preview');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Import the service order
   */
  const handleImport = async () => {
    try {
      setLoading(true);
      setError(null);

      // Call Electron API to import
      const result = await window.electronAPI.serviceOrderImportZip(zipPath);

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

  /**
   * Get icon for item type
   */
  const getItemIcon = (type: ServiceItem['type']): string => {
    switch (type) {
      case 'song':
        return '🎵';
      case 'presentation':
        return '📊';
      case 'video':
        return '🎬';
      case 'image':
        return '🖼️';
      case 'folder':
      default:
        return '📁';
    }
  };

  return (
    <div className="service-order-import-dialog">
      {/* Overlay */}
      <div className="dialog-overlay" onClick={onCancel} />

      {/* Dialog */}
      <div className="dialog-content">
        {/* Header */}
        <div className="dialog-header">
          <h2>Service Order Found</h2>
          <button className="close-button" onClick={onCancel}>
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="dialog-body">
          {loading && !preview ? (
            <div className="loading">
              <div className="spinner" />
              <p>Loading preview...</p>
            </div>
          ) : error ? (
            <div className="error">
              <p>❌ {error}</p>
            </div>
          ) : preview ? (
            <>
              {/* Service Name */}
              <div className="service-name">
                <h3>{preview.metadata?.name}</h3>
                <p className="service-path">{zipPath}</p>
              </div>

              {/* Validation Warnings */}
              {preview.validation?.warnings && preview.validation.warnings.length > 0 && (
                <div className="warnings">
                  <h4>⚠️ Warnings</h4>
                  <ul>
                    {preview.validation.warnings.map((warning, index) => (
                      <li key={index}>{warning}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Items Preview */}
              {preview.metadata && preview.metadata.items.length > 0 && (
                <div className="items-preview">
                  <h4>Items ({preview.metadata.items.length})</h4>
                  <ul className="items-list">
                    {preview.metadata.items.map((item) => (
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

        {/* Footer */}
        <div className="dialog-footer">
          <button className="cancel-button" onClick={onCancel} disabled={loading}>
            Cancel
          </button>
          <button
            className="import-button"
            onClick={handleImport}
            disabled={loading || !preview?.success}
          >
            {loading ? (
              <>
                <div className="spinner-small" />
                Importing...
              </>
            ) : (
              'Import Service Order'
            )}
          </button>
        </div>
      </div>

      {/* Styles */}
      <style jsx>{`
        .service-order-import-dialog {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .dialog-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.7);
        }

        .dialog-content {
          position: relative;
          background: white;
          border-radius: 8px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
          max-width: 600px;
          width: 90%;
          max-height: 80vh;
          display: flex;
          flex-direction: column;
        }

        .dialog-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px;
          border-bottom: 1px solid #e0e0e0;
        }

        .dialog-header h2 {
          margin: 0;
          font-size: 1.5rem;
          color: #333;
        }

        .close-button {
          background: none;
          border: none;
          font-size: 1.5rem;
          color: #666;
          cursor: pointer;
          padding: 0;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 4px;
        }

        .close-button:hover {
          background: #f0f0f0;
        }

        .dialog-body {
          padding: 20px;
          overflow-y: auto;
          flex: 1;
        }

        .loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 40px;
        }

        .spinner {
          width: 40px;
          height: 40px;
          border: 4px solid #f0f0f0;
          border-top: 4px solid #007bff;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }

        .spinner-small {
          width: 16px;
          height: 16px;
          border: 2px solid #f0f0f0;
          border-top: 2px solid white;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          display: inline-block;
          margin-right: 8px;
        }

        .error {
          padding: 20px;
          background: #fee;
          border-radius: 4px;
          color: #c00;
        }

        .service-name h3 {
          margin: 0 0 8px 0;
          font-size: 1.25rem;
          color: #333;
        }

        .service-path {
          margin: 0;
          font-size: 0.875rem;
          color: #666;
          word-break: break-all;
        }

        .warnings {
          margin-top: 20px;
          padding: 16px;
          background: #fff3cd;
          border-radius: 4px;
          border: 1px solid #ffc107;
        }

        .warnings h4 {
          margin: 0 0 12px 0;
          font-size: 1rem;
          color: #856404;
        }

        .warnings ul {
          margin: 0;
          padding-left: 20px;
        }

        .warnings li {
          margin-bottom: 4px;
          color: #856404;
        }

        .items-preview {
          margin-top: 20px;
        }

        .items-preview h4 {
          margin: 0 0 12px 0;
          font-size: 1rem;
          color: #333;
        }

        .items-list {
          list-style: none;
          padding: 0;
          margin: 0;
        }

        .item {
          display: flex;
          align-items: center;
          padding: 8px;
          border-bottom: 1px solid #f0f0f0;
        }

        .item:last-child {
          border-bottom: none;
        }

        .item-icon {
          font-size: 1.5rem;
          margin-right: 12px;
        }

        .item-name {
          flex: 1;
          font-weight: 500;
          color: #333;
        }

        .item-type {
          font-size: 0.875rem;
          color: #666;
          text-transform: capitalize;
          padding: 4px 8px;
          background: #f0f0f0;
          border-radius: 4px;
        }

        .import-info {
          margin-top: 20px;
          padding: 16px;
          background: #e7f3ff;
          border-radius: 4px;
        }

        .import-info p {
          margin: 0;
          color: #0056b3;
          font-size: 0.875rem;
        }

        .dialog-footer {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          padding: 20px;
          border-top: 1px solid #e0e0e0;
        }

        .cancel-button,
        .import-button {
          padding: 10px 20px;
          border-radius: 4px;
          font-size: 1rem;
          font-weight: 500;
          cursor: pointer;
          transition: background-color 0.2s;
          border: none;
        }

        .cancel-button {
          background: #f0f0f0;
          color: #333;
        }

        .cancel-button:hover:not(:disabled) {
          background: #e0e0e0;
        }

        .import-button {
          background: #007bff;
          color: white;
          display: flex;
          align-items: center;
        }

        .import-button:hover:not(:disabled) {
          background: #0056b3;
        }

        .cancel-button:disabled,
        .import-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
};

export default ServiceOrderImportDialog;
