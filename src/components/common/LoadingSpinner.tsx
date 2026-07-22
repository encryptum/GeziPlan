import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizePx = { sm: 24, md: 40, lg: 64 };

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ size = 'md', className = '' }) => {
  const px = sizePx[size];
  return (
    <div className={`loading-spinner loading-spinner--${size} ${className}`}>
      <svg width={px} height={px} viewBox="0 0 50 50" className="loading-spinner__svg">
        <circle
          cx="25"
          cy="25"
          r="20"
          fill="none"
          stroke="currentColor"
          strokeWidth="4"
          strokeLinecap="round"
          className="loading-spinner__circle"
        />
      </svg>
    </div>
  );
};

interface SkeletonCardProps {
  className?: string;
}

export const SkeletonCard: React.FC<SkeletonCardProps> = ({ className = '' }) => (
  <div className={`skeleton-card ${className}`}>
    <div className="skeleton-card__image skeleton-shimmer" />
    <div className="skeleton-card__body">
      <div className="skeleton-card__title skeleton-shimmer" />
      <div className="skeleton-card__text skeleton-shimmer" />
      <div className="skeleton-card__text skeleton-card__text--short skeleton-shimmer" />
    </div>
  </div>
);

interface SkeletonTextProps {
  lines?: number;
  className?: string;
}

export const SkeletonText: React.FC<SkeletonTextProps> = ({ lines = 3, className = '' }) => (
  <div className={`skeleton-text ${className}`}>
    {Array.from({ length: lines }).map((_, i) => (
      <div
        key={i}
        className="skeleton-text__line skeleton-shimmer"
        style={{ width: i === lines - 1 ? '60%' : '100%' }}
      />
    ))}
  </div>
);

export default LoadingSpinner;
