import React, { useState, useEffect } from 'react';
import { 
  XMarkIcon, 
  DocumentIcon, 
  DocumentTextIcon, 
  FolderIcon,
  ArrowUpTrayIcon 
} from '@heroicons/react/24/outline';

/**
 * SlideImportModal - Modal for importing slides from various sources
 * 
 * Supports:
 * - PDF files
 * - PowerPoint files (.pptx, .ppt)
 * - Folder import (batch)
 */
const SlideImportModal = ({ isOpen, onClose, onSlidesImported }) => {
  const [importType, setImportType] = useState('pdf'); // 'pdf', 'powerpoint', 'folder'
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState(null);
  const [error, setError] = useState(null);
  const [importOptions, setImportOptions] = useState({
    dpi: 150,
    format: 'png'
  });

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedFile(null);
      setSelectedFolder(null);
      setIsImporting(false);
      setProgress(null);
      setError(null);
    }
  }, [isOpen]);

  // Listen for import progress updates
  useEffect(() => {
    if (!window.electronAPI || !window.electronAPI.onSlidesImportProgress) {
      console.warn('Electron API not available for slide import progress');
      return;
    }

    const unsubscribe = window.electronAPI.onSlidesImportProgress((data) => {
      setProgress(data);
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const handleSelectFile = async () => {
    try {
      const filters = importType === 'pdf' 
        ? [{ name: 'PDF Files', extensions: ['pdf'] }]
        : [{ name: 'PowerPoint Files', extensions: ['pptx', 'ppt'] }];

      const filePath = await window.electronAPI.openFile(filters);
      
      if (filePath) {
        setSelectedFile(filePath);
        setError(null);
        
        // Validate the file
        const validation = await window.electronAPI.validateSlideFile(filePath);
        if (!validation.valid) {
          setError(validation.message);
          setSelectedFile(null);
        }
      }
    } catch (err) {
      setError(`Failed to select file: ${err.message}`);
    }
  };

  const handleSelectFolder = async () => {
    try {
      const folders = await window.electronAPI.openDirectory({ multiple: false });
      
      if (folders && folders.length > 0) {
        setSelectedFolder(folders[0]);
        setError(null);
      }
    } catch (err) {
      setError(`Failed to select folder: ${err.message}`);
    }
  };

  const handleImport = async () => {
    // Check if Electron API is available
    if (!window.electronAPI) {
      setError('Electron API not available. Please ensure you are running in the Electron environment.');
      return;
    }

    setIsImporting(true);
    setError(null);
    setProgress(null);

    try {
      let slides = [];

      if (importType === 'folder' && selectedFolder) {
        slides = await window.electronAPI.importSlidesFromFolder(selectedFolder, importOptions);
      } else if (importType === 'pdf' && selectedFile) {
        slides = await window.electronAPI.importPdfSlides(selectedFile, importOptions);
      } else if (importType === 'powerpoint' && selectedFile) {
        slides = await window.electronAPI.importPowerpointSlides(selectedFile, importOptions);
      } else {
        throw new Error('No file or folder selected');
      }

      if (slides && slides.length > 0) {
        onSlidesImported(slides);
        onClose();
      } else {
        setError('No slides were imported. Please check the file or folder.');
      }
    } catch (err) {
      setError(`Import failed: ${err.message}`);
    } finally {
      setIsImporting(false);
      setProgress(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-surface rounded-lg shadow-xl w-full max-w-2xl mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-xl font-semibold text-primary">Import Slides</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-hover rounded-md transition-colors"
            disabled={isImporting}
          >
            <XMarkIcon className="w-5 h-5 text-muted" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Import Type Selection */}
          <div>
            <label className="block text-sm font-medium text-primary mb-3">
              Import Source
            </label>
            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={() => {
                  setImportType('pdf');
                  setSelectedFile(null);
                  setSelectedFolder(null);
                  setError(null);
                }}
                className={`p-4 rounded-lg border-2 transition-all ${
                  importType === 'pdf'
                    ? 'border-accent bg-accent bg-opacity-10'
                    : 'border-border hover:border-accent'
                }`}
                disabled={isImporting}
              >
                <DocumentIcon className="w-8 h-8 mx-auto mb-2 text-accent" />
                <div className="text-sm font-medium text-primary">PDF</div>
              </button>

              <button
                onClick={() => {
                  setImportType('powerpoint');
                  setSelectedFile(null);
                  setSelectedFolder(null);
                  setError(null);
                }}
                className={`p-4 rounded-lg border-2 transition-all ${
                  importType === 'powerpoint'
                    ? 'border-accent bg-accent bg-opacity-10'
                    : 'border-border hover:border-accent'
                }`}
                disabled={isImporting}
              >
                <DocumentTextIcon className="w-8 h-8 mx-auto mb-2 text-accent" />
                <div className="text-sm font-medium text-primary">PowerPoint</div>
              </button>

              <button
                onClick={() => {
                  setImportType('folder');
                  setSelectedFile(null);
                  setSelectedFolder(null);
                  setError(null);
                }}
                className={`p-4 rounded-lg border-2 transition-all ${
                  importType === 'folder'
                    ? 'border-accent bg-accent bg-opacity-10'
                    : 'border-border hover:border-accent'
                }`}
                disabled={isImporting}
              >
                <FolderIcon className="w-8 h-8 mx-auto mb-2 text-accent" />
                <div className="text-sm font-medium text-primary">Folder</div>
              </button>
            </div>
          </div>

          {/* File/Folder Selection */}
          <div>
            <label className="block text-sm font-medium text-primary mb-2">
              {importType === 'folder' ? 'Select Folder' : 'Select File'}
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={selectedFile || selectedFolder || ''}
                readOnly
                placeholder={`No ${importType === 'folder' ? 'folder' : 'file'} selected`}
                className="flex-1 px-3 py-2 bg-background border border-border rounded-md text-primary placeholder-muted"
              />
              <button
                onClick={importType === 'folder' ? handleSelectFolder : handleSelectFile}
                className="px-4 py-2 bg-accent text-white rounded-md hover:bg-accent-dark transition-colors"
                disabled={isImporting}
              >
                Browse
              </button>
            </div>
          </div>

          {/* Import Options */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-primary mb-2">
                Resolution (DPI)
              </label>
              <select
                value={importOptions.dpi}
                onChange={(e) => setImportOptions({ ...importOptions, dpi: parseInt(e.target.value) })}
                className="w-full px-3 py-2 bg-background border border-border rounded-md text-primary"
                disabled={isImporting}
              >
                <option value={96}>96 (Low)</option>
                <option value={150}>150 (Medium)</option>
                <option value={200}>200 (High)</option>
                <option value={300}>300 (Very High)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-primary mb-2">
                Image Format
              </label>
              <select
                value={importOptions.format}
                onChange={(e) => setImportOptions({ ...importOptions, format: e.target.value })}
                className="w-full px-3 py-2 bg-background border border-border rounded-md text-primary"
                disabled={isImporting}
              >
                <option value="png">PNG (Better Quality)</option>
                <option value="jpeg">JPEG (Smaller Size)</option>
              </select>
            </div>
          </div>

          {/* Progress */}
          {progress && (
            <div className="bg-background rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-primary">
                  {progress.message || 'Importing slides...'}
                </span>
                {progress.current && progress.total && (
                  <span className="text-sm text-muted">
                    {progress.current} / {progress.total}
                  </span>
                )}
              </div>
              {progress.current && progress.total && (
                <div className="w-full bg-border rounded-full h-2">
                  <div
                    className="bg-accent h-2 rounded-full transition-all"
                    style={{ width: `${(progress.current / progress.total) * 100}%` }}
                  />
                </div>
              )}
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-red-500 bg-opacity-10 border border-red-500 rounded-lg p-4">
              <p className="text-sm text-red-500">{error}</p>
            </div>
          )}

          {/* LibreOffice Note for PowerPoint */}
          {importType === 'powerpoint' && (
            <div className="bg-blue-500 bg-opacity-10 border border-blue-500 rounded-lg p-4">
              <p className="text-sm text-blue-400">
                <strong>Note:</strong> PowerPoint import requires LibreOffice to be installed on your system.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t border-border">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-border rounded-md hover:bg-hover transition-colors text-primary"
            disabled={isImporting}
          >
            Cancel
          </button>
          <button
            onClick={handleImport}
            className="px-4 py-2 bg-accent text-white rounded-md hover:bg-accent-dark transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isImporting || (!selectedFile && !selectedFolder)}
          >
            {isImporting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                Importing...
              </>
            ) : (
              <>
                <ArrowUpTrayIcon className="w-5 h-5" />
                Import Slides
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SlideImportModal;
