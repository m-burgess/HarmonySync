import React from 'react';
import Button from '../ui/Button.jsx';
import './LibraryItem.css';

const LibraryItem = ({
  item,
  onAdd,
  onSelect,
  isSelected = false,
  showAddButton = true,
  className = ''
}) => {
  const handleAdd = (e) => {
    e.stopPropagation();
    if (onAdd) {
      onAdd(item);
    }
  };

  const handleSelect = () => {
    if (onSelect) {
      onSelect(item);
    }
  };

  const itemClass = [
    'library-item',
    isSelected && 'library-item-selected',
    className
  ].filter(Boolean).join(' ');

  return (
    <div className={itemClass} onClick={handleSelect}>
      <div className="library-item-content">
        <span className="library-item-name" title={item.name}>
          {item.name}
        </span>
        {item.type && (
          <span className="library-item-type">{item.type}</span>
        )}
      </div>
      {showAddButton && (
        <Button
          size="small"
          variant="ghost"
          onClick={handleAdd}
          className="library-item-add-button"
          title={`Add ${item.name} to Service Order`}
          aria-label={`Add ${item.name} to Service Order`}
        >
          {/* Heroicons Plus Icon (inline SVG) */}
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="14" height="14" aria-hidden="true">
            <path d="M12 5a1 1 0 0 1 1 1v5h5a1 1 0 1 1 0 2h-5v5a1 1 0 1 1-2 0v-5H6a1 1 0 1 1 0-2h5V6a1 1 0 0 1 1-1z" />
          </svg>
        </Button>
      )}
    </div>
  );
};

export default LibraryItem;