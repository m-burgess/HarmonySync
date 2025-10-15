import React from 'react';
import Button from '../ui/Button.jsx';
import '../../styles/components/PanControl.css';

const PanControl = ({
  value = 0, // -1 (left) to 1 (right), 0 is center
  onChange,
  disabled = false,
  size = 'small',
  className = ''
}) => {
  const handlePanChange = (newValue) => {
    if (onChange && !disabled) {
      onChange(newValue);
    }
  };

  const panButtons = [
    { value: -1, label: 'L', position: 'left' },
    { value: 0, label: 'C', position: 'center' },
    { value: 1, label: 'R', position: 'right' }
  ];

  return (
    <div className={`pan-control ${className}`}>
      <div className="pan-buttons">
        {panButtons.map(({ value: buttonValue, label, position }) => (
          <Button
            key={position}
            size={size}
            variant={value === buttonValue ? 'primary' : 'ghost'}
            onClick={() => handlePanChange(buttonValue)}
            disabled={disabled}
            className={`pan-button pan-${position} ${value === buttonValue ? 'active' : ''}`}
          >
            {label}
          </Button>
        ))}
      </div>
    </div>
  );
};

export default PanControl;