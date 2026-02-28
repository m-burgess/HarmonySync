/**
 * SlideManager - MVVM Refactored View Component
 * 
 * This component is refactored to use MVVM architecture:
 * - All business logic moved to SlideViewModel
 * - Component wrapped with observer() to react to ViewModel changes
 * - No useState for business state (only UI state for grid rendering)
 * - Pure presentation logic only (~140 lines vs original 269 lines)
 */
import React, { useEffect, useRef } from 'react';
import { observer } from 'mobx-react-lite';
import { runInAction } from 'mobx';
import { getViewModel } from '../../viewmodels';
import { ArrowPathIcon, ArrowUpTrayIcon } from '@heroicons/react/24/solid';
import { VSCodeInput, VSCodePanel } from '../VSCodeUI.tsx';
import Button from '../ui/Button.tsx';
import SlideItem from './SlideItem';
import SlideImportModal from './SlideImportModal';
import { event } from '../../electron-adapter';
import type { SlideData } from './types';

interface SlideManagerProps {
  allSlides: SlideData[];
  setAllSlides: (slides: SlideData[]) => void;
  selectedSlide: number | SlideData | null;
  setSelectedSlide: (slide: number | SlideData | null) => void;
}

const SlideManager: React.FC<SlideManagerProps> = observer(({ allSlides, setAllSlides, selectedSlide, setSelectedSlide }) => {
  const viewModel = getViewModel('slideViewModel');
  
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);
  const slideColRef = useRef<HTMLDivElement>(null);
  const slidesWrapRef = useRef<HTMLDivElement>(null);

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

  // Ensure selected slide stays in view
  useEffect(() => {
    if (!slidesWrapRef.current || !viewModel.selectedSlide) return;
    const index = viewModel.selectedSlideIndex;
    if (index === -1) return;
    const el = slidesWrapRef.current.querySelector(`[data-slide-index="${index}"]`);
    if (el instanceof HTMLElement) {
      el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }
  }, [viewModel.selectedSlide, viewModel.selectedSlideIndex]);

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

  return (
    <div className="h-full flex flex-col" id="slide-col" ref={slideColRef} onDragOver={handleDragOver}>
      <VSCodePanel title="Slides" className="pl-3 pt-3 pb-3 h-full flex flex-col">
      {/* Screen Controls */}
      <div className="flex items-center justify-between mb-3 pr-3">
        <div className="flex items-center gap-2">
          <Button
            onClick={() => viewModel.openImportModal()}
            title="Import Slides"
            size="small"
            variant="secondary"
            icon={<ArrowUpTrayIcon className="w-4 h-4" />}
          />
        </div>
      </div>
      
      {/* Thumbnail Size Control */}
      <div className="flex items-center gap-4 mb-3 pr-3">
        <label htmlFor="thumbnail-size-slider" className="text-sm text-muted">Slide Size</label>
        <VSCodeInput
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
        <Button
          aria-label="Reset slide size"
          title="Reset"
          className="ml-auto"
          size="small"
          variant="ghost"
          icon={<ArrowPathIcon className="w-4 h-4" />}
          onClick={() => viewModel.setThumbnailSize(220)}
        />
      </div>

      {/* Slides Grid */}
      <div
        className="slides-wrap"
        ref={slidesWrapRef}
        style={{
          '--slide-size': `${viewModel.thumbnailSize}px`
        } as React.CSSProperties}
      >
        {viewModel.slides.map((slide, index) => (
          <div className="slides-wrap-item" key={slide.id || `${slide.name}-${index}`}>
            <SlideItem
              slide={slide}
              index={index}
              isSelected={slide === viewModel.selectedSlide}
              onSelect={handleSlideClick}
              onDragStart={handleDragStart}
              onDragEnter={handleDragEnter}
              onDrop={handleDrop}
              onDragEnd={handleDragEnd}
              thumbnailSize={viewModel.thumbnailSize}
              onVideoTranscoded={viewModel.handleVideoTranscoded.bind(viewModel)}
            />
          </div>
        ))}
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
      </VSCodePanel>
    </div>
  );
});

export default SlideManager;
