import React from 'react';
import { ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import Button from '../ui/Button.jsx';
import './LibraryItem.css';

const LibraryItem = ({
  item,
  onAdd,
  onSelect,
  onExport,
  isSelected = false,
  showAddButton = true,
  showExportButton = false,
  className = ''
}) => {
  const handleAdd = (e) => {
    e.stopPropagation();
    if (onAdd) {
      onAdd(item);
    }
  };

  const handleExport = (e) => {
    e.stopPropagation();
    if (onExport) {
      onExport(item);
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
      <div className="library-item-actions">
        {showExportButton && (
          <Button
            size="small"
            variant="secondary"
            onClick={handleExport}
            className="library-item-export-button"
            title={`Export ${item.name}`}
          >
            <ArrowDownTrayIcon style={{ width: '16px', height: '16px' }} />
          </Button>
        )}
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
    </div>
  );
};

export default LibraryItem;