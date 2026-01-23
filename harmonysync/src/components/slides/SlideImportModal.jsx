import React, { useState, useEffect, useRef } from 'react';
import { 
  XMarkIcon, 
  DocumentIcon, 
  DocumentTextIcon, 
  FolderIcon,
  ArchiveBoxIcon,
  ArrowUpTrayIcon 
} from '@heroicons/react/24/outline';

/**
 * SlideImportModal - Modal for importing slides from various sources
 * 
 * Supports:
 * - PDF files
 * - PowerPoint files (.pptx, .ppt)
 * - Folder import (batch)
 * - Zip files (automatic extraction and import)
 */
const SlideImportModal = ({ isOpen, onClose, onSlidesImported }) => {
  const [importType, setImportType] = useState('pdf'); // 'pdf', 'powerpoint', 'folder', 'zip'
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState(null);
  const [error, setError] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const dropZoneRef = useRef(null);
  const [importOptions, setImportOptions] = useState({
    dpi: 150,
    format: 'png',
    deleteZip: true // Auto-delete zip after extraction
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

  // Drag and drop handlers
  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.target === dropZoneRef.current) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;

    const file = files[0];
    const filePath = file.path;
    const ext = filePath.toLowerCase().split('.').pop();

    // Auto-detect file type and set import mode
    if (ext === 'zip') {
      setImportType('zip');
      setSelectedFile(filePath);
      setError(null);
    } else if (ext === 'pdf') {
      setImportType('pdf');
      setSelectedFile(filePath);
      setError(null);
    } else if (ext === 'pptx' || ext === 'ppt') {
      setImportType('powerpoint');
      setSelectedFile(filePath);
      setError(null);
    } else {
      setError(`Unsupported file type: .${ext}. Please drop a .zip, .pdf, .pptx, or .ppt file.`);
    }
  };

  const handleSelectFile = async () => {
    try {
      let filters;
      if (importType === 'pdf') {
        filters = [{ name: 'PDF Files', extensions: ['pdf'] }];
      } else if (importType === 'zip') {
        filters = [{ name: 'Zip Files', extensions: ['zip'] }];
      } else {
        filters = [{ name: 'PowerPoint Files', extensions: ['pptx', 'ppt'] }];
      }

      const filePath = await window.electronAPI.openFile(filters);
      
      if (filePath) {
        setSelectedFile(filePath);
        setError(null);
        
        // Validate the file (skip for zip files)
        if (importType !== 'zip') {
          const validation = await window.electronAPI.validateSlideFile(filePath);
          if (!validation.valid) {
            setError(validation.message);
            setSelectedFile(null);
          }
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
      let result;

      if (importType === 'folder' && selectedFolder) {
        slides = await window.electronAPI.importSlidesFromFolder(selectedFolder, importOptions);
      } else if (importType === 'pdf' && selectedFile) {
        slides = await window.electronAPI.importPdfSlides(selectedFile, importOptions);
      } else if (importType === 'powerpoint' && selectedFile) {
        slides = await window.electronAPI.importPowerpointSlides(selectedFile, importOptions);
      } else if (importType === 'zip' && selectedFile) {
        result = await window.electronAPI.importSlidesFromZip(selectedFile, importOptions);
        slides = result.slides || [];
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
            <div className="grid grid-cols-4 gap-3">
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
                  setImportType('zip');
                  setSelectedFile(null);
                  setSelectedFolder(null);
                  setError(null);
                }}
                className={`p-4 rounded-lg border-2 transition-all ${
                  importType === 'zip'
                    ? 'border-accent bg-accent bg-opacity-10'
                    : 'border-border hover:border-accent'
                }`}
                disabled={isImporting}
              >
                <ArchiveBoxIcon className="w-8 h-8 mx-auto mb-2 text-accent" />
                <div className="text-sm font-medium text-primary">Zip File</div>
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

          {/* Drag and Drop Zone for Zip Files */}
          {importType === 'zip' && (
            <div
              ref={dropZoneRef}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-all ${
                isDragging
                  ? 'border-accent bg-accent bg-opacity-10'
                  : 'border-border hover:border-accent'
              }`}
            >
              <ArchiveBoxIcon className="w-16 h-16 mx-auto mb-4 text-muted" />
              <p className="text-sm text-primary mb-2">
                {isDragging ? 'Drop zip file here' : 'Drag and drop a zip file here'}
              </p>
              <p className="text-xs text-muted">
                or click Browse button below
              </p>
            </div>
          )}

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

          {/* Zip Import Note */}
          {importType === 'zip' && (
            <div className="bg-green-500 bg-opacity-10 border border-green-500 rounded-lg p-4">
              <p className="text-sm text-green-400">
                <strong>Automatic Setup:</strong> The zip file will be automatically extracted and all compatible slides (PDF, PowerPoint) will be imported. The zip file can be deleted after extraction.
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
