import './Skeleton.css';

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
  className?: string;
  style?: React.CSSProperties;
}

export function Skeleton({
  width,
  height,
  borderRadius,
  className = '',
  style,
}: SkeletonProps) {
  return (
    <div
      className={`skeleton ${className}`}
      style={{
        width,
        height,
        borderRadius,
        ...style,
      }}
    />
  );
}

interface SkeletonTextProps {
  lines?: number;
  className?: string;
}

export function SkeletonText({ lines = 1, className = '' }: SkeletonTextProps) {
  return (
    <div className={`skeleton-text ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          height="1rem"
          width={i === lines - 1 && lines > 1 ? '70%' : '100%'}
        />
      ))}
    </div>
  );
}

export function SkeletonButton({
  width = '100px',
  className = '',
}: {
  width?: string | number;
  className?: string;
}) {
  return (
    <Skeleton
      width={width}
      height="2.5rem"
      borderRadius="6px"
      className={className}
    />
  );
}

export function SkeletonInput({ className = '' }: { className?: string }) {
  return (
    <Skeleton
      width="100%"
      height="2.75rem"
      borderRadius="6px"
      className={className}
    />
  );
}

export function SkeletonAvatar({
  size = 80,
  className = '',
}: {
  size?: number;
  className?: string;
}) {
  return (
    <Skeleton
      width={size}
      height={size}
      borderRadius="50%"
      className={className}
    />
  );
}
