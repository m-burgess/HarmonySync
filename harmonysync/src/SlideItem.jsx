import React, { useState } from 'react';
import * as TauriEvent from '@tauri-apps/api/event';
import * as TauriCore from '@tauri-apps/api/core';
import { videoManager } from './video.js';

const SlideItem = ({ slide, index, isSelected, onSelect, onDragStart, onDragEnter, onDrop, onDragEnd, thumbnailSize }) => {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragStart = (e) => {
    e.dataTransfer.setDragImage(new Image(), 0, 0); // Disable default drag image
    onDragStart(e, index);
  };

  const handleDragEnter = (e) => {
    e.preventDefault();
    setIsDragOver(true);
    onDragEnter(e, index);
  };

  const handleDrop = (e) => {
    setIsDragOver(false);
    onDrop(e, index);
  };

  const handleClick = () => {
    onSelect(index);

    // Emit the original event for the audience screen
    if (slide.type === 'image') {
      console.log('Emitting display-image-slide with payload:', { path: slide.path, name: slide.name });
      TauriEvent.emit('display-image-slide', { path: slide.path, name: slide.name });
    } else if (slide.type === 'video') {
      videoManager.playVideo(slide.path, slide.duration);
    } else if (slide.type === 'youtube') {
      TauriEvent.emit('navigate', { videoId: slide.videoId });
    } else { // Lyrics slide
      console.log('Emitting display-lyric-slide with payload:', { text: slide.text, section: slide.section });
      TauriEvent.emit('display-lyric-slide', { text: slide.text, section: slide.section });
    }
  };

  let slideContent;
  if (slide.type === 'image') {
    slideContent = (
      <img src={TauriCore.convertFileSrc(slide.path)} alt={slide.name} className="slide-image" width={thumbnailSize} height={thumbnailSize} />
    );
  } else if (slide.type === 'video') {
    slideContent = (
      <span className="slide-video-name">Video: {slide.name}</span>
    );
  } else if (slide.type === 'youtube') {
    slideContent = (
      <>
        <img src={`https://img.youtube.com/vi/${slide.videoId}/0.jpg`} alt={`Youtube thumbnail for ${slide.name}`} className="slide-image" width={thumbnailSize} height={thumbnailSize} />
        <span className="slide-youtube-name">Youtube: {slide.name}</span>
      </>
    );
  } else { // Lyrics slide
    slideContent = (
      <>
        <span className="slide-section-label">[{slide.section}]</span>
        {slide.text && Array.isArray(slide.text) && slide.text.map((line, i) => (
          <p key={i}>{line}</p>
        ))}
      </>
    );
  }

  return (
    <div
      className={`slide ${isSelected ? 'selected' : ''} ${isDragOver ? 'drag-over' : ''}`}
      data-slide-index={index}
      data-original-index={index}
      data-slide-type={slide.type || 'lyric'}
      data-slide-path={slide.path} // Only for image/video
      data-slide-name={slide.name} // Only for image/video
      data-slide-video-id={slide.videoId} // Only for youtube
      draggable
      onDragStart={handleDragStart}
      onDragOver={(e) => e.preventDefault()} // Necessary to allow drop
      onDragEnter={handleDragEnter}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleDrop}
      onDragEnd={onDragEnd}
      onClick={handleClick}
    >
      {slideContent}
    </div>
  );
};

export default SlideItem;