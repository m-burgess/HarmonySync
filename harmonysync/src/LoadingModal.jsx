import React from 'react';
import './styles/LoadingModal.css'; // We'll create this CSS file next

const LoadingModal = ({ progress, message }) => {
  if (progress === 0 || progress === 100) {
    return null; // Don't show modal if not loading or loading is complete
  }

  return (
    <div className="loading-modal-overlay">
      <div className="loading-modal-content">
        <h2>Loading...</h2>
        <p>{message}</p>
        <div className="loading-progress-bar-container">
          <div className="loading-progress-bar" style={{ width: `${progress}%` }}></div>
        </div>
        <span>{progress}%</span>
      </div>
    </div>
  );
};

export default LoadingModal;