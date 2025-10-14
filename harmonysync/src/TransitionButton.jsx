import React from 'react';
import Button from './Button.jsx';
import './styles/components/TransitionButton.css';

const TransitionButton = ({
  type,
  onClick,
  disabled = false,
  loading = false,
  tooltip,
  size = 'small',
  className = ''
}) => {
  const buttonConfig = {
    crossfade: {
      label: 'Crossfade',
      variant: 'success',
      title: 'Smooth crossfade transition'
    },
    cut: {
      label: 'Cut',
      variant: 'warning',
      title: 'Instant cut transition'
    },
    'fadeout-fadein': {
      label: 'Fade',
      variant: 'info',
      title: 'Fade out then fade in'
    },
    fade: {
      label: 'Fade',
      variant: 'info',
      title: 'Fade out then fade in'
    },
    preload: {
      label: 'Preload',
      variant: 'secondary',
      title: 'Preload for instant switching'
    },
    load: {
      label: 'Load',
      variant: 'secondary',
      title: 'Load presentation'
    },
    none: {
      label: 'Load',
      variant: 'secondary',
      title: 'Load without transition'
    }
  };

  const config = buttonConfig[type] || buttonConfig.load;
  const finalTitle = tooltip || config.title;

  return (
    <Button
      variant={config.variant}
      size={size}
      onClick={onClick}
      disabled={disabled}
      loading={loading}
      title={finalTitle}
      className={`transition-button transition-button-${type} ${className}`}
    >
      {config.label}
    </Button>
  );
};

export default TransitionButton;