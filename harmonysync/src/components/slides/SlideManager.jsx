import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowPathIcon } from '@heroicons/react/24/solid';
import SlideItem from './SlideItem.jsx';
import ScreenButtons from '../screens/ScreenButtons.jsx';
import * as TauriEvent from '@tauri-apps/api/event';
import { FixedSizeGrid as Grid } from 'react-window';

const SlideManager = ({ allSlides, setAllSlides, selectedSlide, setSelectedSlide }) => {
  const [thumbnailSize, setThumbnailSize] = useState(220); // Initial reasonable thumbnail size
  const [columns, setColumns] = useState(4);
  const [gridHeight, setGridHeight] = useState(400);
  const gridRef = useRef(null);
  const [gridKey, setGridKey] = useState(0);
  const selectedSlideIndex = allSlides.findIndex(slide => slide === selectedSlide);
  const dragItem = useRef(null);
  const dragOverItem = useRef(null);
  const slideColRef = useRef(null);
  const gridContainerRef = useRef(null);

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

  // Calculate grid height based on available space
  const updateGridHeight = useCallback(() => {
    if (gridContainerRef.current) {
      const containerHeight = gridContainerRef.current.clientHeight;
      setGridHeight(Math.max(200, containerHeight));
    }
  }, []);

  useEffect(() => {
    updateGridHeight();
    window.addEventListener('resize', updateGridHeight);
    return () => window.removeEventListener('resize', updateGridHeight);
  }, [updateGridHeight]);

  useEffect(() => {
    // Update grid height when thumbnail size changes
    updateGridHeight();
  }, [thumbnailSize, updateGridHeight]);

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

  // Recalculate columns on resize
  useEffect(() => {
    let ro;
    const handleResize = () => {
      const width = slideColRef.current ? slideColRef.current.clientWidth : 800;
      const col = Math.max(2, Math.floor(width / (thumbnailSize + 16))); // 16 is gap
      setColumns(col);
      // FixedSizeGrid doesn't expose resetAfterIndices; force a re-render via key
      setGridKey(k => k + 1);
    };
    handleResize();
    if (window.ResizeObserver && slideColRef.current) {
      ro = new ResizeObserver(handleResize);
      ro.observe(slideColRef.current);
    } else {
      window.addEventListener('resize', handleResize);
    }

    return () => {
      if (ro && slideColRef.current) ro.unobserve(slideColRef.current);
      else window.removeEventListener('resize', handleResize);
    };
  }, [thumbnailSize]);

  // Center selected slide in the grid viewport
  useEffect(() => {
    if (!gridRef.current || selectedSlide == null) return;
    const index = allSlides.findIndex(s => s === selectedSlide);
    if (index === -1) return;
    const row = Math.floor(index / columns);
    const col = index % columns;
    const rowHeight = thumbnailSize + 24; // estimate including padding
    const colWidth = thumbnailSize + 16;
    gridRef.current.scrollTo({ scrollLeft: Math.max(0, col * colWidth - (gridRef.current.props.width / 2) + (colWidth / 2)), scrollTop: Math.max(0, row * rowHeight - (gridRef.current.props.height / 2) + (rowHeight / 2)) });
  }, [selectedSlide, columns, thumbnailSize, allSlides]);

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
    <div className="pl-3 pt-3 pb-3 h-full flex flex-col" id="slide-col" ref={slideColRef} onDragOver={handleDragOver}>
      {/* Screen Controls */}
      <div className="flex items-center justify-between mb-3 pr-3">
        <h2 className="text-sm font-semibold text-primary">Slides</h2>
        <ScreenButtons />
      </div>
      
      <div className="flex items-center gap-4 mb-3 pr-3">
        <label htmlFor="thumbnail-size-slider" className="text-sm text-muted">Thumbnail Size</label>
        <input
          aria-label="Thumbnail Size"
          type="range"
          id="thumbnail-size-slider"
          min="80"
          max="520"
          value={thumbnailSize}
          onChange={(e) => setThumbnailSize(parseInt(e.target.value))}
          className="w-48"
        />
        <div className="text-sm text-muted">{thumbnailSize}px</div>
        <button aria-label="Reset thumbnail size" title="Reset" className="ml-auto p-2 bg-surface rounded-md" onClick={() => setThumbnailSize(220)}>
          <ArrowPathIcon className="w-4 h-4 text-muted" />
        </button>
      </div>

      <div className="flex-1 -mr-3" ref={gridContainerRef} style={{ height: '100%' }}>
        <Grid
          key={gridKey}
          ref={gridRef}
          columnCount={columns}
          columnWidth={thumbnailSize + 8}
          height={gridHeight}
          rowCount={Math.ceil(allSlides.length / columns)}
          rowHeight={Math.round(thumbnailSize * 0.56) + 12}
          width={slideColRef.current ? slideColRef.current.clientWidth : 800}
          itemData={{ allSlides, columns, thumbnailSize, selectedSlide, handleSlideClick, handleDragStart, handleDragEnter, handleDrop, handleDragEnd, handleVideoTranscoded }}
        >
          {({ columnIndex, rowIndex, style, data }) => {
            const index = rowIndex * data.columns + columnIndex;
            if (index >= data.allSlides.length) return null;
            const slide = data.allSlides[index];
            return (
              <div style={style} className="p-1">
                <SlideItem
                  slide={slide}
                  index={index}
                  isSelected={slide === data.selectedSlide}
                  onSelect={data.handleSlideClick}
                  onDragStart={data.handleDragStart}
                  onDragEnter={data.handleDragEnter}
                  onDrop={data.handleDrop}
                  onDragEnd={data.handleDragEnd}
                  thumbnailSize={data.thumbnailSize}
                  onVideoTranscoded={data.handleVideoTranscoded}
                />
              </div>
            );
          }}
        </Grid>
      </div>
    </div>
  );
};

export default SlideManager;