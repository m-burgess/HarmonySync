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
          variant="danger"
          onClick={handleRemove}
          className="setlist-item-remove"
          title="Remove from setlist"
        >
          ×
        </Button>
      </div>
      
      {/* Transition buttons for songs */}
      {item.type === 'song' && (
        <div className="setlist-item-transitions">
          <TransitionButton
            type="crossfade"
            onClick={() => handleTransition('crossfade')}
          />
          <TransitionButton
            type="cut"
            onClick={() => handleTransition('cut')}
          />
          <TransitionButton
            type="fadeout-fadein"
            onClick={() => handleTransition('fadeout-fadein')}
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