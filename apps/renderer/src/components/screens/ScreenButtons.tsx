import { useState } from 'react';
import { core, event } from '../../electron-adapter';
import { ComputerDesktopIcon, TvIcon, WindowIcon } from '@heroicons/react/24/solid';
import Button from '../ui/Button.jsx';
import { ActivityBarIcon } from '../VSCodeUI.tsx';

interface ScreenButtonsProps {
  variant?: 'inline' | 'activity';
}

const ScreenButtons: React.FC<ScreenButtonsProps> = ({ variant = 'inline' }) => {
  const [_audienceWindow, _setAudienceWindow] = useState(null);
  const [_confidenceWindow, _setConfidenceWindow] = useState(null);
  const [_lowerThirdsWindow, _setLowerThirdsWindow] = useState(null);

  const openAudienceScreen = async () => {
    try {
      await core.invoke('show_audience_window');
    } catch (error) {
      console.error('Failed to open audience window:', error);
    }
  };

  const openConfidenceMonitor = async () => {
    try {
      await core.invoke('show_confidence_window');
      // Emit a default empty slide to show the clock initially
      event.emit('display-confidence-slide', { current: null, next: null });
    } catch (error) {
      console.error('Failed to open confidence window:', error);
    }
  };

  const openLowerThirds = async () => {
    try {
      await core.invoke('show_lower_thirds_window');
    } catch (error) {
      console.error('Failed to open lower thirds window:', error);
    }
  };

  if (variant === 'activity') {
    return (
      <div className="flex flex-col gap-2 items-center">
        <ActivityBarIcon
          icon={<ComputerDesktopIcon className="w-6 h-6" />}
          label="Audience"
          onClick={openAudienceScreen}
        />
        <ActivityBarIcon
          icon={<TvIcon className="w-6 h-6" />}
          label="Confidence"
          onClick={openConfidenceMonitor}
        />
        <ActivityBarIcon
          icon={<WindowIcon className="w-6 h-6" />}
          label="Lower Thirds"
          onClick={openLowerThirds}
        />
      </div>
    );
  }

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
