import React from 'react';
import './styles/components/VolumeSlider.css';

const VolumeSlider = ({
  value = 0.5,
  onChange,
  min = 0,
  max = 1,
  step = 0.01,
  orientation = 'vertical',
  disabled = false,
  label,
  showValue = true,
  className = ''
}) => {
  const handleChange = (e) => {
    if (onChange && !disabled) {
      onChange(parseFloat(e.target.value));
    }
  };

  const displayValue = Math.round(value * 100);

  const sliderClass = [
    'volume-slider',
    `volume-slider-${orientation}`,
    disabled && 'volume-slider-disabled',
    className
  ].filter(Boolean).join(' ');

  return (
    <div className="volume-slider-container">
      {label && <label className="volume-slider-label">{label}</label>}
      <div className="volume-slider-wrapper">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={handleChange}
          disabled={disabled}
          className={sliderClass}
        />
        {showValue && (
          <span className="volume-slider-value">{displayValue}%</span>
        )}
      </div>
    </div>
  );
};

export default VolumeSlider;