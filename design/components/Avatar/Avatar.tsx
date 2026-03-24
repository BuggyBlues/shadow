import React from 'react';

export interface AvatarProps {
  src?: string;
  alt?: string;
  name?: string;
  color?: 'cyan' | 'pink' | 'green' | 'yellow' | 'purple';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const colorStyles = {
  cyan: 'bg-[#00D4FF]',
  pink: 'bg-[#FF6B9D]',
  green: 'bg-[#4ADE80]',
  yellow: 'bg-[#FCD34D] text-[#0B0B0F]',
  purple: 'bg-[#A78BFA]',
};

const sizeStyles = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-9 h-9 text-sm',
  lg: 'w-12 h-12 text-base',
};

export const Avatar: React.FC<AvatarProps> = ({
  src,
  alt,
  name,
  color = 'cyan',
  size = 'md',
  className = '',
}) => {
  const baseStyles = 'rounded-full flex items-center justify-center font-bold text-white border-2 border-[var(--bg-base)] overflow-hidden';
  
  if (src) {
    return (
      <img
        src={src}
        alt={alt || name}
        className={`${baseStyles} ${sizeStyles[size]} object-cover ${className}`}
      />
    );
  }
  
  const initial = name?.charAt(0).toUpperCase() || '?';
  
  return (
    <div className={`${baseStyles} ${colorStyles[color]} ${sizeStyles[size]} ${className}`}>
      {initial}
    </div>
  );
};

export interface AvatarGroupProps {
  children: React.ReactNode;
  className?: string;
}

export const AvatarGroup: React.FC<AvatarGroupProps> = ({ children, className = '' }) => {
  return (
    <div className={`flex ${className}`}>
      {React.Children.map(children, (child, index) => (
        <div className={index > 0 ? '-ml-2' : ''}>
          {child}
        </div>
      ))}
    </div>
  );
};
