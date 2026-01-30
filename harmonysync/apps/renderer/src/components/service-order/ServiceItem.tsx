import React from 'react';
import Button from '../ui/Button.jsx';
import TransitionButton from '../audio/TransitionButton';
import { PencilIcon } from '@heroicons/react/24/outline';
import '../../styles/components/ServiceItem.css';

// Type definitions
interface ServiceItemData {
  id?: string;
  name: string;
  path: string;
  type: 'song' | 'presentation' | 'folder';
  tracks?: unknown[];
  lyrics?: string;
}

interface ServiceItemProps {
  item: ServiceItemData;
  index: number;
  isLoaded?: boolean;
  onItemClick?: (item: ServiceItemData, index: number) => void;
  onRemove?: (index: number) => void;
  onTransition?: (item: ServiceItemData, index: number, transitionType: string) => void;
  onPreload?: (item: ServiceItemData, index: number) => void;
  onEditLyrics?: (item: ServiceItemData, index: number) => void;
  className?: string;
}

const ServiceItem: React.FC<ServiceItemProps> = ({
  item,
  index,
  isLoaded = false,
  onItemClick,
  onRemove,
  onTransition,
  onPreload,
  onEditLyrics,
  className = ''
}) => {
  const handleItemClick = () => {
    if (onItemClick) onItemClick(item, index);
  };

  const handleRemove = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (onRemove) onRemove(index);
  };

  const handleTransition = (transitionType: string) => {
    if (onTransition) onTransition(item, index, transitionType);
  };

  const handlePreload = () => {
    if (onPreload) onPreload(item, index);
  };

  const handleEditLyrics = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (onEditLyrics) onEditLyrics(item, index);
  };

  const itemClass = ['service-item', isLoaded && 'service-item-loaded', className]
    .filter(Boolean)
    .join(' ');

  return (
    <li className={itemClass}>
      <div className="service-item-header">
        <span onClick={handleItemClick} className="service-item-name" title={item.name}>
          {item.name}
          {isLoaded && <span className="loaded-indicator">✓</span>}
        </span>

        <Button
          size="small"
          variant="ghost"
          onClick={handleRemove}
          className="service-item-remove"
          title="Remove from service order"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" width="14" height="14">
            <path
              fillRule="evenodd"
              d="M9 3.5A1.5 1.5 0 0 1 10.5 2h3A1.5 1.5 0 0 1 15 3.5V4h4a1 1 0 1 1 0 2h-.218l-.977 11.115A3 3 0 0 1 14.81 20H9.19a3 3 0 0 1-2.995-2.885L5.218 6H5a1 1 0 1 1 0-2h4v-.5zM8 8a1 1 0 1 0 0 2v6a1 1 0 1 0 2 0v-6a1 1 0 1 0-2 0zm6 0a1 1 0 1 0 0 2v6a1 1 0 1 0 2 0v-6a1 1 0 1 0-2 0z"
              clipRule="evenodd"
            />
          </svg>
        </Button>
      </div>

      {item.type === 'song' && (
        <div className="service-item-transitions">
          <TransitionButton type="crossfade" onClick={() => handleTransition('crossfade')} tooltip="Crossfade to song" />
          <TransitionButton type="preload" onClick={handlePreload} tooltip="Preload song" />
          {item.lyrics && (
            <Button
              size="small"
              variant="secondary"
              onClick={handleEditLyrics}
              title="Edit Lyrics"
              className="edit-lyrics-button"
            >
              <PencilIcon className="w-4 h-4" />
            </Button>
          )}
        </div>
      )}

      {item.type === 'presentation' && (
        <div className="service-item-transitions">
          <TransitionButton type="load" onClick={() => handleTransition('none')} tooltip="Load presentation" />
        </div>
      )}
    </li>
  );
};

export default ServiceItem;
