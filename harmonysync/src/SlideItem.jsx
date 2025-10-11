import React, { useState } from 'react';
import { ArrowTopRightOnSquareIcon, PlayIcon } from '@heroicons/react/24/solid';
import * as TauriEvent from '@tauri-apps/api/event';
import * as TauriCore from '@tauri-apps/api/core';


const SlideItem = ({ slide, index, isSelected, onSelect, onDragStart, onDragEnter, onDrop, onDragEnd, thumbnailSize, onVideoTranscoded }) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isHover, setIsHover] = useState(false);

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
      const isAlreadyTranscoded = slide.path.includes('/harmonysync/cache/') && slide.path.endsWith('_youtube.mp4');

      if (isAlreadyTranscoded) {
        console.log('Playing already transcoded video:', slide.path);
        TauriCore.invoke('display_video_slide', { path: slide.path, duration: slide.duration })
          .catch(e => console.error('Error displaying video slide:', e));
      } else {
        console.log('Transcoding video:', slide.path);
        TauriCore.invoke('transcode_video', { inputPath: slide.path })
          .then((transcodedPath) => {
            console.log('Transcoded video path:', transcodedPath);
            onVideoTranscoded(index, transcodedPath); // Update the parent state
            TauriCore.invoke('display_video_slide', { path: transcodedPath, duration: slide.duration })
              .catch(e => console.error('Error displaying video slide:', e));
          })
          .catch(e => console.error('Error transcoding video:', e));
      }
    } else if (slide.type === 'youtube') {
      TauriEvent.emit('navigate', { videoId: slide.videoId });
    } else { // Lyrics slide
      console.log('Emitting display-lyric-slide with payload:', { text: slide.text, section: slide.section });
      TauriEvent.emit('display-lyric-slide', { text: slide.text, section: slide.section });

      const line1 = slide.text && slide.text.length > 0 ? slide.text[0] : '';
      const line2 = slide.text && slide.text.length > 1 ? slide.text[1] : '';
      TauriEvent.emit('set-lower-thirds-text', { line1, line2 });
    }
  };

  let slideContent;
  if (slide.type === 'image') {
    slideContent = (
      <img src={TauriCore.convertFileSrc(slide.path)} alt={slide.name} className="object-cover w-full h-40" loading="lazy" />
    );
  } else if (slide.type === 'video') {
    slideContent = (
      slide.thumbnail_path ? (
        <img src={TauriCore.convertFileSrc(slide.thumbnail_path)} alt={`Thumbnail for ${slide.name}`} className="object-cover w-full h-40" loading="lazy" />
      ) : (
        <div className="p-2 text-sm text-muted">Video: {slide.name}</div>
      )
    );
  } else if (slide.type === 'youtube') {
    slideContent = (
      <>
        <img src={`https://img.youtube.com/vi/${slide.videoId}/0.jpg`} alt={`Youtube thumbnail for ${slide.name}`} className="object-cover w-full h-40" loading="lazy" />
        <div className="p-2 text-sm text-muted">Youtube: {slide.name}</div>
      </>
    );
  } else { // Lyrics slide
    slideContent = (
      <div className="p-2 text-sm text-primary">
        <div className="text-xs text-muted">[{slide.section}]</div>
        {slide.text && Array.isArray(slide.text) && slide.text.slice(0, 4).map((line, i) => (
          <p key={i} className="truncate">{line}</p>
        ))}
      </div>
    );
  }

  return (
    <div
      role="button"
      tabIndex={0}
      className={`relative rounded-md overflow-hidden shadow-subtle bg-card ${isSelected ? 'ring-2 ring-accent' : 'hover:shadow-lg'} ${isDragOver ? 'opacity-70' : ''}`}
      data-slide-index={index}
      data-original-index={index}
      data-slide-type={slide.type || 'lyric'}
      data-slide-path={slide.path}
      data-slide-name={slide.name}
      data-slide-video-id={slide.videoId}
      draggable
      onDragStart={handleDragStart}
      onDragOver={(e) => e.preventDefault()}
      onDragEnter={(e) => { setIsDragOver(true); handleDragEnter(e); }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={(e) => { setIsDragOver(false); handleDrop(e); }}
      onDragEnd={onDragEnd}
      onClick={handleClick}
      onMouseEnter={() => setIsHover(true)}
      onMouseLeave={() => setIsHover(false)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleClick(); } }}
    >
      {slideContent}

      {/* Hover overlay with quick actions */}
      {isHover && (
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center gap-2">
            <button aria-label="Open slide" title="Open" className="p-2 bg-accent rounded-md" onClick={(e) => { e.stopPropagation(); handleClick(); }}>
            <ArrowTopRightOnSquareIcon className="w-5 h-5 text-black" />
          </button>
          {slide.type === 'video' && (
              <button aria-label="Play video" title="Play" className="p-2 bg-surface rounded-md" onClick={(e) => { e.stopPropagation(); TauriCore.invoke('transcode_video', { inputPath: slide.path }).then(p => { onVideoTranscoded(index, p); TauriCore.invoke('display_video_slide', { path: p, duration: slide.duration }); }).catch(console.error); }}>
              <PlayIcon className="w-5 h-5 text-primary" />
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default SlideItem;