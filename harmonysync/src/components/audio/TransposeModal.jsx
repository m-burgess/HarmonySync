import React from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';

const TransposeModal = ({ isOpen, currentFile, totalFiles, completedFiles, message, onClose }) => {
  if (!isOpen) return null;

  const progress = totalFiles > 0 ? Math.round((completedFiles / totalFiles) * 100) : 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg shadow-xl p-6 w-96 border border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-white">Transposing Audio Files</h2>
          {completedFiles === totalFiles && totalFiles > 0 && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
              aria-label="Close"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          )}
        </div>

        <div className="space-y-4">
          {/* Progress Bar */}
          <div className="w-full bg-gray-700 rounded-full h-4 overflow-hidden">
            <div
              className="bg-blue-500 h-4 transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Progress Text */}
          <div className="text-center text-sm text-gray-300">
            {completedFiles} / {totalFiles} files
            {progress > 0 && ` (${progress}%)`}
          </div>

          {/* Current File */}
          {currentFile && (
            <div className="text-sm text-gray-400 text-center truncate">
              {currentFile}
            </div>
          )}

          {/* Message */}
          {message && (
            <div className="text-sm text-white text-center">
              {message}
            </div>
          )}

          {/* Spinner (only show while processing) */}
          {completedFiles < totalFiles && (
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          )}

          {/* Complete message */}
          {completedFiles === totalFiles && totalFiles > 0 && (
            <div className="text-center">
              <div className="text-green-500 text-lg font-semibold mb-2">✓ Complete!</div>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
              >
                Close
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TransposeModal;
