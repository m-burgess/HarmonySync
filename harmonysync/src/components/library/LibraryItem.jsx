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
          variant="primary"
          onClick={handleAdd}
          className="library-item-add-button"
          title={`Add ${item.name} to setlist`}
        >
          +
        </Button>
      )}
    </div>
  );
};

export default LibraryItem;