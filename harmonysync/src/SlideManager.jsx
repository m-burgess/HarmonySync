import React, { useState, useEffect, useRef } from 'react';
import SlideItem from './SlideItem.jsx';
import * as TauriEvent from '@tauri-apps/api/event';

const SlideManager = ({ allSlides, setAllSlides, selectedSlide, setSelectedSlide }) => {
  const [thumbnailSize, setThumbnailSize] = useState(700); // Initial size for thumbnails
  const selectedSlideIndex = allSlides.findIndex(slide => slide === selectedSlide);
  const dragItem = useRef(null);
  const dragOverItem = useRef(null);
  const slideColRef = useRef(null);

  // New function to update the slide after transcoding
  const handleVideoTranscoded = (index, transcodedPath) => {
    setAllSlides(prevSlides => {
      const newSlides = [...prevSlides];
      if (newSlides[index]) {
        newSlides[index] = { ...newSlides[index], path: transcodedPath };
      }
      return newSlides;
    });
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        if (allSlides.length === 0) return;

        let newIndex = selectedSlideIndex;

        if (selectedSlideIndex === -1) {
          newIndex = 0; // Select first slide if none is selected
        } else if (e.key === 'ArrowDown') {
          newIndex = (selectedSlideIndex + 1) % allSlides.length;
        } else if (e.key === 'ArrowUp') {
          newIndex = (selectedSlideIndex - 1 + allSlides.length) % allSlides.length;
        }

        setSelectedSlide(allSlides[newIndex]);
        // Programmatically click the slide to trigger its event emission
        const selectedSlideElement = slideColRef.current.querySelector(`[data-slide-index='${newIndex}']`);
        if (selectedSlideElement) {
          selectedSlideElement.click();
          selectedSlideElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [allSlides, selectedSlide, setSelectedSlide]);

  const handleSlideClick = (index) => {
    setSelectedSlide(allSlides[index]);

    // Emit the new, more detailed event for the confidence monitor
    const currentSlide = allSlides[index];
    const nextSlide = allSlides[index + 1] || null;

    const payload = {
      current: currentSlide,
      next: nextSlide
    };
    console.log('Emitting display-confidence-slide with payload:', payload);
    TauriEvent.emit('display-confidence-slide', payload);
  };

  const handleDragStart = (e, position) => {
    dragItem.current = position;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', position);
  };

  const handleDragEnter = (e, position) => {
    e.preventDefault();
    dragOverItem.current = position;
  };

  const handleDrop = (e, position) => {
    e.preventDefault();
    const copyListItems = [...allSlides];
    const dragItemContent = copyListItems[dragItem.current];
    copyListItems.splice(dragItem.current, 1);
    copyListItems.splice(position, 0, dragItemContent);
    dragItem.current = null;
    dragOverItem.current = null;
    setAllSlides(copyListItems);
  };

  const handleDragEnd = () => {
    dragItem.current = null;
    dragOverItem.current = null;
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  return (
    <div className="col" id="slide-col" ref={slideColRef} onDragOver={handleDragOver}>
      <div className="thumbnail-size-control">
        <label htmlFor="thumbnail-size-slider">Thumbnail Size:</label>
        <input
          type="range"
          id="thumbnail-size-slider"
          min="50"
          max="700"
          value={thumbnailSize}
          onChange={(e) => setThumbnailSize(parseInt(e.target.value))}
        />
        <span>{thumbnailSize}px</span>
      </div>
      {allSlides.map((slide, index) => (
        <SlideItem
          key={index} // Using index as key for now, consider unique ID if available
          slide={slide}
          index={index}
          isSelected={slide === selectedSlide}
          onSelect={handleSlideClick}
          onDragStart={handleDragStart}
          onDragEnter={handleDragEnter}
          onDrop={handleDrop}
          onDragEnd={handleDragEnd}
          thumbnailSize={thumbnailSize}
          onVideoTranscoded={handleVideoTranscoded} // Pass the new prop
        />
      ))}
    </div>
  );
};

export default SlideManager;