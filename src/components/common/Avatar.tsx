import React from 'react';

interface AvatarProps {
  src?: string;
  name: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  online?: boolean;
  className?: string;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w.charAt(0))
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function getColorFromName(name: string): string {
  const colors = [
    '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e',
    '#f97316', '#eab308', '#22c55e', '#14b8a6',
    '#06b6d4', '#3b82f6',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

const Avatar: React.FC<AvatarProps> = ({
  src,
  name,
  size = 'md',
  online,
  className = '',
}) => {
  const initials = getInitials(name);
  const bgColor = getColorFromName(name);

  return (
    <div className={`avatar avatar--${size} ${className}`}>
      {src ? (
        <img src={src} alt={name} className="avatar__image" />
      ) : (
        <div className="avatar__initials" style={{ backgroundColor: bgColor }}>
          {initials}
        </div>
      )}
      {online && <span className="avatar__online-dot" />}
    </div>
  );
};

export default Avatar;
