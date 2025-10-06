import React, { useState } from 'react';
import { Window } from '@tauri-apps/api/window';
import { emit } from '@tauri-apps/api/event';

const ScreenButtons = () => {
  const [audienceWindow, setAudienceWindow] = useState(null);
  const [confidenceWindow, setConfidenceWindow] = useState(null);

  const openAudienceScreen = async () => {
    let currentAudienceWindow = audienceWindow;
    if (!currentAudienceWindow) {
      currentAudienceWindow = new Window('audience', {
        url: 'audience.html',
        title: 'Audience Screen',
      });
      setAudienceWindow(currentAudienceWindow);
    }

    if (await currentAudienceWindow.isVisible()) {
      currentAudienceWindow.hide();
    } else {
      currentAudienceWindow.show();
      // Re-emit background if it exists and window is shown
      // This logic needs to be handled by a global state or context in React
      // For now, we'll assume currentBackgroundCssContent is managed elsewhere or re-emitted on load
      // emit('set-background', currentBackgroundCssContent); // Placeholder
    }
  };

  const openConfidenceMonitor = async () => {
    let currentConfidenceWindow = confidenceWindow;
    if (!currentConfidenceWindow) {
      currentConfidenceWindow = new Window('confidence', {
        url: 'confidence.html',
        title: 'Confidence Monitor',
      });
      setConfidenceWindow(currentConfidenceWindow);
    }

    if (await currentConfidenceWindow.isVisible()) {
      currentConfidenceWindow.hide();
    } else {
      currentConfidenceWindow.show();
      // Emit a default empty slide to show the clock initially
      emit('display-confidence-slide', { current: null, next: null });
    }
  };

  return (
    <div className="col" id="preview-col">
      <button onClick={openAudienceScreen} id="open-audience-screen-button">Open Audience Screen</button>
      <button onClick={openConfidenceMonitor} id="open-confidence-screen-button">Open Confidence Monitor</button>
    </div>
  );
};

export default ScreenButtons;
