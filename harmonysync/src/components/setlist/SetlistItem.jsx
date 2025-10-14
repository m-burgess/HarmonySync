import React from 'react';
import Button from '../ui/Button.jsx';
import TransitionButton from '../audio/TransitionButton.jsx';
import './SetlistItem.css';

const SetlistItem = ({
  item,
  index,
  isLoaded = false,
  onItemClick,
  onRemove,
  onTransition,
  onPreload,
  className = ''
}) => {
  const handleItemClick = () => {
    if (onItemClick) {
      onItemClick(item, index);
    }
  };

  const handleRemove = (e) => {
    e.stopPropagation();
    if (onRemove) {
      onRemove(index);
    }
  };

  const handleTransition = (transitionType) => {
    if (onTransition) {
      onTransition(item, index, transitionType);
    }
  };

  const handlePreload = () => {
    if (onPreload) {
      onPreload(item, index);
    }
  };

  const itemClass = [
    'setlist-item',
    isLoaded && 'setlist-item-loaded',
    className
  ].filter(Boolean).join(' ');

  return (
    <li className={itemClass}>
      <div className="setlist-item-header">
        <span 
          onClick={handleItemClick}
          className="setlist-item-name"
          title={item.name}
        >
          {item.name}
          {isLoaded && <span className="loaded-indicator">✓</span>}
        </span>
        <Button
          size="small"
          variant="ghost"
          onClick={handleRemove}
          className="setlist-item-remove"
          title="Remove from setlist"
        >
          {/* Heroicons solid Trash Icon (mini inline SVG) */}
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" width="14" height="14">
            <path fillRule="evenodd" d="M9 3.5A1.5 1.5 0 0 1 10.5 2h3A1.5 1.5 0 0 1 15 3.5V4h4a1 1 0 1 1 0 2h-.218l-.977 11.115A3 3 0 0 1 14.81 20H9.19a3 3 0 0 1-2.995-2.885L5.218 6H5a1 1 0 1 1 0-2h4v-.5zM8 8a1 1 0 1 0 0 2v6a1 1 0 1 0 2 0v-6a1 1 0 1 0-2 0zm6 0a1 1 0 1 0 0 2v6a1 1 0 1 0 2 0v-6a1 1 0 1 0-2 0z" clipRule="evenodd" />
          </svg>
        </Button>
      </div>
      
      {/* Only show crossfade and preload for songs */}
      {item.type === 'song' && (
        <div className="setlist-item-transitions">
          <TransitionButton
            type="crossfade"
            onClick={() => handleTransition('crossfade')}
          />
          <TransitionButton
            type="preload"
            onClick={handlePreload}
          />
        </div>
      )}
      
      {/* Standard load for presentations */}
      {item.type === 'presentation' && (
        <div className="setlist-item-transitions">
          <TransitionButton
            type="load"
            onClick={() => handleTransition('none')}
          />
        </div>
      )}
    </li>
  );
};

export default SetlistItem;