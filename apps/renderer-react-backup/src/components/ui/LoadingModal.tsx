import React from 'react';
import Modal from './Modal.tsx';
import '../../styles/LoadingModal.css';

interface LoadingModalProps {
  progress: number;
  message: string;
}

const LoadingModal: React.FC<LoadingModalProps> = ({ progress, message }) => {
  const isLoading = progress > 0 && progress < 100;

  return (
    <Modal
      isOpen={isLoading}
      closeOnOverlayClick={false}
      closeOnEscape={false}
      showCloseButton={false}
      title="Loading..."
      size="small"
    >
      <div className="loading-modal-content">
        <p className="loading-message">{message}</p>
        <div className="loading-progress-container">
          <div className="loading-progress-bar">
            <div 
              className="loading-progress-fill" 
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="loading-percentage">{progress}%</span>
        </div>
      </div>
    </Modal>
  );
};

export default LoadingModal;