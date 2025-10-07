import React, { useState } from 'react';
import * as TauriEvent from '@tauri-apps/api/event';
import * as TauriCore from '@tauri-apps/api/core';


const SlideItem = ({ slide, index, isSelected, onSelect, onDragStart, onDragEnter, onDrop, onDragEnd, thumbnailSize, onVideoTranscoded }) => {
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
      // Check if the video is already transcoded (i.e., its path points to the cache)
      const isAlreadyTranscoded = slide.path.includes('/harmonysync/cache/') && slide.path.endsWith('_youtube.mp4');

      if (isAlreadyTranscoded) {
        console.log('Playing already transcoded video:', slide.path);
        TauriCore.invoke('display_video_slide', { path: slide.path, duration: slide.duration })
          .catch(e => console.error('Error displaying video slide:', e));
      } else {
        // Transcode video and then display it
      console.log('Transcoding video:', slide.path);
      TauriCore.invoke('transcode_video', { inputPath: slide.path })
        .then((transcodedPath) => {
          console.log('Transcoded video path:', transcodedPath);
          onVideoTranscoded(index, transcodedPath); // Update the parent state
          TauriCore.invoke('display_video_slide', { path: transcodedPath, duration: slide.duration })
            .catch(e => console.error('Error displaying video slide:', e));
        })
        .catch(e => console.error('Error transcoding video:', e));      }
    } else if (slide.type === 'youtube') {
      TauriEvent.emit('navigate', { videoId: slide.videoId });
    } else { // Lyrics slide
      console.log('Emitting display-lyric-slide with payload:', { text: slide.text, section: slide.section });
      TauriEvent.emit('display-lyric-slide', { text: slide.text, section: slide.section });

      // Emit event for Lower Thirds screen
      const line1 = slide.text && slide.text.length > 0 ? slide.text[0] : '';
      const line2 = slide.text && slide.text.length > 1 ? slide.text[1] : '';
      TauriEvent.emit('set-lower-thirds-text', { line1, line2 });
    }
  };

  let slideContent;
  if (slide.type === 'image') {
    slideContent = (
      <img src={TauriCore.convertFileSrc(slide.path)} alt={slide.name} className="slide-image" width={thumbnailSize} height={thumbnailSize} />
    );
  } else if (slide.type === 'video') {
    slideContent = (
      slide.thumbnail_path ? (
        <img src={TauriCore.convertFileSrc(slide.thumbnail_path)} alt={`Thumbnail for ${slide.name}`} className="slide-image" width={thumbnailSize} height={thumbnailSize} />
      ) : (
        <span className="slide-video-name">Video: {slide.name}</span>
      )
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