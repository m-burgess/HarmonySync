import React from 'react';
import { Slide } from './components';

const SlideItem = ({
  slide,
  index,
  selectedSlide,
  setSelectedSlide,
  isSelected, // Legacy prop from SlideManager
  onSelect,   // Legacy prop from SlideManager
  onDragStart,
  onDragEnter,
  onDrop,
  onDragEnd,
  onVideoTranscoded,
  thumbnailSize, // Size from slider
  size = 'medium',
  showActions = true
}) => {
  const handleSelect = (slideIndex) => {
    // Handle both new and legacy prop patterns
    if (setSelectedSlide && typeof setSelectedSlide === 'function') {
      setSelectedSlide(slideIndex);
    } else if (onSelect && typeof onSelect === 'function') {
      onSelect(slideIndex);
    }
  };

  // Convert thumbnailSize to size variant, or use the size prop
  const getSlideSize = () => {
    if (thumbnailSize) {
      if (thumbnailSize <= 120) return 'small';
      if (thumbnailSize <= 200) return 'medium';
      return 'large';
    }
    return size;
  };

  // Determine selection state from either prop pattern
  const slideIsSelected = isSelected !== undefined ? isSelected : (selectedSlide === index);

  return (
    <Slide
      slide={slide}
      index={index}
      isSelected={slideIsSelected}
      onSelect={handleSelect}
      onDragStart={onDragStart}
      onDragEnter={onDragEnter}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      onVideoTranscoded={onVideoTranscoded}
      size={getSlideSize()}
      thumbnailSize={thumbnailSize}
      showActions={showActions}
    />
  );
};

export default SlideItem;