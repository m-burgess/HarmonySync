import React, { useState } from 'react';
import { Window } from '@tauri-apps/api/window';
import { emit } from '@tauri-apps/api/event';
import { ComputerDesktopIcon, TvIcon, WindowIcon } from '@heroicons/react/24/solid';
import { Button } from './components/ui';

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
        decorations: false,
        resizable: true,
        maximizable: false,
        minimizable: false,
        closable: true,
        skipTaskbar: false,
        devtools: false,
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
        decorations: false,
        resizable: true,
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
        decorations: false,
        transparent: true,
        alwaysOnTop: true,
        skipTaskbar: true,
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
    <div className="flex gap-2">
      <Button 
        variant="ghost" 
        size="medium"
        onClick={openAudienceScreen} 
        title="Open Audience Screen"
        icon={<ComputerDesktopIcon />}
        className="screen-button"
      >
        Audience
      </Button>
      <Button 
        variant="ghost" 
        size="medium"
        onClick={openConfidenceMonitor} 
        title="Open Confidence Monitor"
        icon={<TvIcon />}
        className="screen-button"
      >
        Confidence
      </Button>
      <Button 
        variant="ghost" 
        size="medium"
        onClick={openLowerThirds} 
        title="Open Lower Thirds"
        icon={<WindowIcon />}
        className="screen-button"
      >
        Lower Thirds
      </Button>
    </div>
  );
};

export default ScreenButtons;
