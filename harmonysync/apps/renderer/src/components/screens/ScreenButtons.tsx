import { useState } from 'react';
import { event } from '../../electron-adapter';
import { ComputerDesktopIcon, TvIcon, WindowIcon } from '@heroicons/react/24/solid';
import Button from '../ui/Button.jsx';

const ScreenButtons = () => {
  const [_audienceWindow, _setAudienceWindow] = useState(null);
  const [_confidenceWindow, _setConfidenceWindow] = useState(null);
  const [_lowerThirdsWindow, _setLowerThirdsWindow] = useState(null);

  const openAudienceScreen = async () => {
    // TODO: Implement window management for Electron
    // In Electron, windows are managed differently through BrowserWindow in main process
    console.warn('Window management needs to be implemented for Electron');
    
    // For now, use IPC to request window creation
    try {
      await event.emit('open-window', { name: 'audience' });
    } catch (error) {
      console.error('Failed to open audience window:', error);
    }
  };

  const openConfidenceMonitor = async () => {
    // TODO: Implement window management for Electron
    console.warn('Window management needs to be implemented for Electron');
    
    try {
      await event.emit('open-window', { name: 'confidence' });
      // Emit a default empty slide to show the clock initially
      event.emit('display-confidence-slide', { current: null, next: null });
    } catch (error) {
      console.error('Failed to open confidence window:', error);
    }
  };

  const openLowerThirds = async () => {
    // TODO: Implement window management for Electron
    console.warn('Window management needs to be implemented for Electron');
    
    try {
      await event.emit('open-window', { name: 'lowerthirds' });
    } catch (error) {
      console.error('Failed to open lower thirds window:', error);
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
