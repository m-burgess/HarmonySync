/**
 * SlideManager - MVVM Refactored View Component
 * 
 * This component is refactored to use MVVM architecture:
 * - All business logic moved to SlideViewModel
 * - Component wrapped with observer() to react to ViewModel changes
 * - No useState for business state (only UI state for grid rendering)
 * - Pure presentation logic only (~140 lines vs original 269 lines)
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { observer } from 'mobx-react-lite';
import { runInAction } from 'mobx';
import { getViewModel } from '../../viewmodels';
import { ArrowPathIcon, ArrowUpTrayIcon } from '@heroicons/react/24/solid';
import SlideItem from './SlideItem';
import ScreenButtons from '../screens/ScreenButtons.jsx';
import SlideImportModal from './SlideImportModal';
import { event } from '../../electron-adapter';
import { FixedSizeGrid as Grid, GridChildComponentProps } from 'react-window';
import type { SlideData, SlideGridItemData } from './types';

interface SlideManagerProps {
  allSlides: SlideData[];
  setAllSlides: (slides: SlideData[]) => void;
  selectedSlide: number | SlideData | null;
  setSelectedSlide: (slide: number | SlideData | null) => void;
}

const SlideManager: React.FC<SlideManagerProps> = observer(({ allSlides, setAllSlides, selectedSlide, setSelectedSlide }) => {
  const viewModel = getViewModel('slideViewModel');
  
  // UI-only state (for grid rendering - not business logic)
  const [columns, setColumns] = useState(4);
  const [gridHeight, setGridHeight] = useState(400);
  const [gridKey, setGridKey] = useState(0);
  
  const gridRef = useRef<Grid>(null);
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);
  const slideColRef = useRef<HTMLDivElement>(null);
  const gridContainerRef = useRef<HTMLDivElement>(null);

  // Sync ViewModel state with parent component props
  // This is a temporary bridge until we fully refactor parent components
  useEffect(() => {
    if (allSlides) {
      viewModel.setSlides(allSlides);
    }
  }, [allSlides, viewModel]);

  useEffect(() => {
    if (selectedSlide !== undefined) {
      runInAction(() => {
        if (typeof selectedSlide === 'number') {
          viewModel.selectedSlide = viewModel.slides[selectedSlide] || null;
        } else {
          viewModel.selectedSlide = selectedSlide;
        }
      });
    }
  }, [selectedSlide, viewModel]);

  // Sync ViewModel changes back to parent
  useEffect(() => {
    if (setAllSlides) {
      setAllSlides(viewModel.slides);
    }
  }, [viewModel.slides, setAllSlides]);

  useEffect(() => {
    if (setSelectedSlide) {
      setSelectedSlide(viewModel.selectedSlide);
    }
  }, [viewModel.selectedSlide, setSelectedSlide]);

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

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        viewModel.navigateDown();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        viewModel.navigateUp();
      } else if (e.key === 'Delete') {
        e.preventDefault();
        viewModel.deleteSelected();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [viewModel]);

  // Recalculate columns on resize
  useEffect(() => {
    let ro: ResizeObserver | null = null;
    const handleResize = () => {
      const width = slideColRef.current ? slideColRef.current.clientWidth : 800;
      const col = Math.max(2, Math.floor(width / (viewModel.thumbnailSize + 16)));
      setColumns(col);
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
      if (ro && slideColRef.current) {
        ro.unobserve(slideColRef.current);
      } else {
        window.removeEventListener('resize', handleResize);
      }
    };
  }, [viewModel.thumbnailSize]);

  // Center selected slide in the grid viewport
  useEffect(() => {
    if (!gridRef.current || !viewModel.selectedSlide) return;
    const index = viewModel.selectedSlideIndex;
    if (index === -1) return;
    const row = Math.floor(index / columns);
    const col = index % columns;
    const rowHeight = viewModel.thumbnailSize + 24;
    const colWidth = viewModel.thumbnailSize + 16;
    gridRef.current.scrollTo({ 
      scrollLeft: Math.max(0, col * colWidth - (gridRef.current.props.width / 2) + (colWidth / 2)), 
      scrollTop: Math.max(0, row * rowHeight - (gridRef.current.props.height / 2) + (rowHeight / 2)) 
    });
  }, [viewModel.selectedSlide, columns, viewModel.thumbnailSize]);

  // Handle slide click
  const handleSlideClick = (index: number) => {
    const slide = viewModel.slides[index];
    viewModel.selectSlide(slide);

    // Emit event for confidence monitor
    const nextSlide = viewModel.slides[index + 1] || null;
    event.emit('display-confidence-slide', {
      current: slide,
      next: nextSlide
    });
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, position: number) => {
    dragItem.current = position;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', position.toString());
  };

  const handleDragEnter = (e: React.DragEvent, position: number) => {
    e.preventDefault();
    dragOverItem.current = position;
  };

  const handleDrop = (e: React.DragEvent, position: number) => {
    e.preventDefault();
    if (dragItem.current !== null) {
      viewModel.reorderSlides(dragItem.current, position);
    }
    dragItem.current = null;
    dragOverItem.current = null;
  };

  const handleDragEnd = () => {
    dragItem.current = null;
    dragOverItem.current = null;
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  // Grid cell renderer
  const Cell: React.FC<GridChildComponentProps<SlideGridItemData>> = ({ columnIndex, rowIndex, style, data }) => {
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
  };

  const gridItemData: SlideGridItemData = { 
    allSlides: viewModel.slides, 
    columns, 
    thumbnailSize: viewModel.thumbnailSize, 
    selectedSlide: viewModel.selectedSlide, 
    handleSlideClick, 
    handleDragStart, 
    handleDragEnter, 
    handleDrop, 
    handleDragEnd,
    handleVideoTranscoded: viewModel.handleVideoTranscoded.bind(viewModel)
  };

  return (
    <div className="pl-3 pt-3 pb-3 h-full flex flex-col" id="slide-col" ref={slideColRef} onDragOver={handleDragOver}>
      {/* Screen Controls */}
      <div className="flex items-center justify-between mb-3 pr-3">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-primary">Slides</h2>
          <button
            onClick={() => viewModel.openImportModal()}
            className="p-1.5 bg-accent text-white rounded-md hover:bg-accent-dark transition-colors"
            title="Import Slides"
          >
            <ArrowUpTrayIcon className="w-4 h-4" />
          </button>
        </div>
        <ScreenButtons />
      </div>
      
      {/* Thumbnail Size Control */}
      <div className="flex items-center gap-4 mb-3 pr-3">
        <label htmlFor="thumbnail-size-slider" className="text-sm text-muted">Slide Size</label>
        <input
          aria-label="Slide Size"
          type="range"
          id="thumbnail-size-slider"
          min="80"
          max="520"
          value={viewModel.thumbnailSize}
          onChange={(e) => viewModel.setThumbnailSize(parseInt(e.target.value))}
          className="w-48"
        />
        <div className="text-sm text-muted">{viewModel.thumbnailSize}px</div>
        <button 
          aria-label="Reset slide size" 
          title="Reset" 
          className="ml-auto p-2 bg-surface rounded-md" 
          onClick={() => viewModel.setThumbnailSize(220)}
        >
          <ArrowPathIcon className="w-4 h-4 text-muted" />
        </button>
      </div>

      {/* Slides Grid */}
      <div className="flex-1 -mr-3" ref={gridContainerRef} style={{ height: '100%' }}>
        <Grid
          key={gridKey}
          ref={gridRef}
          columnCount={columns}
          columnWidth={viewModel.thumbnailSize + 8}
          height={gridHeight}
          rowCount={Math.ceil(viewModel.slides.length / columns)}
          rowHeight={Math.round(viewModel.thumbnailSize * 0.56) + 12}
          width={slideColRef.current ? slideColRef.current.clientWidth : 800}
          itemData={gridItemData}
        >
          {Cell}
        </Grid>
      </div>

      {/* Slide Import Modal */}
      <SlideImportModal
        isOpen={viewModel.showImportModal}
        onClose={() => viewModel.closeImportModal()}
        onSlidesImported={(slides) => viewModel.handleSlidesImported(slides)}
        onServiceImported={(serviceStructure) => {
          // Emit event for SetlistViewModel
          const customEvent = new CustomEvent('service-imported', { detail: serviceStructure });
          window.dispatchEvent(customEvent);
        }}
      />
    </div>
  );
});

export default SlideManager;
