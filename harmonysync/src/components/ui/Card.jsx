import React from 'react';
import './Card.css';

const Card = React.forwardRef(({ 
  children, 
  className = '', 
  variant = 'default',
  padding = 'medium',
  hover = false,
  onClick,
  header,
  footer,
  ...props 
}, ref) => {
  const cardClass = [
    'card',
    `card-${variant}`,
    `card-${padding}`,
    hover && 'card-hover',
    onClick && 'card-clickable',
    className
  ].filter(Boolean).join(' ');

  const handleClick = (e) => {
    if (onClick) {
      onClick(e);
    }
  };

  return (
    <div ref={ref} className={cardClass} onClick={handleClick} {...props}>
      {header && <div className="card-header">{header}</div>}
      <div className="card-body">{children}</div>
      {footer && <div className="card-footer">{footer}</div>}
    </div>
  );
});

Card.displayName = 'Card';

export default Card;