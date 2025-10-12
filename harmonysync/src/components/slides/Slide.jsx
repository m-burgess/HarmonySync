import React, { useState } from 'react';
import { ArrowTopRightOnSquareIcon, PlayIcon, PhotoIcon, FilmIcon, GlobeAltIcon, DocumentTextIcon } from '@heroicons/react/24/solid';
import * as TauriEvent from '@tauri-apps/api/event';
import * as TauriCore from '@tauri-apps/api/core';
import { Card, Button } from '../ui';
import './Slide.css';

const Slide = ({
  slide,
  index,
  isSelected = false,
  onSelect,
  onDragStart,
  onDragEnter,
  onDrop,
  onDragEnd,
  onVideoTranscoded,
  size = 'medium',
  showActions = true,
  showTypeIcon = true,
  className = ''
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isHover, setIsHover] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleDragStart = (e) => {
    e.dataTransfer.setDragImage(new Image(), 0, 0); // Disable default drag image
    if (onDragStart) {
      onDragStart(e, index);
    }
  };

  const handleDragEnter = (e) => {
    e.preventDefault();
    setIsDragOver(true);
    if (onDragEnter) {
      onDragEnter(e, index);
    }
  };

  const handleDrop = (e) => {
    setIsDragOver(false);
    if (onDrop) {
      onDrop(e, index);
    }
  };

  const handleClick = async () => {
    if (onSelect) {
      onSelect(index);
    }

    // Emit events for different slide types
    try {
      if (slide.type === 'image') {
        console.log('Emitting display-image-slide with payload:', { path: slide.path, name: slide.name });
        await TauriEvent.emit('display-image-slide', { path: slide.path, name: slide.name });
      } else if (slide.type === 'video') {
        await handleVideoClick();
      } else if (slide.type === 'youtube') {
        await TauriEvent.emit('navigate', { videoId: slide.videoId });
      } else { // Lyrics slide
        console.log('Emitting display-lyric-slide with payload:', { text: slide.text, section: slide.section });
        await TauriEvent.emit('display-lyric-slide', { text: slide.text, section: slide.section });

        const line1 = slide.text && slide.text.length > 0 ? slide.text[0] : '';
        const line2 = slide.text && slide.text.length > 1 ? slide.text[1] : '';
        await TauriEvent.emit('set-lower-thirds-text', { line1, line2 });
      }
    } catch (error) {
      console.error('Error handling slide click:', error);
    }
  };

  const handleVideoClick = async () => {
    const isAlreadyTranscoded = slide.path.includes('/harmonysync/cache/') && slide.path.endsWith('_youtube.mp4');

    if (isAlreadyTranscoded) {
      console.log('Playing already transcoded video:', slide.path);
      await TauriCore.invoke('display_video_slide', { path: slide.path, duration: slide.duration });
    } else {
      console.log('Transcoding video:', slide.path);
      setIsLoading(true);
      try {
        const transcodedPath = await TauriCore.invoke('transcode_video', { inputPath: slide.path });
        console.log('Transcoded video path:', transcodedPath);
        if (onVideoTranscoded) {
          onVideoTranscoded(index, transcodedPath);
        }
        await TauriCore.invoke('display_video_slide', { path: transcodedPath, duration: slide.duration });
      } catch (error) {
        console.error('Error transcoding video:', error);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const getTypeIcon = () => {
    switch (slide.type) {
      case 'image':
        return <PhotoIcon className="slide-type-icon" />;
      case 'video':
        return <FilmIcon className="slide-type-icon" />;
      case 'youtube':
        return <GlobeAltIcon className="slide-type-icon" />;
      default:
        return <DocumentTextIcon className="slide-type-icon" />;
    }
  };

  const getDuration = () => {
    if (slide.type === 'video' && slide.duration) {
      const minutes = Math.floor(slide.duration / 60);
      const seconds = Math.floor(slide.duration % 60);
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
    return null;
  };

  const renderSlideContent = () => {
    switch (slide.type) {
      case 'image':
        return (
          <div className="slide-image-container">
            <img 
              src={TauriCore.convertFileSrc(slide.path)} 
              alt={slide.name} 
              className="slide-image"
              loading="lazy"
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'flex';
              }}
            />
            <div className="slide-image-fallback" style={{ display: 'none' }}>
              <PhotoIcon className="slide-fallback-icon" />
              <span>Image not found</span>
            </div>
          </div>
        );

      case 'video':
        return (
          <div className="slide-video-container">
            {slide.thumbnail_path ? (
              <img 
                src={TauriCore.convertFileSrc(slide.thumbnail_path)} 
                alt={`Thumbnail for ${slide.name}`} 
                className="slide-image"
                loading="lazy"
              />
            ) : (
              <div className="slide-video-fallback">
                <FilmIcon className="slide-fallback-icon" />
                <span>Video: {slide.name}</span>
              </div>
            )}
            {getDuration() && (
              <div className="slide-duration">{getDuration()}</div>
            )}
          </div>
        );

      case 'youtube':
        return (
          <div className="slide-youtube-container">
            <img 
              src={`https://img.youtube.com/vi/${slide.videoId}/0.jpg`} 
              alt={`YouTube thumbnail for ${slide.name}`} 
              className="slide-image"
              loading="lazy"
            />
            <div className="slide-youtube-badge">
              <GlobeAltIcon className="slide-youtube-icon" />
              YouTube
            </div>
          </div>
        );

      default: // Lyrics slide
        return (
          <div className="slide-lyrics-container">
            {slide.section && (
              <div className="slide-lyrics-section">[{slide.section}]</div>
            )}
            <div className="slide-lyrics-text">
              {slide.text && Array.isArray(slide.text) && slide.text.slice(0, 4).map((line, i) => (
                <p key={i} className="slide-lyrics-line">{line}</p>
              ))}
            </div>
          </div>
        );
    }
  };

  const slideClass = [
    'slide-component',
    `slide-${size}`,
    isSelected && 'slide-selected',
    isDragOver && 'slide-drag-over',
    isLoading && 'slide-loading',
    className
  ].filter(Boolean).join(' ');

  return (
    <Card
      className={slideClass}
      hover={true}
      onClick={handleClick}
      onMouseEnter={() => setIsHover(true)}
      onMouseLeave={() => setIsHover(false)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
      data-slide-index={index}
      data-slide-type={slide.type || 'lyric'}
      data-slide-path={slide.path}
      data-slide-name={slide.name}
      data-slide-video-id={slide.videoId}
      draggable
      onDragStart={handleDragStart}
      onDragOver={(e) => e.preventDefault()}
      onDragEnter={handleDragEnter}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleDrop}
      onDragEnd={onDragEnd}
      tabIndex={0}
      role="button"
    >
      {/* Type Icon */}
      {showTypeIcon && (
        <div className="slide-type-indicator">
          {getTypeIcon()}
        </div>
      )}

      {/* Main Content */}
      <div className="slide-content">
        {renderSlideContent()}
      </div>

      {/* Loading Overlay */}
      {isLoading && (
        <div className="slide-loading-overlay">
          <div className="slide-loading-spinner" />
          <span>Processing...</span>
        </div>
      )}

      {/* Hover Actions */}
      {showActions && isHover && !isLoading && (
        <div className="slide-actions-overlay">
          <div className="slide-actions">
            <Button
              size="small"
              variant="primary"
              onClick={(e) => {
                e.stopPropagation();
                handleClick();
              }}
              icon={<ArrowTopRightOnSquareIcon />}
              title="Open slide"
            />
            {slide.type === 'video' && (
              <Button
                size="small"
                variant="success"
                onClick={(e) => {
                  e.stopPropagation();
                  handleVideoClick();
                }}
                icon={<PlayIcon />}
                title="Play video"
              />
            )}
          </div>
        </div>
      )}

      {/* Selection Indicator */}
      {isSelected && <div className="slide-selection-indicator" />}
    </Card>
  );
};

export default Slide;