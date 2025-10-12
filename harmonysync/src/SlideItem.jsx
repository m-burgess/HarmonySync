import React from 'react';
import { Slide } from './components';

const SlideItem = ({
  slide,
  index,
  selectedSlide,
  setSelectedSlide,
  onDragStart,
  onDragEnter,
  onDrop,
  onDragEnd,
  onVideoTranscoded,
  size = 'medium',
  showActions = true
}) => {
  const handleSelect = (slideIndex) => {
    setSelectedSlide(slideIndex);
  };

  const isSelected = selectedSlide === index;

  return (
    <Slide
      slide={slide}
      index={index}
      isSelected={isSelected}
      onSelect={handleSelect}
      onDragStart={onDragStart}
      onDragEnter={onDragEnter}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      onVideoTranscoded={onVideoTranscoded}
      size={size}
      showActions={showActions}
    />
  );
};

export default SlideItem;