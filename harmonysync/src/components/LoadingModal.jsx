import React from 'react';

const LoadingModal = ({ isOpen, message }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
      <div className="bg-white p-4 rounded shadow">
        <div className="text-sm text-muted">{message || 'Loading...'}</div>
      </div>
    </div>
  );
};

export default LoadingModal;
