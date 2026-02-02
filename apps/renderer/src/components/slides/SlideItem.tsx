import React from 'react';
import Slide from './Slide';
import type { SlideData, SlideSize } from './types';

interface SlideItemProps {
  slide: SlideData;
  index: number;
  selectedSlide?: number | SlideData | null;
  setSelectedSlide?: (index: number) => void;
  isSelected?: boolean; // Legacy prop from SlideManager
  onSelect?: (index: number) => void; // Legacy prop from SlideManager
  onDragStart?: (e: React.DragEvent, position: number) => void;
  onDragEnter?: (e: React.DragEvent, position: number) => void;
  onDrop?: (e: React.DragEvent, position: number) => void;
  onDragEnd?: () => void;
  onVideoTranscoded?: (index: number, transcodedPath: string) => void;
  thumbnailSize?: number; // Size from slider
  size?: SlideSize;
  showActions?: boolean;
}

const SlideItem: React.FC<SlideItemProps> = ({
  slide,
  index,
  selectedSlide,
  setSelectedSlide,
  isSelected, // Legacy prop from SlideManager
  onSelect, // Legacy prop from SlideManager
  onDragStart,
  onDragEnter,
  onDrop,
  onDragEnd,
  onVideoTranscoded,
  thumbnailSize, // Size from slider
  size = 'medium',
  showActions = true
}) => {
  const handleSelect = (slideIndex: number) => {
    // Handle both new and legacy prop patterns
    if (setSelectedSlide && typeof setSelectedSlide === 'function') {
      setSelectedSlide(slideIndex);
    } else if (onSelect && typeof onSelect === 'function') {
      onSelect(slideIndex);
    }
  };

  // Convert thumbnailSize to size variant, or use the size prop
  const getSlideSize = (): SlideSize => {
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
