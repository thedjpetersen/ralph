import { forwardRef, useState, type ImgHTMLAttributes, type ReactNode } from 'react';
import './Avatar.css';

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
export type AvatarVariant = 'circle' | 'rounded' | 'square';

export interface AvatarProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  src?: string | null;
  alt?: string;
  name?: string;
  size?: AvatarSize;
  variant?: AvatarVariant;
  fallbackIcon?: ReactNode;
  className?: string;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '';
  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase();
  }
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

function getColorFromName(name: string): string {
  const colors = [
    'var(--avatar-color-1, #3b82f6)',
    'var(--avatar-color-2, #8b5cf6)',
    'var(--avatar-color-3, #ec4899)',
    'var(--avatar-color-4, #f59e0b)',
    'var(--avatar-color-5, #10b981)',
    'var(--avatar-color-6, #06b6d4)',
    'var(--avatar-color-7, #6366f1)',
    'var(--avatar-color-8, #ef4444)',
  ];

  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }

  return colors[Math.abs(hash) % colors.length];
}

export const Avatar = forwardRef<HTMLDivElement, AvatarProps>(
  (
    {
      src,
      alt,
      name = '',
      size = 'md',
      variant = 'circle',
      fallbackIcon,
      className = '',
      ...props
    },
    ref
  ) => {
    const [imageError, setImageError] = useState(false);
    const showImage = src && !imageError;
    const initials = getInitials(name);
    const backgroundColor = getColorFromName(name || 'default');

    const classes = [
      'avatar',
      `avatar-${size}`,
      `avatar-${variant}`,
      className,
    ]
      .filter(Boolean)
      .join(' ');

    const handleImageError = () => {
      setImageError(true);
    };

    const renderFallback = () => {
      if (fallbackIcon) {
        return <span className="avatar-icon">{fallbackIcon}</span>;
      }
      if (initials) {
        return <span className="avatar-initials">{initials}</span>;
      }
      return (
        <span className="avatar-icon avatar-default-icon">
          <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
          </svg>
        </span>
      );
    };

    return (
      <div
        ref={ref}
        className={classes}
        style={!showImage ? { backgroundColor } : undefined}
        role="img"
        aria-label={alt || name || 'Avatar'}
        {...(props as React.HTMLAttributes<HTMLDivElement>)}
      >
        {showImage ? (
          <img
            src={src}
            alt={alt || name || 'Avatar'}
            className="avatar-image"
            onError={handleImageError}
          />
        ) : (
          renderFallback()
        )}
      </div>
    );
  }
);

Avatar.displayName = 'Avatar';
