import React from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import '../../styles/components/TransposeModal.css';

interface TransposeModalProps {
  isOpen: boolean;
  currentFile: string;
  totalFiles: number;
  completedFiles: number;
  message: string;
  onClose: () => void;
}

const TransposeModal: React.FC<TransposeModalProps> = ({ 
  isOpen, 
  currentFile, 
  totalFiles, 
  completedFiles, 
  message, 
  onClose 
}) => {
  const progress = totalFiles > 0 ? Math.round((completedFiles / totalFiles) * 100) : 0;
  const isComplete = completedFiles === totalFiles && totalFiles > 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={isComplete ? onClose : undefined}
      title="Transposing Audio Files"
      size="small"
      closeOnOverlayClick={false}
      closeOnEscape={isComplete}
      showCloseButton={isComplete}
      footer={null}
    >
      <div className="transpose-modal-content">
        {/* Progress Bar */}
        <div className="transpose-progress-bar-container">
          <div
            className="transpose-progress-bar-fill"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Progress Text */}
        <div className="transpose-progress-text">
          {completedFiles} / {totalFiles} files
          {progress > 0 && ` (${progress}%)`}
        </div>

        {/* Current File */}
        {currentFile && (
          <div className="transpose-current-file">
            {currentFile}
          </div>
        )}

        {/* Message */}
        {message && (
          <div className="transpose-message">
            {message}
          </div>
        )}

        {/* Spinner (only show while processing) */}
        {!isComplete && (
          <div className="transpose-spinner-container">
            <div className="transpose-spinner" />
          </div>
        )}

        {/* Complete message */}
        {isComplete && (
          <div className="transpose-complete">
            <div className="transpose-complete-icon">✓ Complete!</div>
            <Button
              onClick={onClose}
              variant="secondary"
              title="Close modal"
            >
              Close
            </Button>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default TransposeModal;
