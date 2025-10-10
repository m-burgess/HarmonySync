import React, { useState } from 'react';
import { Window } from '@tauri-apps/api/window';
import { emit } from '@tauri-apps/api/event';
import { ComputerDesktopIcon, ChartBarIcon, RectangleStackIcon } from '@heroicons/react/24/solid';

const ScreenButtons = () => {
  const [audienceWindow, setAudienceWindow] = useState(null);
  const [confidenceWindow, setConfidenceWindow] = useState(null);
  const [lowerThirdsWindow, setLowerThirdsWindow] = useState(null);

  const openAudienceScreen = async () => {
    let currentAudienceWindow = audienceWindow;
    if (!currentAudienceWindow) {
      currentAudienceWindow = new Window('audience', {
        url: 'audience.html',
        title: 'Audience Screen',
        devtools: true,
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
        devtools: true,
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

  const openLowerThirds = async () => {
    let currentLowerThirdsWindow = lowerThirdsWindow;
    if (!currentLowerThirdsWindow) {
      currentLowerThirdsWindow = new Window('lowerthirds', {
        url: 'lowerthirds.html',
        title: 'Lower Thirds',
        width: 1920,
        height: 1080,
        resizable: false,
        fullscreen: false,
        devtools: true,
      });
      setLowerThirdsWindow(currentLowerThirdsWindow);
    }

    if (await currentLowerThirdsWindow.isVisible()) {
      currentLowerThirdsWindow.hide();
    } else {
      currentLowerThirdsWindow.show();
    }
  };

  return (
    <div className="col" id="preview-col">
      <div className="flex flex-col gap-2">
        <button aria-label="Open Audience Screen" title="Audience" onClick={openAudienceScreen} id="open-audience-screen-button" className="p-2 bg-surface rounded-md">
          <ComputerDesktopIcon className="w-5 h-5 text-primary" />
        </button>
        <button aria-label="Open Confidence Monitor" title="Confidence" onClick={openConfidenceMonitor} id="open-confidence-screen-button" className="p-2 bg-surface rounded-md">
          <ChartBarIcon className="w-5 h-5 text-primary" />
        </button>
        <button aria-label="Open Lower Thirds" title="Lower Thirds" onClick={openLowerThirds} id="open-lower-thirds-button" className="p-2 bg-surface rounded-md">
          <RectangleStackIcon className="w-5 h-5 text-primary" />
        </button>
      </div>
    </div>
  );
};

export default ScreenButtons;
