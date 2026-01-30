import React from 'react';
import '../../styles/components/Card.css';

interface CardProps {
  children?: React.ReactNode;
  className?: string;
  variant?: 'default' | 'elevated' | 'outlined';
  padding?: 'small' | 'medium' | 'large';
  hover?: boolean;
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
  header?: React.ReactNode;
  footer?: React.ReactNode;
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(({
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

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
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