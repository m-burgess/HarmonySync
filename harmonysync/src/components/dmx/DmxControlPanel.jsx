import React from 'react';

/**
 * DmxControlPanel - Placeholder component for DMX lighting control
 * TODO: Implement full DMX control panel with Electron backend integration
 */
const DmxControlPanel = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 max-w-2xl w-full mx-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-white">DMX Control Panel</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            ✕
          </button>
        </div>
        <div className="text-gray-300">
          <p>DMX lighting control panel - Coming soon!</p>
          <p className="mt-2 text-sm">
            This feature will allow you to control DMX lighting fixtures
            from HarmonySync using MIDI or direct DMX control.
          </p>
        </div>
      </div>
    </div>
  );
};

export default DmxControlPanel;
