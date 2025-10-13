import React, { useRef, useEffect } from 'react';

const SlideItem = ({ slide, index, isSelected, onSelect, onDragStart, onDragEnter, onDrop, onDragEnd, thumbnailSize, onVideoTranscoded }) => {
  const elRef = useRef(null);

  useEffect(() => {
    if (isSelected && elRef.current) {
      elRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [isSelected]);

  return (
    <div
      ref={elRef}
      draggable
      data-slide-index={index}
      className={`slide-item p-1 rounded ${isSelected ? 'ring-2 ring-accent' : ''}`}
      onClick={() => onSelect(index)}
      onDragStart={(e) => onDragStart(e, index)}
      onDragEnter={(e) => onDragEnter(e, index)}
      onDrop={(e) => onDrop(e, index)}
      onDragEnd={onDragEnd}
      style={{ width: thumbnailSize, height: thumbnailSize }}
    >
      <img src={slide.thumbnail || slide.path} alt={slide.title || 'slide'} className="w-full h-full object-cover rounded" />
    </div>
  );
};

export default SlideItem;
