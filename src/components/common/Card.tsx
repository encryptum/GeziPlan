import React from 'react';

interface CardProps {
  variant?: 'default' | 'glass' | 'image';
  hoverable?: boolean;
  onClick?: () => void;
  className?: string;
  children: React.ReactNode;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  coverImage?: string;
  coverAlt?: string;
}

const Card: React.FC<CardProps> = ({
  variant = 'default',
  hoverable = false,
  onClick,
  className = '',
  children,
  padding = 'md',
  coverImage,
  coverAlt = '',
}) => {
  const classNames = [
    'card',
    `card--${variant}`,
    `card--padding-${padding}`,
    hoverable ? 'card--hoverable' : '',
    onClick ? 'card--clickable' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={classNames} onClick={onClick} role={onClick ? 'button' : undefined} tabIndex={onClick ? 0 : undefined}>
      {variant === 'image' && coverImage && (
        <div className="card__cover">
          <img src={coverImage} alt={coverAlt} className="card__cover-image" />
        </div>
      )}
      <div className="card__body">{children}</div>
    </div>
  );
};

export default Card;
