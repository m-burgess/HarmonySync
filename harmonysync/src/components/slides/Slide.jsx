import React, { useState } from 'react';
import { ArrowTopRightOnSquareIcon, PlayIcon, PhotoIcon, FilmIcon, GlobeAltIcon, DocumentTextIcon } from '@heroicons/react/24/solid';
import { event, core } from '../../electron-adapter';
import { Card, Button } from '../ui';
import '../../styles/components/Slide.css';

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
  thumbnailSize, // Direct size override
  showActions = true,
  showTypeIcon = true,
  className = ''
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isHover, setIsHover] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showEnlargedPreview, setShowEnlargedPreview] = useState(false);
  const [slidePosition, setSlidePosition] = useState({ x: 0, y: 0 });
  const hoverTimeoutRef = React.useRef(null);
  const slideRef = React.useRef(null);

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
    // Clear any pending hover timeout when clicking
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }

    if (onSelect && typeof onSelect === 'function') {
      onSelect(index);
    }

    // Emit events for different slide types
    try {
      if (slide.type === 'image') {
        console.log('Emitting display-image-slide with payload:', { path: slide.path, name: slide.name });
        await event.emit('display-image-slide', { path: slide.path, name: slide.name });
      } else if (slide.type === 'video') {
        await handleVideoClick();
      } else if (slide.type === 'youtube') {
        await event.emit('navigate', { videoId: slide.videoId });
      } else { // Lyrics slide
        console.log('Emitting display-lyric-slide with payload:', { text: slide.text, section: slide.section });
        await event.emit('display-lyric-slide', { text: slide.text, section: slide.section });

        const line1 = slide.text && slide.text.length > 0 ? slide.text[0] : '';
        const line2 = slide.text && slide.text.length > 1 ? slide.text[1] : '';
        await event.emit('set-lower-thirds-text', { line1, line2 });
      }
    } catch (error) {
      console.error('Error handling slide click:', error);
    }
  };

  const handleVideoClick = async () => {
    const isAlreadyTranscoded = slide.path.includes('/harmonysync/cache/') && slide.path.endsWith('_youtube.mp4');

    if (isAlreadyTranscoded) {
      console.log('Playing already transcoded video:', slide.path);
      await core.invoke('display_video_slide', { path: slide.path, duration: slide.duration });
    } else {
      console.log('Transcoding video:', slide.path);
      setIsLoading(true);
      try {
        const transcodedPath = await core.invoke('transcode_video', { inputPath: slide.path });
        console.log('Transcoded video path:', transcodedPath);
        if (onVideoTranscoded) {
          onVideoTranscoded(index, transcodedPath);
        }
        await core.invoke('display_video_slide', { path: transcodedPath, duration: slide.duration });
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

  const handleMouseEnter = () => {
    setIsHover(true);
    
    // Calculate slide position for popup placement
    if (slideRef.current) {
      const rect = slideRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const popupWidth = 800; // Max width from CSS
      const popupHeight = 600; // Max height from CSS
      
      let x = rect.left + rect.width / 2;
      let y = rect.top + rect.height / 2;
      
      // Adjust horizontal position if popup would go off-screen
      if (x + popupWidth / 2 > viewportWidth) {
        x = viewportWidth - popupWidth / 2 - 20;
      } else if (x - popupWidth / 2 < 0) {
        x = popupWidth / 2 + 20;
      }
      
      // Adjust vertical position if popup would go off-screen
      if (y + popupHeight / 2 > viewportHeight) {
        y = viewportHeight - popupHeight / 2 - 20;
      } else if (y - popupHeight / 2 < 0) {
        y = popupHeight / 2 + 20;
      }
      
      setSlidePosition({ x, y });
    }
    
    // Only show enlarged preview for image slides after 5 seconds
    if (slide.type === 'image' || (slide.type === 'video' && slide.thumbnail_path)) {
      hoverTimeoutRef.current = setTimeout(() => {
        setShowEnlargedPreview(true);
      }, 5000);
    }
  };

  const handleMouseLeave = () => {
    setIsHover(false);
    setShowEnlargedPreview(false);
    
    // Clear the timeout if user stops hovering before 5 seconds
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
  };

  // Cleanup timeout on unmount
  React.useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  const getPreviewImageSrc = () => {
    if (slide.type === 'image') {
      return core.convertFileSrc ? core.convertFileSrc(slide.path) : slide.path;
    } else if (slide.type === 'video' && slide.thumbnail_path) {
      return core.convertFileSrc ? core.convertFileSrc(slide.thumbnail_path) : slide.thumbnail_path;
    } else if (slide.type === 'youtube') {
      return `https://img.youtube.com/vi/${slide.videoId}/maxresdefault.jpg`;
    }
    return null;
  };

  const renderSlideContent = () => {
    switch (slide.type) {
      case 'image':
        return (
          <div className="slide-image-container">
            <img 
              src={core.convertFileSrc ? core.convertFileSrc(slide.path) : slide.path} 
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
                src={core.convertFileSrc ? core.convertFileSrc(slide.thumbnail_path) : slide.thumbnail_path} 
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
            <div className="slide-lyrics-text" style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'flex-start',
              gap: '0.25rem'
            }}>
              {slide.text && Array.isArray(slide.text) && slide.text.map((line, i) => (
                <p key={i} className="slide-lyrics-line" style={{ 
                  margin: 0,
                  fontSize: slide.text.length > 6 ? '0.7rem' : '0.8rem', // Smaller font for longer sections
                  lineHeight: 1.2
                }}>{line}</p>
              ))}
            </div>
          </div>
        );
    }
  };

  const slideClass = [
    'slide-component',
    thumbnailSize ? 'slide-custom' : `slide-${size}`,
    isSelected && 'slide-selected',
    isDragOver && 'slide-drag-over',
    isLoading && 'slide-loading',
    className
  ].filter(Boolean).join(' ');

  // Calculate custom dimensions when thumbnailSize is provided
  const customStyle = thumbnailSize ? {
    width: `${thumbnailSize}px`,
    height: `${Math.round(thumbnailSize * 0.56)}px`, // 16:9 aspect ratio
    '--slide-width': `${thumbnailSize}px`
  } : {};

  return (
    <Card
      ref={slideRef}
      className={slideClass}
      style={customStyle}
      hover={true}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
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

      {/* Enlarged Preview Overlay */}
      {showEnlargedPreview && getPreviewImageSrc() && (
        <div 
          className="slide-enlarged-preview-popup"
          style={{
            left: `${slidePosition.x}px`,
            top: `${slidePosition.y}px`,
            transform: 'translate(-50%, -50%)'
          }}
        >
          <div className="slide-enlarged-preview-container">
            <img 
              src={getPreviewImageSrc()} 
              alt={`Enlarged preview of ${slide.name}`}
              className="slide-enlarged-preview-image"
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
            <div className="slide-enlarged-preview-info">
              <h3 className="slide-enlarged-preview-title">{slide.name}</h3>
              {slide.type === 'video' && getDuration() && (
                <span className="slide-enlarged-preview-duration">{getDuration()}</span>
              )}
            </div>
            <div className="slide-enlarged-preview-hint">
              Move mouse away to close
            </div>
          </div>
        </div>
      )}
    </Card>
  );
};

export default Slide;